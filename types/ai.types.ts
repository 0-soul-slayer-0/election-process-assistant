import type { JourneyStage, ChecklistItem } from './user.types';

export interface StepItem {
  number: number;
  text: string;
  detail?: string;
  whatIf?: string;
}

export interface TimelineItem {
  date: string;
  event: string;
  urgent: boolean;
}

export interface AIResponse {
  stage: JourneyStage;
  message: string;
  steps?: StepItem[];
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
  followUpChips: [string, string, string];
  pollingStationSuggestion?: boolean;
  calendarPrompt?: boolean;
  readinessScoreDelta?: number;
  safetyNote?: string;
  documentList?: DocumentItem[];
  scenarioType?: ScenarioType;
}

export interface DocumentItem {
  name: string;
  description: string;
  validity: string;
  howToGet?: string;
}

export type ScenarioType =
  | 'missed_registration'
  | 'lost_voter_id'
  | 'name_not_in_list'
  | 'unknown_polling_station'
  | 'cant_travel'
  | 'senior_citizen'
  | 'first_time_voter'
  | 'evm_question'
  | 'general';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  aiResponse?: AIResponse;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}
