import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-client';
import type { UserProfile, ChecklistItem, ConversationMessage } from '@/types/user.types';
import { DEFAULT_CHECKLIST } from '@/services/checklist.service';

export class UserRepository {
  private get db() {
    return getFirebaseDb();
  }

  async getUser(uid: string): Promise<UserProfile | null> {
    const ref = doc(this.db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  }

  async createUser(profile: Omit<UserProfile, 'createdAt' | 'lastActiveAt'>): Promise<void> {
    const ref = doc(this.db, 'users', profile.uid);
    await setDoc(ref, {
      ...profile,
      checklistState: DEFAULT_CHECKLIST,
      readinessScore: 0,
      onboardingCompleted: false,
      reminderPreferences: [],
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
  }

  async updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const ref = doc(this.db, 'users', uid);
    await updateDoc(ref, {
      ...updates,
      lastActiveAt: serverTimestamp(),
    });
  }

  async updateChecklist(uid: string, checklistState: ChecklistItem[], readinessScore: number): Promise<void> {
    const ref = doc(this.db, 'users', uid);
    await updateDoc(ref, {
      checklistState,
      readinessScore,
      lastActiveAt: serverTimestamp(),
    });
  }

  async markOnboardingComplete(uid: string): Promise<void> {
    const ref = doc(this.db, 'users', uid);
    await updateDoc(ref, {
      onboardingCompleted: true,
      lastActiveAt: serverTimestamp(),
    });
  }
}

export class ConversationRepository {
  private get db() {
    return getFirebaseDb();
  }

  private getRef(uid: string) {
    return collection(this.db, 'users', uid, 'conversations');
  }

  async addMessage(uid: string, message: Omit<ConversationMessage, 'timestamp'>): Promise<void> {
    const ref = this.getRef(uid);
    await addDoc(ref, {
      ...message,
      timestamp: serverTimestamp(),
    });
  }

  async getRecentMessages(uid: string, count = 10): Promise<ConversationMessage[]> {
    const ref = this.getRef(uid);
    const q = query(ref, orderBy('timestamp', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as ConversationMessage)
      .reverse();
  }
}

export const userRepository = new UserRepository();
export const conversationRepository = new ConversationRepository();
