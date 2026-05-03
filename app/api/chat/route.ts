import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/services/ai.service';
import type { UserProfile, JourneyStage, SupportedLanguage, AccessibilityMode } from '@/types/user.types';
import type { GeminiMessage } from '@/types/ai.types';

// In-memory rate limiter (in production: use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(uid: string, isAuthenticated: boolean): boolean {
  const now = Date.now();
  const maxRequests = isAuthenticated ? 20 : 5;
  const windowMs = 60_000;

  const entry = rateLimitMap.get(uid);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function sanitizeInput(text: string): string {
  // Remove potential prompt injection attempts
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 2000); // Max 2000 chars per message
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      message: string;
      conversationHistory?: GeminiMessage[];
      profile?: Partial<UserProfile>;
      stage?: JourneyStage;
      language?: SupportedLanguage;
      accessibilityMode?: AccessibilityMode;
      uid?: string;
    };

    const {
      message,
      conversationHistory = [],
      profile = {},
      stage = 'register',
      language = 'en',
      accessibilityMode = 'standard',
      uid = 'anonymous',
    } = body;

    // Input validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message is required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const isAuthenticated = uid !== 'anonymous';
    if (!checkRateLimit(uid, isAuthenticated)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another message.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      );
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message);

    // Generate AI response
    const aiResponse = await generateAIResponse(
      sanitizedMessage,
      conversationHistory,
      profile,
      stage,
      language,
      accessibilityMode
    );

    return NextResponse.json(aiResponse, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; statusText?: string; message?: string };
    console.error('[/api/chat] Error:', err?.status, err?.statusText, err?.message);
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'The AI service is busy right now. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': '10' } }
      );
    }
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
