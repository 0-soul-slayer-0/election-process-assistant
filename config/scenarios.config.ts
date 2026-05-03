import type { ScenarioType } from '@/types/ai.types';

export interface ScenarioConfig {
  type: ScenarioType;
  triggers: string[];           // Keywords / phrases that trigger this scenario
  intentKeywords: string[];     // Used by scenario classifier
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  requiresMaps: boolean;
  requiresCalendar: boolean;
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    type: 'missed_registration',
    triggers: [
      'missed registration', 'not registered', 'registration deadline passed',
      'how to register late', 'missed deadline', 'registration closed',
    ],
    intentKeywords: ['missed', 'registration', 'deadline', 'late', 'not registered'],
    title: 'Missed Registration',
    description: 'User missed the voter registration deadline',
    urgency: 'high',
    requiresMaps: false,
    requiresCalendar: true,
  },
  {
    type: 'lost_voter_id',
    triggers: [
      'lost voter id', 'lost epic card', 'voter id missing', 'voter card lost',
      'can\'t find voter id', 'stolen voter id', 'damaged voter id',
    ],
    intentKeywords: ['lost', 'missing', 'voter id', 'epic', 'voter card', 'stolen'],
    title: 'Lost Voter ID',
    description: 'User lost or misplaced their Voter ID (EPIC) card',
    urgency: 'high',
    requiresMaps: false,
    requiresCalendar: false,
  },
  {
    type: 'name_not_in_list',
    triggers: [
      'name not in voter list', 'name not on list', 'not on voter roll',
      'my name is missing', 'cannot find my name', 'name deleted',
      'name not in electoral roll',
    ],
    intentKeywords: ['name', 'list', 'roll', 'missing', 'voter list', 'electoral roll'],
    title: 'Name Not in Voter List',
    description: 'User name is not appearing in the voter roll',
    urgency: 'high',
    requiresMaps: false,
    requiresCalendar: false,
  },
  {
    type: 'unknown_polling_station',
    triggers: [
      'where to vote', 'polling station', 'my booth', 'where is my booth',
      'find polling station', 'voting location', 'where do i vote',
    ],
    intentKeywords: ['polling', 'station', 'booth', 'where', 'location', 'vote'],
    title: 'Find Polling Station',
    description: 'User wants to find their polling station',
    urgency: 'medium',
    requiresMaps: true,
    requiresCalendar: false,
  },
  {
    type: 'cant_travel',
    triggers: [
      'can\'t travel', 'cannot travel', 'disabled', 'handicapped', 'bedridden',
      'postal ballot', 'vote from home', 'proxy voting', 'mobility issues',
      'wheelchair', 'sick on voting day',
    ],
    intentKeywords: ['travel', 'disabled', 'postal', 'ballot', 'proxy', 'home', 'wheelchair'],
    title: 'Cannot Travel to Vote',
    description: 'User has mobility or travel constraints',
    urgency: 'medium',
    requiresMaps: false,
    requiresCalendar: true,
  },
  {
    type: 'senior_citizen',
    triggers: [
      'senior citizen', 'elderly', 'old age', 'age 80', 'above 80',
      'senior mode', 'large text', 'bigger font', 'i am old',
    ],
    intentKeywords: ['senior', 'elderly', 'old', 'age', '80+'],
    title: 'Senior Citizen Assistance',
    description: 'Senior citizen user needs special assistance',
    urgency: 'medium',
    requiresMaps: true,
    requiresCalendar: true,
  },
  {
    type: 'first_time_voter',
    triggers: [
      'first time voter', 'first time voting', 'never voted', 'new voter',
      'how do i vote for the first time', 'first vote', 'first election',
    ],
    intentKeywords: ['first', 'time', 'never', 'new voter', 'first vote'],
    title: 'First-Time Voter',
    description: 'User is voting for the first time',
    urgency: 'low',
    requiresMaps: false,
    requiresCalendar: true,
  },
  {
    type: 'evm_question',
    triggers: [
      'what is evm', 'how does evm work', 'electronic voting machine',
      'how to use evm', 'evm button', 'vvpat', 'evm machine',
      'how to vote on evm', 'voting machine',
    ],
    intentKeywords: ['evm', 'electronic', 'voting machine', 'vvpat', 'button'],
    title: 'EVM Voting Instructions',
    description: 'User wants to understand EVM voting process',
    urgency: 'low',
    requiresMaps: false,
    requiresCalendar: false,
  },
  {
    type: 'general',
    triggers: [],
    intentKeywords: [],
    title: 'General Query',
    description: 'General election-related query',
    urgency: 'low',
    requiresMaps: false,
    requiresCalendar: false,
  },
];

export function classifyScenario(userMessage: string): ScenarioType {
  const lower = userMessage.toLowerCase();
  for (const scenario of SCENARIOS) {
    if (scenario.type === 'general') continue;
    const matched = scenario.intentKeywords.some((kw) => lower.includes(kw));
    if (matched) return scenario.type;
  }
  return 'general';
}
