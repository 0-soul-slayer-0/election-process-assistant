import type { ChecklistItem } from '@/types/user.types';

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'completedAt'>[] = [
  { id: 'voter_registration', label: 'Confirmed voter registration status', completed: false, category: 'registration' },
  { id: 'constituency_booth', label: 'Know my constituency and booth number', completed: false, category: 'registration' },
  { id: 'photo_id', label: 'Have a valid photo ID ready', completed: false, category: 'documents' },
  { id: 'polling_location', label: 'Know my polling station location', completed: false, category: 'location' },
  { id: 'election_date', label: 'Know the election date and time', completed: false, category: 'registration' },
  { id: 'reminder_set', label: 'Set a reminder for voting day', completed: false, category: 'dayof' },
  { id: 'poll_hours', label: 'Know what time polls open and close', completed: false, category: 'dayof' },
  { id: 'transport', label: 'Arranged transport to polling station if needed', completed: false, category: 'dayof' },
];

export interface MilestoneResult {
  milestone: 50 | 100 | null;
  message: string | null;
}

export class ChecklistService {
  getDefaultChecklist(): ChecklistItem[] {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }

  computeReadinessScore(items: ChecklistItem[]): number {
    if (items.length === 0) return 0;
    const completed = items.filter((i) => i.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  getReadinessMessage(score: number): string {
    if (score <= 30) return "Let's get you started! Your vote matters.";
    if (score <= 60) return "Good progress! You're on your way.";
    if (score <= 90) return "Almost there! Just a few steps left.";
    return "You're fully ready to vote! See you at the booth. 🗳️";
  }

  getReadinessColor(score: number): string {
    if (score <= 30) return '#ef4444';  // red
    if (score <= 60) return '#f59e0b';  // amber
    if (score <= 90) return '#3b82f6';  // blue
    return '#22c55e';                    // green
  }

  checkMilestone(prevScore: number, newScore: number): MilestoneResult {
    if (prevScore < 50 && newScore >= 50) {
      return {
        milestone: 50,
        message: "🎉 Halfway there! You're making great progress.",
      };
    }
    if (prevScore < 100 && newScore === 100) {
      return {
        milestone: 100,
        message: '🏆 You are 100% ready to vote! Your voice matters.',
      };
    }
    return { milestone: null, message: null };
  }

  markItemComplete(
    items: ChecklistItem[],
    itemId: string
  ): ChecklistItem[] {
    return items.map((item) =>
      item.id === itemId
        ? { ...item, completed: true, completedAt: new Date() }
        : item
    );
  }

  markItemIncomplete(
    items: ChecklistItem[],
    itemId: string
  ): ChecklistItem[] {
    return items.map((item) =>
      item.id === itemId
        ? { ...item, completed: false, completedAt: undefined }
        : item
    );
  }

  getItemsByCategory(
    items: ChecklistItem[],
    category: ChecklistItem['category']
  ): ChecklistItem[] {
    return items.filter((i) => i.category === category);
  }

  getIncompleteItems(items: ChecklistItem[]): ChecklistItem[] {
    return items.filter((i) => !i.completed);
  }

  applyAIChecklistUpdates(
    existingItems: ChecklistItem[],
    updates: ChecklistItem[]
  ): ChecklistItem[] {
    const updatesById = new Map(updates.map((u) => [u.id, u]));
    return existingItems.map((item) => {
      const update = updatesById.get(item.id);
      if (update?.completed && !item.completed) {
        return { ...item, completed: true, completedAt: new Date() };
      }
      return item;
    });
  }
}

export const checklistService = new ChecklistService();
