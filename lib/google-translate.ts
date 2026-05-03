/**
 * Google Cloud Translation API v2 client
 * Uses REST API directly for compatibility in edge/server environments.
 */

const TRANSLATE_API_BASE = 'https://translation.googleapis.com/language/translate/v2';
const DETECT_API_BASE = 'https://translation.googleapis.com/language/translate/v2/detect';

function getApiKey(): string {
  const key =
    process.env.GOOGLE_TRANSLATE_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
  return key;
}

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export interface DetectResponse {
  language: string;
  confidence: number;
  isReliable: boolean;
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslateResponse> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    key: apiKey,
    q: text,
    target: targetLanguage,
    format: 'text',
    ...(sourceLanguage ? { source: sourceLanguage } : {}),
  });

  const response = await fetch(`${TRANSLATE_API_BASE}?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Translation API error: ${response.status} — ${error}`);
  }

  const data = (await response.json()) as {
    data: { translations: Array<{ translatedText: string; detectedSourceLanguage?: string }> };
  };

  const translation = data.data.translations[0];
  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage: translation.detectedSourceLanguage,
  };
}

export async function batchTranslateText(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (texts.length === 0) return [];
  
  const apiKey = getApiKey();
  const params = new URLSearchParams({ key: apiKey, target: targetLanguage, format: 'text' });
  texts.forEach((t) => params.append('q', t));

  const response = await fetch(`${TRANSLATE_API_BASE}?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Batch translation error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data: { translations: Array<{ translatedText: string }> };
  };

  return data.data.translations.map((t) => t.translatedText);
}

export async function detectLanguage(text: string): Promise<DetectResponse> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({ key: apiKey, q: text });

  const response = await fetch(`${DETECT_API_BASE}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Language detection error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data: { detections: Array<Array<{ language: string; confidence: number; isReliable: boolean }>> };
  };

  const detection = data.data.detections[0][0];
  return {
    language: detection.language,
    confidence: detection.confidence,
    isReliable: detection.isReliable,
  };
}
