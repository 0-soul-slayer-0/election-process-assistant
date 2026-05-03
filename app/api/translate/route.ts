import { NextRequest, NextResponse } from 'next/server';
import { translateText, batchTranslateText } from '@/lib/google-translate';
import type { SupportedLanguage } from '@/types/user.types';
import { SUPPORTED_LANGUAGES } from '@/config/supported-languages.config';

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.gcpCode));

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      text?: string;
      texts?: string[];
      targetLanguage: SupportedLanguage;
      sourceLanguage?: SupportedLanguage;
    };

    const { text, texts, targetLanguage, sourceLanguage } = body;

    if (!targetLanguage || !SUPPORTED_CODES.has(targetLanguage)) {
      return NextResponse.json(
        { error: `Unsupported target language: ${targetLanguage}` },
        { status: 400 }
      );
    }

    // Batch translation
    if (texts && Array.isArray(texts)) {
      if (texts.length === 0) {
        return NextResponse.json({ translations: [] });
      }
      const translations = await batchTranslateText(texts, targetLanguage);
      return NextResponse.json({ translations });
    }

    // Single translation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Either text or texts[] is required' },
        { status: 400 }
      );
    }

    const result = await translateText(text, targetLanguage, sourceLanguage);
    return NextResponse.json({ translatedText: result.translatedText });
  } catch (error) {
    console.error('[/api/translate] Error:', error);
    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 }
    );
  }
}
