import { getGeminiJsonModel, getGeminiStreamingModel } from '@/lib/gemini';
import { classifyScenario } from '@/config/scenarios.config';
import { getLanguageConfig } from '@/config/supported-languages.config';
import type { UserProfile, JourneyStage, SupportedLanguage, AccessibilityMode } from '@/types/user.types';
import type { AIResponse, ChatMessage, GeminiMessage, ScenarioType } from '@/types/ai.types';

const SYSTEM_PROMPT_BASE = `You are VoteSmart, an intelligent, compassionate election companion for Indian citizens. 
You are NOT a general chatbot. You are a guided election assistant.

ABSOLUTE RULES:
1. Only provide factual, neutral, officially verifiable information about election processes in India.
2. NEVER mention political parties, candidates, or express any political opinion whatsoever.
3. If unsure about any fact, say: "Please verify with the official Election Commission website: eci.gov.in"
4. Always include the ECI Helpline 1950 when discussing issues.
5. Respond ONLY in the specified language.
6. Always return valid JSON matching the exact schema provided.
7. followUpChips must ALWAYS be exactly 3 items — never more, never less.
8. Be warm, patient, and encouraging — like a helpful friend guiding someone through voting.`;

function buildSystemPrompt(
  profile: Partial<UserProfile>,
  language: SupportedLanguage,
  accessibilityMode: AccessibilityMode,
  currentStage: JourneyStage,
  scenarioType: ScenarioType
): string {
  const langConfig = getLanguageConfig(language);
  const seniorInstructions =
    accessibilityMode === 'senior'
      ? 'User is a SENIOR CITIZEN. Use extremely simple language. Short sentences. One idea at a time. Be extra patient and supportive.'
      : '';
  const simplifiedInstructions =
    accessibilityMode === 'simplified'
      ? 'Use extremely simple language. No words longer than 2 syllables. Short sentences only. Explain like the user is 10 years old.'
      : '';

  return `${SYSTEM_PROMPT_BASE}

USER CONTEXT:
- Name: ${profile.name ?? 'Citizen'}
- Language: ${langConfig.geminiLocale} (respond ONLY in ${langConfig.geminiLocale})
- Region: ${profile.region ?? 'India'}
- Voter Type: ${profile.voterType ?? 'unknown'}
- Age Group: ${profile.ageGroup ?? 'adult'}
- Current Journey Stage: ${currentStage.toUpperCase()} (Stage ${['register','prepare','locate','vote'].indexOf(currentStage)+1} of 4)
- Scenario detected: ${scenarioType}
- Readiness Score: ${profile.readinessScore ?? 0}%

${seniorInstructions}
${simplifiedInstructions}

RESPONSE JSON SCHEMA (return EXACTLY this structure, nothing else):
{
  "stage": "${currentStage}",
  "message": "Main response in ${langConfig.geminiLocale}",
  "steps": [{"number": 1, "text": "Step text", "detail": "Optional detail", "whatIf": "Optional what-if scenario"}],
  "timeline": [{"date": "YYYY-MM-DD", "event": "Event description", "urgent": false}],
  "checklist": [{"id": "item_id", "label": "Checklist item", "completed": false, "category": "registration"}],
  "followUpChips": ["Chip 1", "Chip 2", "Chip 3"],
  "pollingStationSuggestion": false,
  "calendarPrompt": false,
  "readinessScoreDelta": 5,
  "safetyNote": "Optional disclaimer",
  "documentList": [{"name": "Doc name", "description": "Description", "validity": "Valid for voting", "howToGet": "How to obtain"}]
}

- steps, timeline, checklist, documentList, safetyNote are OPTIONAL (omit if not relevant)
- followUpChips must ALWAYS have exactly 3 strings in ${langConfig.geminiLocale}
- All text fields must be in ${langConfig.geminiLocale}
- readinessScoreDelta: how much this interaction advances the user's readiness (0-15)`;
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: GeminiMessage[],
  profile: Partial<UserProfile>,
  currentStage: JourneyStage,
  language: SupportedLanguage,
  accessibilityMode: AccessibilityMode
): Promise<AIResponse> {
  const scenarioType = classifyScenario(userMessage);
  const systemPrompt = buildSystemPrompt(
    profile,
    language,
    accessibilityMode,
    currentStage,
    scenarioType
  );

  const model = getGeminiJsonModel();

  // Build chat history with system context as first user message
  const fullHistory: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            stage: currentStage,
            message: 'Understood. I am VoteSmart, your election companion. How can I help you today?',
            followUpChips: ['How do I register to vote?', 'Where is my polling station?', 'What ID do I need?'],
            pollingStationSuggestion: false,
            calendarPrompt: false,
            readinessScoreDelta: 0,
          }),
        },
      ],
    },
    ...conversationHistory.slice(-10), // Last 10 turns for context
  ];

  const chat = model.startChat({ history: fullHistory });
  const result = await chat.sendMessage(userMessage);
  const text = result.response.text();

  // Parse and validate response
  const parsed = parseAIResponse(text, currentStage);
  return parsed;
}

