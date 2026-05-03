import type { SupportedLanguage } from '@/types/user.types';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;          // English name
  nativeName: string;    // Name in that language
  flag: string;          // Emoji flag
  rtl: boolean;
  gcpCode: string;       // Google Cloud Translation language code
  geminiLocale: string;  // Used in prompts
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false,
    gcpCode: 'en',
    geminiLocale: 'English',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'hi',
    geminiLocale: 'Hindi',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'ta',
    geminiLocale: 'Tamil',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'te',
    geminiLocale: 'Telugu',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'bn',
    geminiLocale: 'Bengali',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'mr',
    geminiLocale: 'Marathi',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'kn',
    geminiLocale: 'Kannada',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'gu',
    geminiLocale: 'Gujarati',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    rtl: false,
    gcpCode: 'ml',
    geminiLocale: 'Malayalam',
  },
];

export const LANGUAGE_BY_CODE = new Map<SupportedLanguage, LanguageConfig>(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l])
);

export function getLanguageConfig(code: SupportedLanguage): LanguageConfig {
  return LANGUAGE_BY_CODE.get(code) ?? SUPPORTED_LANGUAGES[0];
}
