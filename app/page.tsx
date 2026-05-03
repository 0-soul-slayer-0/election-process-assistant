'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInAnonymously,
  getAuth,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase-client';
import { userRepository } from '@/repositories/user.repository';
import { ELECTION_REGIONS, getDefaultLanguageForLocale } from '@/config/election-regions.config';
import { SUPPORTED_LANGUAGES } from '@/config/supported-languages.config';
import type { UserProfile, SupportedLanguage, VoterType, AgeGroup } from '@/types/user.types';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding flow (3 steps)
// ─────────────────────────────────────────────────────────────────────────────

type OnboardingStep = 1 | 2 | 3;

interface OnboardingData {
  name: string;
  language: SupportedLanguage;
  voterType: VoterType | null;
  region: string;
  ageGroup: AgeGroup;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState<UserProfile | null>(null);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    language: 'en',
    voterType: null,
    region: 'delhi',
    ageGroup: 'adult',
  });

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await userRepository.getUser(firebaseUser.uid);
        if (profile?.onboardingCompleted) {
          setReturning(profile);
        }
      } else {
        // Sign in anonymously on first visit
        const result = await signInAnonymously(auth);
        setUser(result.user);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-detect browser language
    const browserLang = navigator.language || 'en';
    const detected = getDefaultLanguageForLocale(browserLang);
    setData((d) => ({ ...d, language: detected }));
  }, []);

  const handleContinue = useCallback(async () => {
    if (step < 3) {
      setStep((s) => (s + 1) as OnboardingStep);
      return;
    }

    // Step 3: Save profile and go to chat
    if (!user) return;
    setLoading(true);

    try {
      const profile: Omit<UserProfile, 'createdAt' | 'lastActiveAt' | 'checklistState' | 'reminderPreferences' | 'readinessScore' | 'onboardingCompleted'> = {
        uid: user.uid,
        name: data.name || 'Citizen',
        language: data.language,
        region: data.region,
        voterType: data.voterType ?? 'unknown',
        ageGroup: data.ageGroup,
        accessibilityMode: data.ageGroup === 'senior' ? 'senior' : 'standard',
      };

      await userRepository.createUser(profile as Omit<UserProfile, 'createdAt' | 'lastActiveAt'>);
      await userRepository.markOnboardingComplete(user.uid);
      router.push('/chat');
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setLoading(false);
    }
  }, [step, user, data, router]);

  if (returning) {
    return <ReturningUserScreen profile={returning} onContinue={() => router.push('/chat')} />;
  }

  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Background decoration */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: '120%', height: '80%',
          background: 'radial-gradient(ellipse, rgba(79,123,255,0.12) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '520px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🗳️</div>
          <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
            VoteSmart
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Your personal guide from registration to the ballot box
          </p>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {([1, 2, 3] as OnboardingStep[]).map((s) => (
            <div key={s} style={{
              width: s === step ? '32px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: s === step ? 'var(--color-primary)' : s < step ? 'var(--color-secondary)' : 'var(--color-surface-3)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} aria-label={`Step ${s} of 3`} />
          ))}
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '36px' }}>
          <div className="onboarding-step" key={step}>
            {step === 1 && <Step1 data={data} setData={setData} />}
            {step === 2 && <Step2 data={data} setData={setData} />}
            {step === 3 && <Step3 data={data} setData={setData} />}
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: '28px', justifyContent: 'center', padding: '14px' }}
            onClick={handleContinue}
            disabled={loading || (step === 1 && !data.name.trim()) || (step === 2 && !data.voterType)}
            aria-label={step < 3 ? 'Continue to next step' : 'Complete setup and start'}
          >
            {loading ? 'Setting up...' : step < 3 ? 'Continue →' : "Let's Begin! 🚀"}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '16px' }}>
            Step {step} of 3 • Your data is stored securely in Firestore
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Step 1: Name + Language ─────────────────────────────────────────────────

