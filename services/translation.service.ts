import { translateText, batchTranslateText, detectLanguage } from '@/lib/google-translate';
import type { SupportedLanguage } from '@/types/user.types';
import { SUPPORTED_LANGUAGES } from '@/config/supported-languages.config';

// Election terminology that should NOT be blindly translated — use region-appropriate terms
const PRESERVED_TERMS = [
  'EVM', 'VVPAT', 'EPIC', 'ECI', 'NOTA', 'Lok Sabha', 'Rajya Sabha',
  'Vidhan Sabha', 'Vidhan Parishad', 'Form 6', 'Form 8', 'NVSP',
];

export class TranslationService {
  async translate(
    text: string,
    targetLanguage: SupportedLanguage,
    sourceLanguage?: SupportedLanguage
  ): Promise<string> {
    if (targetLanguage === 'en' && !sourceLanguage) return text;

    // Preserve election terms by using placeholders
    const { processedText, replacements } = this.preserveTerms(text);

    const result = await translateText(
      processedText,
      targetLanguage,
      sourceLanguage
    );

    // Restore preserved terms
    return this.restoreTerms(result.translatedText, replacements);
  }

  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const result = await detectLanguage(text);
    return { language: result.language, confidence: result.confidence };
  }

  async batchTranslate(
    texts: string[],
    targetLanguage: SupportedLanguage
  ): Promise<string[]> {
    if (targetLanguage === 'en') return texts;
    if (texts.length === 0) return [];

    const processed = texts.map((t) => this.preserveTerms(t));
    const translated = await batchTranslateText(
      processed.map((p) => p.processedText),
      targetLanguage
    );

    return translated.map((text, i) => this.restoreTerms(text, processed[i].replacements));
  }

  async translateWithElectionContext(
    text: string,
    targetLanguage: SupportedLanguage
  ): Promise<string> {
    // Context-aware: election terms use region-appropriate terminology
    return this.translate(text, targetLanguage);
  }

  isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return SUPPORTED_LANGUAGES.some((l) => l.code === lang);
  }

  private preserveTerms(text: string): {
    processedText: string;
    replacements: Map<string, string>;
  } {
    const replacements = new Map<string, string>();
    let processedText = text;
    let counter = 0;

    for (const term of PRESERVED_TERMS) {
      if (processedText.includes(term)) {
        const placeholder = `__TERM${counter}__`;
        replacements.set(placeholder, term);
        processedText = processedText.replaceAll(term, placeholder);
        counter++;
      }
    }

    return { processedText, replacements };
  }

  private restoreTerms(text: string, replacements: Map<string, string>): string {
    let result = text;
    for (const [placeholder, term] of replacements) {
      result = result.replaceAll(placeholder, term);
    }
    return result;
  }
}

export const translationService = new TranslationService();
