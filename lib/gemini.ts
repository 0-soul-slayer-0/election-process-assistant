import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
  type GenerationConfig,
} from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const JSON_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.4,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
  responseMimeType: 'application/json',
};

const TEXT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 1024,
};

// gemini-1.5-flash-8b is the most available free-tier model in v1beta
const MODEL_ID = 'gemini-2.5-flash';
const REQUEST_OPTIONS = { apiVersion: 'v1beta' as const };

export function getGeminiJsonModel(): GenerativeModel {
  return getGeminiClient().getGenerativeModel(
    { model: MODEL_ID, safetySettings: SAFETY_SETTINGS, generationConfig: JSON_GENERATION_CONFIG },
    REQUEST_OPTIONS
  );
}

export function getGeminiTextModel(): GenerativeModel {
  return getGeminiClient().getGenerativeModel(
    { model: MODEL_ID, safetySettings: SAFETY_SETTINGS, generationConfig: TEXT_GENERATION_CONFIG },
    REQUEST_OPTIONS
  );
}

export function getGeminiStreamingModel(): GenerativeModel {
  return getGeminiClient().getGenerativeModel(
    { model: MODEL_ID, safetySettings: SAFETY_SETTINGS, generationConfig: TEXT_GENERATION_CONFIG },
    REQUEST_OPTIONS
  );
}
