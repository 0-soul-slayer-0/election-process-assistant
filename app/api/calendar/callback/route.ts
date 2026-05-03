import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';

/**
 * OAuth2 callback handler for Google Calendar
 * Google redirects here after user grants calendar access
 * Registered URI: http://localhost:3000/api/calendar/callback
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // uid passed earlier
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // User denied permission
  if (error) {
    console.error('[calendar/callback] OAuth error:', error);
    return NextResponse.redirect(`${appUrl}/chat?calendar_error=access_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/chat?calendar_error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    // Redirect back to /chat with token in query string
    // Client stores it in sessionStorage immediately
    const redirectUrl = new URL('/chat', appUrl);
    redirectUrl.searchParams.set('calendar_token', tokens.access_token);
    if (state) redirectUrl.searchParams.set('calendar_uid', state);
    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('[calendar/callback] Token exchange failed:', err);
    return NextResponse.redirect(`${appUrl}/chat?calendar_error=token_failed`);
  }
}
