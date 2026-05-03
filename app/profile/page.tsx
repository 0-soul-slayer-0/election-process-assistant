'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase-client';
import { userRepository } from '@/repositories/user.repository';
import { SUPPORTED_LANGUAGES } from '@/config/supported-languages.config';
import { ELECTION_REGIONS } from '@/config/election-regions.config';
import type { UserProfile, SupportedLanguage, AccessibilityMode } from '@/types/user.types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/'; return; }
      const p = await userRepository.getUser(user.uid);
      if (p) setProfile(p);
    });
  }, []);

  const save = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await userRepository.updateUser(profile.uid, updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const logout = async () => {
    await signOut(getAuth(getFirebaseApp()));
    window.location.href = '/';
  };

  if (!profile) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p style={{ color: 'var(--color-text-secondary)' }}>Loading profile...</p></div>;

  const region = ELECTION_REGIONS.find(r => r.id === profile.region);

  return (
    <main id="main-content" style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '640px', margin: '0 auto' }}>
      <a href="/chat" style={{ color: 'var(--color-primary-light)', fontSize: '0.875rem', display: 'inline-flex', gap: '4px', marginBottom: '24px', textDecoration: 'none' }}>← Back to Chat</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Your Profile</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>Manage your election preferences and voting journey settings.</p>

      {saved && <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem', marginBottom: '20px' }} role="status">✅ Profile saved successfully!</div>}

      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>Personal Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="profile-name" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>Name</label>
            <input id="profile-name" type="text" className="input-field" value={profile.name} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} onBlur={() => save({ name: profile.name })} />
          </div>
          <div>
            <label htmlFor="profile-language" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>Language</label>
            <select id="profile-language" className="select-field" value={profile.language} onChange={e => save({ language: e.target.value as SupportedLanguage })}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.nativeName} ({l.name})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="profile-region" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>State / Region</label>
            <select id="profile-region" className="select-field" value={profile.region} onChange={e => save({ region: e.target.value })}>
              {ELECTION_REGIONS.map(r => <option key={r.id} value={r.id}>📍 {r.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="profile-mode" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>Accessibility Mode</label>
            <select id="profile-mode" className="select-field" value={profile.accessibilityMode} onChange={e => save({ accessibilityMode: e.target.value as AccessibilityMode })}>
              <option value="standard">👁️ Standard</option>
              <option value="simplified">🔤 Simplified (Explain like I'm 10)</option>
              <option value="senior">👴 Senior Mode (Larger text, simpler language)</option>
            </select>
          </div>
        </div>
      </div>

      {region && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Election Info — {region.name}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {region.electionDate && <InfoRow label="📅 Election Date" value={new Date(region.electionDate).toLocaleDateString('en-IN', { dateStyle: 'full' })} />}
            {region.registrationDeadline && <InfoRow label="⚠️ Registration Deadline" value={new Date(region.registrationDeadline).toLocaleDateString('en-IN', { dateStyle: 'full' })} warn />}
            <InfoRow label="📞 ECI Helpline" value={region.helplineNumber} />
            <InfoRow label="🔗 Registration Portal" value={region.registrationPortal} link={region.registrationPortal} />
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Account</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>UID: <code style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{profile.uid}</code></p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Voter Type: <strong>{profile.voterType}</strong> · Age Group: <strong>{profile.ageGroup}</strong>
        </p>
        <button className="btn-secondary" onClick={logout} aria-label="Sign out" style={{ color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)' }}>
          Sign Out
        </button>
      </div>
    </main>
  );
}

function InfoRow({ label, value, link, warn }: { label: string; value: string; link?: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)', gap: '12px' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--color-primary-light)', wordBreak: 'break-all' }}>{value}</a>
      ) : (
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: warn ? 'var(--color-warning)' : 'var(--color-text)', wordBreak: 'break-all' }}>{value}</span>
      )}
    </div>
  );
}
