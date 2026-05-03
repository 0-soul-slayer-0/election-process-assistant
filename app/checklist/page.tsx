'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase-client';
import { userRepository } from '@/repositories/user.repository';
import { checklistService } from '@/services/checklist.service';
import type { UserProfile, ChecklistItem } from '@/types/user.types';

const CATEGORY_LABELS: Record<ChecklistItem['category'], string> = {
  registration: '📋 Registration',
  documents: '📄 Documents',
  location: '📍 Location',
  dayof: '🗳️ Day Of',
};

export default function ChecklistPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/'; return; }
      const p = await userRepository.getUser(user.uid);
      if (!p) { window.location.href = '/'; return; }
      setProfile(p);
    });
  }, []);

  const toggle = async (itemId: string) => {
    if (!profile) return;
    const item = profile.checklistState.find(i => i.id === itemId);
    if (!item) return;

    const prevScore = profile.readinessScore;
    const updated = item.completed
      ? checklistService.markItemIncomplete(profile.checklistState, itemId)
      : checklistService.markItemComplete(profile.checklistState, itemId);
    const newScore = checklistService.computeReadinessScore(updated);
    const result = checklistService.checkMilestone(prevScore, newScore);

    const updatedProfile = { ...profile, checklistState: updated, readinessScore: newScore };
    setProfile(updatedProfile);
    await userRepository.updateChecklist(profile.uid, updated, newScore);

    if (result.message) {
      setMilestone(result.message);
      setTimeout(() => setMilestone(null), 4000);
    }
  };

  if (!profile) return <Loading />;

  const score = profile.readinessScore;
  const categories = ['registration', 'documents', 'location', 'dayof'] as ChecklistItem['category'][];

  return (
    <main id="main-content" data-mode={profile.accessibilityMode} style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '760px', margin: '0 auto' }}>
      <a href="/chat" style={{ color: 'var(--color-primary-light)', fontSize: '0.875rem', display: 'inline-flex', gap: '4px', marginBottom: '24px', textDecoration: 'none' }}>
        ← Back to Chat
      </a>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Voting Readiness Checklist</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
        Track your progress toward election day. Your state is saved automatically.
      </p>

      {/* Score Card */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          {score}%
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '1rem' }}>
          {checklistService.getReadinessMessage(score)}
        </p>
        <div className="progress-bar" style={{ height: '12px' }}>
          <div className="progress-fill" style={{ width: `${score}%` }} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} />
        </div>
      </div>

      {/* Milestone Toast */}
      {milestone && (
        <div className="milestone-badge" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '16px', background: 'linear-gradient(135deg, rgba(79,123,255,0.2), rgba(0,212,170,0.2))', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-lg)', marginBottom: '24px', fontSize: '1rem', fontWeight: 600 }}>
          {milestone}
        </div>
      )}

      {/* Checklist by Category */}
      {categories.map(cat => {
        const items = checklistService.getItemsByCategory(profile.checklistState, cat);
        return (
          <div key={cat} style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              {CATEGORY_LABELS[cat]}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`checklist-item ${item.completed ? 'completed' : ''}`}
                  onClick={() => toggle(item.id)}
                  role="checkbox"
                  aria-checked={item.completed}
                  aria-label={`${item.completed ? 'Unmark' : 'Mark as complete'}: ${item.label}`}
                  style={{ textAlign: 'left', background: 'none', border: '1px solid', borderColor: item.completed ? 'rgba(34,197,94,0.3)' : 'var(--color-border)', cursor: 'pointer', width: '100%' }}
                >
                  <span style={{ fontSize: '1.25rem', flexShrink: 0, transition: 'transform 0.2s', transform: item.completed ? 'scale(1)' : 'scale(0.9)' }}>
                    {item.completed ? '✅' : '⬜'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                      {item.label}
                    </span>
                    {item.completed && item.completedAt && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Completed {new Date(item.completedAt as Date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}

function Loading() {
  return (
    <main id="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Loading checklist...</p>
    </main>
  );
}
