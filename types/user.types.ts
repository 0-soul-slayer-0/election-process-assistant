import type { Timestamp } from 'firebase/firestore';

export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'bn'
  | 'mr'
  | 'kn'
  | 'gu'
  | 'ml';

export type VoterType = 'first_time' | 'returning' | 'unknown';
export type AgeGroup = 'youth' | 'adult' | 'senior';
export type AccessibilityMode = 'standard' | 'simplified' | 'senior';

export interface ReminderPreference {
  type: 'registration_deadline' | 'election_day' | 'document_check';
  enabled: boolean;
  daysBefore: number;
  calendarEventId?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  language: SupportedLanguage;
  region: string;
  voterType: VoterType;
  ageGroup: AgeGroup;
  accessibilityMode: AccessibilityMode;
  checklistState: ChecklistItem[];
  reminderPreferences: ReminderPreference[];
  readinessScore: number; // 0-100, computed from checklist
  onboardingCompleted: boolean;
  createdAt: Timestamp | Date;
  lastActiveAt: Timestamp | Date;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  category: 'registration' | 'documents' | 'location' | 'dayof';
  completedAt?: Timestamp | Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp | Date;
  stage?: JourneyStage;
}

export type JourneyStage = 'register' | 'prepare' | 'locate' | 'vote';

export const STAGE_ORDER: JourneyStage[] = ['register', 'prepare', 'locate', 'vote'];

export function stageToNumber(stage: JourneyStage): number {
  return STAGE_ORDER.indexOf(stage) + 1;
}