export async function* generateAIResponseStream(
  userMessage: string,
  conversationHistory: GeminiMessage[],
  profile: Partial<UserProfile>,
  currentStage: JourneyStage,
  language: SupportedLanguage,
  accessibilityMode: AccessibilityMode
): AsyncGenerator<string> {
  const scenarioType = classifyScenario(userMessage);
  const systemPrompt = buildSystemPrompt(
    profile,
    language,
    accessibilityMode,
    currentStage,
    scenarioType
  );

  const model = getGeminiStreamingModel();

  const fullHistory: GeminiMessage[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    {
      role: 'model',
      parts: [{ text: 'Understood. I am VoteSmart, ready to assist.' }],
    },
    ...conversationHistory.slice(-10),
  ];

  const chat = model.startChat({ history: fullHistory });
  const result = await chat.sendMessageStream(userMessage);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

function parseAIResponse(text: string, fallbackStage: JourneyStage): AIResponse {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<AIResponse>;

    // Validate and ensure required fields
    const rawChips = parsed.followUpChips;
    const followUpChips: [string, string, string] =
      Array.isArray(rawChips) && rawChips.length >= 3
        ? [String(rawChips[0]), String(rawChips[1]), String(rawChips[2])]
        : ['Tell me more', 'What should I do next?', 'I need help with voting'];

    return {
      stage: parsed.stage ?? fallbackStage,
      message: parsed.message ?? 'I am here to help you with your voting journey.',
      steps: parsed.steps,
      timeline: parsed.timeline,
      checklist: parsed.checklist,
      followUpChips,
      pollingStationSuggestion: parsed.pollingStationSuggestion ?? false,
      calendarPrompt: parsed.calendarPrompt ?? false,
      readinessScoreDelta: parsed.readinessScoreDelta ?? 0,
      safetyNote: parsed.safetyNote,
      documentList: parsed.documentList,
    };
  } catch {
    // Graceful fallback if JSON parsing fails
    return {
      stage: fallbackStage,
      message: text.length > 0 ? text : 'I encountered an issue processing your request. Please try again.',
      followUpChips: ['How do I register?', 'Find my polling station', 'What ID do I need?'] as [string, string, string],
      pollingStationSuggestion: false,
      calendarPrompt: false,
      readinessScoreDelta: 0,
    };
  }
}

export async function classifyIntentWithAI(userMessage: string): Promise<ScenarioType> {
  // Fast keyword classification first (no API call)
  const keywordResult = classifyScenario(userMessage);
  if (keywordResult !== 'general') return keywordResult;

  // For ambiguous cases, use Gemini for classification
  try {
    const model = getGeminiJsonModel();
    const prompt = `Classify this voter query into exactly one of these categories:
missed_registration | lost_voter_id | name_not_in_list | unknown_polling_station | cant_travel | senior_citizen | first_time_voter | evm_question | general

Query: "${userMessage}"

Return ONLY: {"scenario": "category_name"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()) as {
      scenario: ScenarioType;
    };
    return parsed.scenario ?? 'general';
  } catch {
    return 'general';
  }
}
