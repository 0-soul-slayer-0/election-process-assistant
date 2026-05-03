import { describe, it, expect } from '@jest/globals';
import { checklistService, DEFAULT_CHECKLIST } from '@/services/checklist.service';
import type { ChecklistItem } from '@/types/user.types';

const makeItems = (completed: boolean[]): ChecklistItem[] =>
  DEFAULT_CHECKLIST.map((item, i) => ({ ...item, completed: completed[i] ?? false }));

describe('ChecklistService — computeReadinessScore', () => {
  it('returns 0 for empty list', () => {
    expect(checklistService.computeReadinessScore([])).toBe(0);
  });

  it('returns 0 when nothing completed', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    expect(checklistService.computeReadinessScore(items)).toBe(0);
  });

  it('returns 100 when all completed', () => {
    const items = makeItems([true, true, true, true, true, true, true, true]);
    expect(checklistService.computeReadinessScore(items)).toBe(100);
  });

  it('returns 50 when half completed (8 items → 4 done)', () => {
    const items = makeItems([true, true, true, true, false, false, false, false]);
    expect(checklistService.computeReadinessScore(items)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    const items = makeItems([true, false, false, false, false, false, false, false]); // 1/8 = 12.5%
    expect(checklistService.computeReadinessScore(items)).toBe(13);
  });
});

describe('ChecklistService — getReadinessMessage', () => {
  it('returns start message for score 0', () => {
    expect(checklistService.getReadinessMessage(0)).toContain("started");
  });

  it('returns progress message for score 50', () => {
    expect(checklistService.getReadinessMessage(50)).toContain("progress");
  });

  it('returns almost-there for score 80', () => {
    expect(checklistService.getReadinessMessage(80)).toContain("Almost");
  });

  it('returns ready message for score 100', () => {
    expect(checklistService.getReadinessMessage(100)).toContain("ready");
  });
});

describe('ChecklistService — getReadinessColor', () => {
  it('returns red for low scores', () => {
    expect(checklistService.getReadinessColor(10)).toBe('#ef4444');
  });

  it('returns amber for mid scores', () => {
    expect(checklistService.getReadinessColor(50)).toBe('#f59e0b');
  });

  it('returns green for 100', () => {
    expect(checklistService.getReadinessColor(100)).toBe('#22c55e');
  });
});

describe('ChecklistService — checkMilestone', () => {
  it('detects 50% milestone', () => {
    const result = checklistService.checkMilestone(40, 50);
    expect(result.milestone).toBe(50);
    expect(result.message).toBeTruthy();
  });

  it('detects 100% milestone', () => {
    const result = checklistService.checkMilestone(90, 100);
    expect(result.milestone).toBe(100);
    expect(result.message).toContain('100%');
  });

  it('returns null when no milestone crossed', () => {
    const result = checklistService.checkMilestone(60, 70);
    expect(result.milestone).toBeNull();
    expect(result.message).toBeNull();
  });
});

describe('ChecklistService — markItemComplete', () => {
  it('marks a specific item as completed', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const result = checklistService.markItemComplete(items, 'voter_registration');
    expect(result.find(i => i.id === 'voter_registration')?.completed).toBe(true);
  });

  it('does not affect other items', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const result = checklistService.markItemComplete(items, 'voter_registration');
    expect(result.filter(i => i.id !== 'voter_registration').every(i => !i.completed)).toBe(true);
  });

  it('sets completedAt timestamp', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const result = checklistService.markItemComplete(items, 'voter_registration');
    expect(result.find(i => i.id === 'voter_registration')?.completedAt).toBeInstanceOf(Date);
  });
});

describe('ChecklistService — markItemIncomplete', () => {
  it('marks a completed item as incomplete', () => {
    const items = makeItems([true, false, false, false, false, false, false, false]);
    const result = checklistService.markItemIncomplete(items, 'voter_registration');
    expect(result.find(i => i.id === 'voter_registration')?.completed).toBe(false);
  });
});

describe('ChecklistService — getItemsByCategory', () => {
  it('returns only registration items', () => {
    const items = DEFAULT_CHECKLIST;
    const result = checklistService.getItemsByCategory(items, 'registration');
    expect(result.every(i => i.category === 'registration')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns only documents items', () => {
    const result = checklistService.getItemsByCategory(DEFAULT_CHECKLIST, 'documents');
    expect(result.every(i => i.category === 'documents')).toBe(true);
  });
});

describe('ChecklistService — applyAIChecklistUpdates', () => {
  it('marks items completed from AI updates', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const updates = [{ id: 'voter_registration', label: 'test', completed: true, category: 'registration' as const }];
    const result = checklistService.applyAIChecklistUpdates(items, updates);
    expect(result.find(i => i.id === 'voter_registration')?.completed).toBe(true);
  });

  it('does not un-complete already completed items', () => {
    const items = makeItems([true, false, false, false, false, false, false, false]);
    const updates = [{ id: 'voter_registration', label: 'test', completed: false, category: 'registration' as const }];
    const result = checklistService.applyAIChecklistUpdates(items, updates);
    expect(result.find(i => i.id === 'voter_registration')?.completed).toBe(true);
  });

  it('returns original length', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const result = checklistService.applyAIChecklistUpdates(items, []);
    expect(result.length).toBe(items.length);
  });

  it('ignores unknown item IDs in updates', () => {
    const items = makeItems([false, false, false, false, false, false, false, false]);
    const updates = [{ id: 'nonexistent_id', label: 'test', completed: true, category: 'registration' as const }];
    const result = checklistService.applyAIChecklistUpdates(items, updates);
    expect(result.every(i => !i.completed)).toBe(true);
  });
});

describe('ChecklistService — getIncompleteItems', () => {
  it('returns only incomplete items', () => {
    const items = makeItems([true, false, true, false, false, false, false, false]);
    const result = checklistService.getIncompleteItems(items);
    expect(result.every(i => !i.completed)).toBe(true);
  });

  it('returns empty array when all complete', () => {
    const items = makeItems([true, true, true, true, true, true, true, true]);
    expect(checklistService.getIncompleteItems(items)).toHaveLength(0);
  });
});
