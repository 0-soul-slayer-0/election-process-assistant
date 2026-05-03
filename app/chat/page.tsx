'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase-client';
import { userRepository } from '@/repositories/user.repository';
import type { UserProfile, JourneyStage, SupportedLanguage, AccessibilityMode } from '@/types/user.types';
import type { AIResponse, ChatMessage, GeminiMessage } from '@/types/ai.types';
import { checklistService } from '@/services/checklist.service';
import { STAGE_ORDER } from '@/types/user.types';
import { SUPPORTED_LANGUAGES } from '@/config/supported-languages.config';
import { ELECTION_REGIONS } from '@/config/election-regions.config';

const STAGE_ICONS: Record<JourneyStage, string> = {
  register: '📋', prepare: '📄', locate: '📍', vote: '🗳️',
};
const STAGE_LABELS: Record<JourneyStage, string> = {
  register: 'Register', prepare: 'Prepare', locate: 'Locate', vote: 'Vote',
};

export default function ChatPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<JourneyStage>('register');
  const [showMap, setShowMap] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('calendar_token');
    if (token) {
      setCalendarToken(token);
      sessionStorage.setItem('calendar_token', token);
      window.history.replaceState({}, '', '/chat');
      showToast('✅ Google Calendar connected!');
    } else {
      const stored = sessionStorage.getItem('calendar_token');
      if (stored) setCalendarToken(stored);
    }
  }, []);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/'; return; }
      const p = await userRepository.getUser(user.uid);
      if (!p) { window.location.href = '/'; return; }
      setProfile(p);
      addWelcomeMessage(p);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function addWelcomeMessage(p: UserProfile) {
    const region = ELECTION_REGIONS.find(r => r.id === p.region);
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      aiResponse: {
        stage: 'register',
        message: `Namaste ${p.name}! 🙏 I'm VoteSmart, your personal election companion.\n\nI'll guide you step-by-step through your voting journey in ${region?.name ?? p.region}. We'll cover registration, documents, your polling station, and exactly how to vote.\n\nYour readiness score is currently ${p.readinessScore}%. Let's change that! Where would you like to start?`,
        followUpChips: [
          p.voterType === 'first_time' ? 'I want to register to vote' : 'Check my registration status',
          'Find my polling station',
          'What ID do I need to vote?',
        ] as [string, string, string],
        pollingStationSuggestion: false,
        calendarPrompt: false,
        readinessScoreDelta: 0,
      },
    };
    setMessages([welcome]);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const buildHistory = (): GeminiMessage[] =>
    messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.role === 'user' ? m.content : (m.aiResponse?.message ?? m.content) }],
      }));

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !profile) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: buildHistory(),
          profile,
          stage,
          language: profile.language,
          accessibilityMode: profile.accessibilityMode,
          uid: profile.uid,
        }),
      });

      if (!res.ok) throw new Error('API error');
      const aiResponse = await res.json() as AIResponse;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.message,
        aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Update checklist if AI returned updates
      if (aiResponse.checklist && profile) {
        const updated = checklistService.applyAIChecklistUpdates(profile.checklistState, aiResponse.checklist);
        const newScore = checklistService.computeReadinessScore(updated);
        const updatedProfile = { ...profile, checklistState: updated, readinessScore: newScore };
        setProfile(updatedProfile);
        await userRepository.updateChecklist(profile.uid, updated, newScore);
      }

      if (aiResponse.pollingStationSuggestion) setShowMap(true);

      if (aiResponse.calendarPrompt && !calendarToken) {
        setTimeout(() => showToast('📅 Add to Google Calendar? Click the Calendar button in the sidebar!'), 1000);
      }

    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, profile, stage, calendarToken]);

  const switchLanguage = async (lang: SupportedLanguage) => {
    if (!profile) return;
    setLangOpen(false);
    const updated = { ...profile, language: lang };
    setProfile(updated);
    await userRepository.updateUser(profile.uid, { language: lang });
    showToast(`🌐 Language switched to ${SUPPORTED_LANGUAGES.find(l => l.code === lang)?.nativeName}`);
  };

  const connectCalendar = async () => {
    if (!profile) return;
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_auth_url', uid: profile.uid }),
    });
    const { authUrl } = await res.json() as { authUrl: string };
    window.location.href = authUrl;
  };

  if (!profile) {
    return (
      <main id="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🗳️</div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading VoteSmart...</p>
        </div>
      </main>
    );
  }

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === profile.language);
  const region = ELECTION_REGIONS.find(r => r.id === profile.region);
  const readiness = profile.readinessScore ?? 0;

  return (
    <main id="main-content" data-mode={profile.accessibilityMode} className="chat-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ── LEFT SIDEBAR ── */}
      <aside style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <span style={{ fontSize: '1.6rem' }}>🗳️</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>VoteSmart</span>
        </div>

        {/* Journey Stages */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Your Journey
          </p>
          {STAGE_ORDER.map((s, i) => {
            const isActive = s === stage;
            const isDone = STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(stage);
            return (
              <button
                key={s}
                className="sidebar-link"
                style={{ width: '100%', marginBottom: '4px', background: isActive ? 'var(--color-primary-glow)' : 'transparent', color: isActive ? 'var(--color-primary-light)' : isDone ? 'var(--color-secondary)' : 'var(--color-text-secondary)' }}
                onClick={() => {
                  setStage(s);
                  if (s === 'locate') {
                    window.location.href = '/map';
                  } else if (s === 'prepare' && stage !== 'prepare') {
                    sendMessage('What documents do I need to prepare before voting? Give me a complete checklist.');
                  } else if (s === 'vote' && stage !== 'vote') {
                    sendMessage('Walk me through exactly how to vote on election day, step by step, including how to use the EVM machine.');
                  }
                }}
                aria-current={isActive ? 'step' : undefined}
                aria-label={s === 'locate' ? 'Open polling station map' : `Switch to ${STAGE_LABELS[s]} stage`}
              >
                <span>{isDone ? '✅' : isActive ? '→' : `${i + 1}.`}</span>
                <span>{STAGE_ICONS[s]} {STAGE_LABELS[s]}</span>
                {s === 'locate' && <span style={{ fontSize: '0.6rem', marginLeft: 'auto', opacity: 0.5 }}>→ Map</span>}
              </button>
            );
          })}
        </div>

        {/* Readiness Score */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600 }}>Readiness</span>
            <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{readiness}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${readiness}%` }} role="progressbar" aria-valuenow={readiness} aria-valuemin={0} aria-valuemax={100} aria-label={`${readiness}% ready to vote`} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            {checklistService.getReadinessMessage(readiness)}
          </p>
        </div>

        {/* Calendar */}
        {!calendarToken ? (
          <button className="btn-secondary" style={{ width: '100%', marginBottom: '12px', justifyContent: 'center', fontSize: '0.8rem' }} onClick={connectCalendar} aria-label="Connect Google Calendar to set voting reminders">
            📅 Connect Calendar
          </button>
        ) : (
          <div style={{ padding: '10px', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.8rem', color: 'var(--color-success)', marginBottom: '12px', textAlign: 'center' }}>
            ✅ Calendar Connected
          </div>
        )}

        {/* Official Links */}
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Official Resources
          </p>
          {[
            { icon: '📞', label: '1950 — ECI Helpline', href: 'tel:1950' },
            { icon: '🌐', label: 'voters.eci.gov.in', href: 'https://voters.eci.gov.in' },
            { icon: '🔍', label: 'Check Voter Status', href: 'https://electoralsearch.eci.gov.in' },
            { icon: '📱', label: 'Download e-EPIC', href: 'https://nvsp.in' },
            { icon: '🏛️', label: 'eci.gov.in', href: 'https://eci.gov.in' },
          ].map(link => (
            <a key={link.href} href={link.href} className="official-link" style={{ marginBottom: '6px', display: 'flex' }} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
              <span>{link.icon}</span>
              <span style={{ fontSize: '0.78rem' }}>{link.label}</span>
            </a>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <a href="/checklist" className="sidebar-link" style={{ display: 'flex', marginBottom: '4px' }}>📋 Checklist</a>
          <a href="/map" className="sidebar-link" style={{ display: 'flex', marginBottom: '4px' }}>🗺️ Find Polling Station</a>
          <a href="/profile" className="sidebar-link" style={{ display: 'flex' }}>👤 Profile</a>
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`stage-badge ${stage}`}>Stage {STAGE_ORDER.indexOf(stage) + 1} of 4 — {STAGE_LABELS[stage]}</span>
            {region?.electionDate && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                🗓️ Election: {new Date(region.electionDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Language Switcher */}
            <div style={{ position: 'relative' }}>
              <button className="lang-pill" onClick={() => setLangOpen(o => !o)} aria-label="Switch language" aria-expanded={langOpen} aria-haspopup="listbox">
                {currentLang?.flag} {currentLang?.nativeName}
              </button>
              {langOpen && (
                <div role="listbox" aria-label="Select language" style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button key={lang.code} role="option" aria-selected={lang.code === profile.language} onClick={() => switchLanguage(lang.code)} style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', padding: '10px 16px', background: lang.code === profile.language ? 'var(--color-primary-glow)' : 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left' }}>
                      <span>{lang.flag}</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{lang.nativeName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{lang.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Accessibility Toggle */}
            <button
              className="lang-pill"
              onClick={async () => {
                const modes: AccessibilityMode[] = ['standard', 'simplified', 'senior'];
                const idx = modes.indexOf(profile.accessibilityMode);
                const next = modes[(idx + 1) % modes.length];
                const updated = { ...profile, accessibilityMode: next };
                setProfile(updated);
                await userRepository.updateUser(profile.uid, { accessibilityMode: next });
                showToast(`Mode: ${next.charAt(0).toUpperCase() + next.slice(1)}`);
              }}
              aria-label={`Accessibility mode: ${profile.accessibilityMode}. Click to change.`}
            >
              {profile.accessibilityMode === 'standard' ? '👁️' : profile.accessibilityMode === 'simplified' ? '🔤' : '👴'} {profile.accessibilityMode}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div role="log" aria-live="polite" aria-label="Conversation" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map(msg => (
            <MessageItem key={msg.id} message={msg} onChipClick={sendMessage} />
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', borderBottomLeftRadius: '4px', alignSelf: 'flex-start', maxWidth: '160px' }} aria-label="Loading response...">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask anything about voting in India..."
              rows={1}
              style={{ flex: 1, resize: 'none', minHeight: '48px', maxHeight: '120px' }}
              aria-label="Type your message"
              disabled={loading}
              maxLength={2000}
            />
            <button
              className="btn-primary"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              style={{ padding: '12px 20px', flexShrink: 0 }}
            >
              {loading ? '...' : '→'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Press Enter to send · Shift+Enter for new line · ECI Helpline: <strong>1950</strong>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
          Quick Actions
        </h2>

        {/* Checklist Preview */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px' }}>📋 Checklist</h3>
          {profile.checklistState.slice(0, 4).map(item => (
            <div key={item.id} className="checklist-item" style={{ marginBottom: '8px', padding: '8px 12px', cursor: 'default' }}>
              <span style={{ color: item.completed ? 'var(--color-success)' : 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {item.completed ? '✅' : '⬜'}
              </span>
              <span style={{ fontSize: '0.8rem', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                {item.label}
              </span>
            </div>
          ))}
          <a href="/checklist" style={{ display: 'block', textAlign: 'center', fontSize: '0.8rem', marginTop: '8px', color: 'var(--color-primary-light)' }}>
            View all →
          </a>
        </div>

        {/* Smart Timing */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px' }}>⏰ Best Time to Vote</h3>
          {[
            { time: '7–9 AM', crowd: 'Low', rec: profile.ageGroup === 'senior', color: 'var(--color-success)' },
            { time: '9–11 AM', crowd: 'High', rec: false, color: 'var(--color-error)' },
            { time: '11 AM–2 PM', crowd: 'Medium', rec: true, color: 'var(--color-warning)' },
            { time: '3–5 PM', crowd: 'Low', rec: !profile.ageGroup?.startsWith('s'), color: 'var(--color-success)' },
            { time: '5–6 PM', crowd: 'High', rec: false, color: 'var(--color-error)' },
          ].map(slot => (
            <div key={slot.time} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
              <span>{slot.time}</span>
              <span style={{ color: slot.color, fontWeight: slot.rec ? 700 : 400 }}>
                {slot.crowd} {slot.rec ? '⭐' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Map Toggle */}
        {showMap && (
          <a href="/map" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', textDecoration: 'none' }}>
            🗺️ Open Polling Map
          </a>
        )}
      </aside>

      {/* Toast Notification */}
      {toast && (
        <div className="toast" role="alert" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}

function MessageItem({ message, onChipClick }: { message: ChatMessage; onChipClick: (text: string) => void }) {
  const isUser = message.role === 'user';
  const ai = message.aiResponse;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}>
      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        {(ai?.message ?? message.content).split('\n').map((line, i) => (
          <p key={i} style={{ marginBottom: i < (ai?.message ?? message.content).split('\n').length - 1 ? '6px' : 0 }}>{line}</p>
        ))}

        {ai?.steps && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ai.steps.map(step => (
              <div key={step.number} style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{step.number}</span>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{step.text}</p>
                  {step.detail && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{step.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ai?.documentList && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ai.documentList.map(doc => (
              <div key={doc.name} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                <strong>{doc.name}</strong>
                {doc.description && <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{doc.description}</p>}
              </div>
            ))}
          </div>
        )}

        {ai?.safetyNote && (
          <p style={{ marginTop: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px' }}>
            ℹ️ {ai.safetyNote}
          </p>
        )}
      </div>

      {!isUser && ai?.followUpChips && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label="Suggested follow-up questions">
          {ai.followUpChips.map((chip, i) => (
            <button key={i} className="chip" onClick={() => onChipClick(chip)} aria-label={`Ask: ${chip}`}>
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
