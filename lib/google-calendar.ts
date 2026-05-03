/**
 * Google Calendar OAuth2 client setup
 * Handles OAuth2 token exchange and event creation via Google Calendar API v3
 */

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export const CALENDAR_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  redirectUri:
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/calendar/callback`
      : `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
  scopes: GOOGLE_CALENDAR_SCOPES,
};

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CALENDAR_OAUTH_CONFIG.clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: {
    useDefault: false;
    overrides: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

export async function createCalendarEvent(
  event: CalendarEvent,
  accessToken: string
): Promise<{ id: string; htmlLink: string }> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Calendar API error: ${response.status} — ${error}`);
  }

  return response.json() as Promise<{ id: string; htmlLink: string }>;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}
