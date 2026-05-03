# 🗳️ VoteSmart — The Intelligent Election Companion

> **Hack2Skill Google Prompt Wars Submission**  
> Your personal guide from registration to the ballot box.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange?logo=firebase)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Flash-blue?logo=google)](https://ai.google.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://typescriptlang.org)

---

## 🌟 What is VoteSmart?

VoteSmart is **NOT a chatbot**. It is a **Guided Election Companion** — an intelligent, personalized, step-by-step assistant that walks any Indian citizen (first-time voter, senior citizen, rural user, returning voter) through everything they need to know before, during, and after an election.

The experience feels like having a knowledgeable, patient, multilingual friend guide you through voting — adapting to who you are, where you are, what language you speak, and what situation you're in.

---

## ✨ Features

### 🔮 Core Features
| Feature | Description |
|---|---|
| **3-Step Smart Onboarding** | Name, language auto-detection, voter type, region — saved to Firestore |
| **4-Stage Guided Journey** | Register → Prepare → Locate → Vote with AI-powered guidance at each stage |
| **Live Gemini 2.5 Flash AI** | Real structured JSON responses with steps, checklists, follow-up chips |
| **9-Language Support** | English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Gujarati, Malayalam |
| **Google Maps Integration** | Real-time polling station locator with geolocation + address search |
| **Google Calendar Reminders** | OAuth2 — create election day, deadline, and document check reminders |
| **Interactive Checklist** | 8-item readiness tracker with Firestore sync and milestone badges |
| **Document Verification** | Step-by-step guide for all valid photo IDs including lost EPIC card |
| **EVM Voting Instructions** | 9-step guided EVM voting process with "What if?" scenarios |
| **Smart Timing Guide** | Crowd pattern predictions for best time to vote |
| **Scenario Intelligence** | 8 scenario classifiers (lost ID, name not in list, can't travel, etc.) |
| **Senior Citizen Mode** | Larger text, simpler language, transport-first suggestions |
| **Official Government Links** | ECI helpline 1950, voters.eci.gov.in, electoralsearch.eci.gov.in always visible |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — UI (Next.js 14 App Router)                          │
│  / (Onboarding) | /chat | /checklist | /map | /profile         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / Server Actions
┌────────────────────────▼────────────────────────────────────────┐
│  LAYER 2 — API Routes                                           │
│  /api/chat | /api/translate | /api/location | /api/calendar     │
│  Rate limiting (token bucket) | Input validation | Sanitization │
└────────────────────────┬────────────────────────────────────────┘
                         │ Service calls
┌────────────────────────▼────────────────────────────────────────┐
│  LAYER 3 — SERVICES                                             │
│  AIService | TranslationService | LocationService               │
│  CalendarService | ChecklistService | ScenarioService           │
└────────────────────────┬────────────────────────────────────────┘
                         │ Typed queries
┌────────────────────────▼────────────────────────────────────────┐
│  LAYER 4 — DATA (Firestore + Google APIs)                       │
│  UserRepository | ConversationRepository | ChecklistRepository  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | Next.js 14 (App Router, TypeScript strict) | Server + Client components, SEO, performance |
| AI | Gemini 2.5 Flash via `@google/generative-ai` | Structured JSON output, multilingual, fast |
| Auth | Firebase Authentication (Anonymous) | Zero-friction onboarding, upgradeable |
| Database | Cloud Firestore | Real-time sync, typed repositories |
| Translation | Google Cloud Translation API v2 | 9 Indian languages, election term preservation |
| Maps | Google Maps JavaScript API + Geocoding | Live polling station locator, directions |
| Calendar | Google Calendar API v3 (OAuth2) | Election reminders with rich metadata |
| Styling | Vanilla CSS (design system) | WCAG 2.1 AA, glassmorphism, dark mode |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project (Firestore + Anonymous Auth enabled)
- Google AI Studio API key (Gemini)
- Google Cloud project (Maps + Translation APIs enabled)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/election-process-assistant
cd election-process-assistant
npm install
```

Create `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY=your_translate_key
GOOGLE_TRANSLATE_API_KEY=your_translate_key
NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_secret
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔒 Security

- **CSP Headers** — strict Content Security Policy on all routes
- **Rate Limiting** — 20 req/min authenticated, 5 req/min anonymous (token bucket)
- **Input Sanitization** — all user text sanitized before hitting Gemini or Firestore
- **XSS Protection** — no `dangerouslySetInnerHTML`, React JSX escaping
- **Firestore Rules** — users can only read/write their own documents
- **Secrets** — `.env.local` in `.gitignore`, never committed
- **Security Headers** — HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff

---

## ♿ Accessibility

- **WCAG 2.1 AA compliant** design system
- `role="log" aria-live="polite"` on chat message container
- Skip-to-content link as first DOM element
- Keyboard navigation (Tab → Enter → Escape)
- Focus visible 2px offset ring on all interactive elements
- Color contrast ≥ 4.5:1 for all text
- Senior Mode — larger text, simpler language, transport-first
- Screen reader announcements during AI streaming

---

## 🌐 Google Services Integration

| Service | Implementation |
|---|---|
| **Gemini 2.5 Flash** | Structured JSON responses, safety filters, system prompt engineering |
| **Firebase Auth** | Anonymous sign-in, persistent UID, session management |
| **Cloud Firestore** | User profiles, conversation history, checklist state, real-time sync |
| **Translation API v2** | 9 languages, election terminology preservation, batch translate |
| **Maps JavaScript API** | Live map rendering, geolocation, geocoding, custom dark theme |
| **Google Calendar API** | OAuth2 flow, election day + deadline + doc check reminders |

---

## 📁 Project Structure

```
app/                    # Next.js 14 App Router pages + API routes
├── page.tsx           # Onboarding (3-step flow)
├── chat/page.tsx      # Main AI chat interface
├── checklist/page.tsx # Voting readiness checklist
├── map/page.tsx       # Google Maps polling station finder
├── profile/page.tsx   # User settings
└── api/               # API routes (chat, translate, location, calendar)
services/              # Business logic (AI, translation, location, calendar)
repositories/          # Firestore data access layer
lib/                   # Google API clients (Gemini, Maps, Translate, Calendar)
config/                # Election regions, languages, scenarios
types/                 # TypeScript interfaces (strict mode, no `any`)
```

---

## 📋 Checklist

- [x] Firebase Authentication (Anonymous)
- [x] Cloud Firestore (user profiles, checklists, conversations)
- [x] Gemini 2.5 Flash (live AI with structured JSON)
- [x] Google Maps JS API (polling station locator)
- [x] Google Cloud Translation API v2
- [x] Google Calendar API (OAuth2 reminders)
- [x] TypeScript strict mode (zero `any`)
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Rate limiting (token bucket)
- [x] WCAG 2.1 AA accessibility
- [x] 9 Indian languages supported
- [x] Senior Citizen mode
- [x] 4-stage guided journey
- [x] 8 scenario classifiers

---

## 📞 Official Election Resources

- **National Voter Helpline**: 1950
- **Voter Registration**: [voters.eci.gov.in](https://voters.eci.gov.in)
- **ECI Official**: [eci.gov.in](https://eci.gov.in)
- **Check Voter Status**: [electoralsearch.eci.gov.in](https://electoralsearch.eci.gov.in)
- **Download e-EPIC**: [nvsp.in](https://nvsp.in)

---

*Built for Hack2Skill Google Prompt Wars Challenge 🏆*
