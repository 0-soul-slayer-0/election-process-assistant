import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, exchangeCodeForTokens, createCalendarEvent } from '@/lib/google-calendar';
import { calendarService } from '@/services/calendar.service';
import type { ElectionEvent } from '@/types/election.types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      action: 'create_election_reminder' | 'create_deadline_reminder' | 'create_doc_reminder' | 'get_auth_url';
      accessToken?: string;
      electionEvent?: ElectionEvent;
      deadline?: { title: string; date: string; region: string; portalUrl: string };
      electionDate?: string;
      uid?: string;
    };

    const { action, accessToken } = body;

    if (action === 'get_auth_url') {
      const state = body.uid ?? 'anonymous';
      const authUrl = buildAuthUrl(state);
      return NextResponse.json({ authUrl });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required. Please connect your Google Calendar first.' },
        { status: 401 }
      );
    }

    if (action === 'create_election_reminder') {
      if (!body.electionEvent) {
        return NextResponse.json({ error: 'electionEvent is required' }, { status: 400 });
      }
      const result = await calendarService.createElectionReminder(body.electionEvent, accessToken);
      return NextResponse.json({ success: true, event: result });
    }

    if (action === 'create_deadline_reminder') {
      if (!body.deadline) {
        return NextResponse.json({ error: 'deadline is required' }, { status: 400 });
      }
      const result = await calendarService.createDeadlineReminder(body.deadline, accessToken);
      return NextResponse.json({ success: true, event: result });
    }

    if (action === 'create_doc_reminder') {
      if (!body.electionDate) {
        return NextResponse.json({ error: 'electionDate is required' }, { status: 400 });
      }
      const result = await calendarService.createDocumentCheckReminder(body.electionDate, accessToken);
      return NextResponse.json({ success: true, event: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[/api/calendar] Error:', error);
    return NextResponse.json(
      { error: 'Calendar operation failed. Please try again.' },
      { status: 500 }
    );
  }
}

// OAuth2 callback handler
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    // In production: store refresh token in Firestore linked to user uid (state param)
    // For now: return tokens to client to store in sessionStorage
    const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
    redirectUrl.searchParams.set('calendar_token', tokens.access_token);
    redirectUrl.searchParams.set('calendar_uid', state ?? '');
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('[/api/calendar/callback] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}?calendar_error=true`
    );
  }
}