function Step1({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  return (
    <div>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Welcome! What's your name?</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        I'll personalize your election journey based on your preferences.
      </p>

      <label htmlFor="user-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
        Your Name
      </label>
      <input
        id="user-name"
        type="text"
        className="input-field"
        placeholder="e.g., Priya Sharma"
        value={data.name}
        onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
        maxLength={50}
        autoFocus
        autoComplete="given-name"
        aria-required="true"
      />

      <label htmlFor="language-select" style={{ display: 'block', margin: '20px 0 8px', fontWeight: 600, fontSize: '0.9rem' }}>
        Preferred Language <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(detected from browser)</span>
      </label>
      <select
        id="language-select"
        className="select-field"
        value={data.language}
        onChange={(e) => setData((d) => ({ ...d, language: e.target.value as SupportedLanguage }))}
        aria-label="Select your preferred language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Step 2: Voter Type + Age ─────────────────────────────────────────────────

function Step2({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const voterOptions: { value: VoterType; icon: string; label: string; desc: string }[] = [
    { value: 'first_time', icon: '🌟', label: 'First-Time Voter', desc: 'I have never voted before' },
    { value: 'returning', icon: '✅', label: 'Voted Before', desc: 'I have voted in past elections' },
    { value: 'unknown', icon: '🤔', label: 'Not Sure', desc: 'I need help figuring this out' },
  ];

  const ageOptions: { value: AgeGroup; icon: string; label: string; range: string }[] = [
    { value: 'youth', icon: '🧑', label: 'Youth', range: '18–30 years' },
    { value: 'adult', icon: '👤', label: 'Adult', range: '31–59 years' },
    { value: 'senior', icon: '👴', label: 'Senior', range: '60+ years' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Your voting experience</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        This helps me tailor the guidance to your needs.
      </p>

      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px' }}>
        Is this your first time voting?
      </p>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }} role="radiogroup" aria-label="Voter type">
        {voterOptions.map((opt) => (
          <button
            key={opt.value}
            className={`voter-type-btn ${data.voterType === opt.value ? 'selected' : ''}`}
            style={{ flexDirection: 'row', textAlign: 'left', gap: '16px' }}
            onClick={() => setData((d) => ({ ...d, voterType: opt.value }))}
            role="radio"
            aria-checked={data.voterType === opt.value}
          >
            <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{opt.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px' }}>Age Group</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {ageOptions.map((opt) => (
          <button
            key={opt.value}
            className={`voter-type-btn ${data.ageGroup === opt.value ? 'selected' : ''}`}
            onClick={() => setData((d) => ({ ...d, ageGroup: opt.value }))}
            aria-pressed={data.ageGroup === opt.value}
          >
            <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{opt.label}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{opt.range}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Region ───────────────────────────────────────────────────────────

function Step3({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const selectedRegion = ELECTION_REGIONS.find((r) => r.id === data.region);

  return (
    <div>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Where are you voting?</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        I'll show you region-specific election info, registration portals, and deadlines.
      </p>

      <label htmlFor="region-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
        Your State / Region
      </label>
      <select
        id="region-select"
        className="select-field"
        value={data.region}
        onChange={(e) => setData((d) => ({ ...d, region: e.target.value }))}
        aria-label="Select your state or region"
      >
        {ELECTION_REGIONS.map((region) => (
          <option key={region.id} value={region.id}>
            📍 {region.name}
          </option>
        ))}
      </select>

      {selectedRegion && (
        <div className="glass-card" style={{ marginTop: '20px', padding: '16px', border: '1px solid rgba(79,123,255,0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedRegion.electionDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>📅 Election Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(selectedRegion.electionDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </div>
            )}
            {selectedRegion.registrationDeadline && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>⚠️ Registration Deadline</span>
                <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                  {new Date(selectedRegion.registrationDeadline).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>📞 Helpline</span>
              <span style={{ fontWeight: 600 }}>{selectedRegion.helplineNumber}</span>
            </div>
          </div>
        </div>
      )}

      {data.ageGroup === 'senior' && (
        <div style={{
          marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(0, 212, 170, 0.1)', border: '1px solid rgba(0, 212, 170, 0.3)',
          fontSize: '0.85rem', color: 'var(--color-secondary)',
        }}>
          <strong>Senior Mode will be activated</strong> — Larger text, simpler language, and transport-first suggestions.
        </div>
      )}
    </div>
  );
}

// ─── Returning User Screen ────────────────────────────────────────────────────

function ReturningUserScreen({ profile, onContinue }: { profile: UserProfile; onContinue: () => void }) {
  const score = profile.readinessScore ?? 0;
  const message =
    score < 30 ? "Let's get you started!" :
    score < 60 ? 'Good progress!' :
    score < 90 ? 'Almost there!' :
    "You're fully ready! 🎉";

  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗳️</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Welcome back, {profile.name}!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
          {message} You're <strong style={{ color: 'var(--color-primary-light)' }}>{score}% ready</strong> to vote.
        </p>

        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Voting Readiness</span>
            <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{score}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${score}%` }} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} />
          </div>
          <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Want to continue your readiness checklist?
          </p>
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onContinue}>
          Continue My Journey →
        </button>
      </div>
    </main>
  );
}
