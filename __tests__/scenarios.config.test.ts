import { describe, it, expect } from '@jest/globals';
import { classifyScenario, SCENARIOS } from '@/config/scenarios.config';

describe('classifyScenario — keyword matching', () => {
  it('returns general for empty input', () => {
    expect(classifyScenario('')).toBe('general');
  });

  it('classifies lost voter ID', () => {
    expect(classifyScenario('I lost my voter id')).toBe('lost_voter_id');
    expect(classifyScenario('my EPIC card is damaged')).toBe('lost_voter_id');
    expect(classifyScenario('voter card stolen')).toBe('lost_voter_id');
  });

  it('classifies missed registration', () => {
    expect(classifyScenario('I missed the registration deadline')).toBe('missed_registration');
    expect(classifyScenario('not registered, deadline passed')).toBe('missed_registration');
  });

  it('classifies name not in list', () => {
    expect(classifyScenario('my name is not on the voter roll')).toBe('name_not_in_list');
    expect(classifyScenario('name is missing from the electoral roll')).toBe('name_not_in_list');
  });

  it('classifies cant travel', () => {
    expect(classifyScenario('I need a postal ballot')).toBe('cant_travel');
    expect(classifyScenario('I have mobility issues and need wheelchair access')).toBe('cant_travel');
  });

  it('classifies senior citizen queries', () => {
    expect(classifyScenario('I am a senior citizen')).toBe('senior_citizen');
    expect(classifyScenario('elderly assistance needed')).toBe('senior_citizen');
  });

  it('classifies first time voter', () => {
    expect(classifyScenario('I am a first time voter')).toBe('first_time_voter');
    expect(classifyScenario('I have never voted before')).toBe('first_time_voter');
  });

  it('classifies EVM questions', () => {
    expect(classifyScenario('how does the evm work?')).toBe('evm_question');
    expect(classifyScenario('explain vvpat to me')).toBe('evm_question');
    expect(classifyScenario('electronic voting machine button')).toBe('evm_question');
  });

  it('classifies unknown polling station', () => {
    expect(classifyScenario('where is my polling station?')).toBe('unknown_polling_station');
    expect(classifyScenario('find my booth number')).toBe('unknown_polling_station');
  });

  it('returns general for unmatched queries', () => {
    expect(classifyScenario('hello how are you')).toBe('general');
    expect(classifyScenario('what is democracy')).toBe('general');
  });

  it('is case insensitive', () => {
    expect(classifyScenario('I LOST MY VOTER ID')).toBe('lost_voter_id');
    expect(classifyScenario('FIRST TIME VOTER')).toBe('first_time_voter');
    expect(classifyScenario('VVPAT machine')).toBe('evm_question');
  });
});

describe('SCENARIOS config — data integrity', () => {
  it('contains all 9 required scenario types', () => {
    const requiredTypes = [
      'missed_registration',
      'lost_voter_id',
      'name_not_in_list',
      'unknown_polling_station',
      'cant_travel',
      'senior_citizen',
      'first_time_voter',
      'evm_question',
      'general',
    ];
    const configuredTypes = SCENARIOS.map(s => s.type);
    requiredTypes.forEach(type => {
      expect(configuredTypes).toContain(type);
    });
  });

  it('every non-general scenario has intentKeywords', () => {
    SCENARIOS.filter(s => s.type !== 'general').forEach(scenario => {
      expect(scenario.intentKeywords.length).toBeGreaterThan(0);
    });
  });

  it('every scenario has a title', () => {
    SCENARIOS.forEach(scenario => {
      expect(typeof scenario.title).toBe('string');
      expect(scenario.title.length).toBeGreaterThan(0);
    });
  });

  it('every scenario has a description', () => {
    SCENARIOS.forEach(scenario => {
      expect(typeof scenario.description).toBe('string');
      expect(scenario.description.length).toBeGreaterThan(0);
    });
  });

  it('urgency is valid enum value', () => {
    SCENARIOS.forEach(scenario => {
      expect(['high', 'medium', 'low']).toContain(scenario.urgency);
    });
  });

  it('requiresMaps and requiresCalendar are boolean', () => {
    SCENARIOS.forEach(scenario => {
      expect(typeof scenario.requiresMaps).toBe('boolean');
      expect(typeof scenario.requiresCalendar).toBe('boolean');
    });
  });
});
