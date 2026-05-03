import type { SupportedLanguage } from './user.types';

export interface ElectionRegion {
  id: string;
  name: string;
  state: string;
  defaultLanguage: SupportedLanguage;
  languages: SupportedLanguage[];
  registrationPortal: string;
  registrationDeadline?: string; // ISO date string
  electionDate?: string; // ISO date string
  constituency?: string;
  helplineNumber: string;
  electoralOfficer?: string;
}

export interface ElectionEvent {
  id: string;
  title: string;
  date: string;
  type: 'registration_deadline' | 'election_day' | 'result_day';
  region: string;
  constituency?: string;
  pollingHours: { open: string; close: string };
}

export interface RegistrationDeadline {
  region: string;
  deadline: string; // ISO date string
  portalUrl: string;
  instructions: string[];
}

export type TravelMode = 'walking' | 'cycling' | 'transit' | 'driving';

export interface TravelEstimate {
  mode: TravelMode;
  durationMinutes: number;
  distanceKm: number;
  recommendedMode: TravelMode;
  reasoning: string;
}

export interface EligibilityCriteria {
  minAge: number;
  requiresCitizenship: boolean;
  residencyRequirementMonths: number;
  region: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  nextSteps: string[];
}
