import { createCalendarEvent, type CalendarEvent } from '@/lib/google-calendar';
import type { ElectionEvent } from '@/types/election.types';

export class CalendarService {
  async createElectionReminder(
    electionEvent: ElectionEvent,
    accessToken: string
  ): Promise<{ id: string; htmlLink: string }> {
    const electionDate = new Date(electionEvent.date);
    const startDateTime = new Date(electionDate);
    startDateTime.setHours(7, 0, 0, 0); // 7 AM on election day

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(18, 0, 0, 0); // Polls close at 6 PM

    const event: CalendarEvent = {
      summary: `🗳️ VOTE TODAY — ${electionEvent.title}`,
      description: [
        `📍 Constituency: ${electionEvent.constituency ?? electionEvent.region}`,
        `⏰ Polls open: ${electionEvent.pollingHours.open} — Close: ${electionEvent.pollingHours.close}`,
        '',
        '📋 What to bring:',
        '• Voter ID (EPIC card) or valid alternative photo ID',
        '• Voter slip (if received)',
        '',
        '📞 ECI Helpline: 1950',
        '🌐 Official site: eci.gov.in',
        '🔍 Check voter status: electoralsearch.eci.gov.in',
        '',
        'Your vote counts! Every single vote matters. 🇮🇳',
      ].join('\n'),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 7 * 24 * 60 },   // 7 days before
          { method: 'email', minutes: 24 * 60 },         // 1 day before
          { method: 'popup', minutes: 120 },             // 2 hours before
        ],
      },
    };

    return createCalendarEvent(event, accessToken);
  }

  async createDeadlineReminder(
    deadline: { title: string; date: string; region: string; portalUrl: string },
    accessToken: string
  ): Promise<{ id: string; htmlLink: string }> {
    const deadlineDate = new Date(deadline.date);
    const startDateTime = new Date(deadlineDate);
    startDateTime.setHours(9, 0, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(17, 0, 0, 0);

    const event: CalendarEvent = {
      summary: `⚠️ VOTER REGISTRATION DEADLINE — ${deadline.region}`,
      description: [
        `📋 Today is the LAST DAY to register to vote in ${deadline.region}.`,
        '',
        `🔗 Register now: ${deadline.portalUrl}`,
        '📞 ECI Helpline: 1950',
        '🌐 eci.gov.in',
      ].join('\n'),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 7 * 24 * 60 },  // 7 days before
          { method: 'popup', minutes: 24 * 60 },        // 1 day before
          { method: 'popup', minutes: 60 },             // 1 hour before
        ],
      },
    };

    return createCalendarEvent(event, accessToken);
  }

  async createDocumentCheckReminder(
    electionDate: string,
    accessToken: string
  ): Promise<{ id: string; htmlLink: string }> {
    const election = new Date(electionDate);
    const reminderDate = new Date(election);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before
    reminderDate.setHours(10, 0, 0, 0);

    const endDate = new Date(reminderDate);
    endDate.setHours(11, 0, 0, 0);

    const event: CalendarEvent = {
      summary: '📋 Check Your Voting Documents (3 days to go!)',
      description: [
        'Election day is in 3 days! Check you have these ready:',
        '',
        '✅ Voter ID (EPIC card) OR alternative ID:',
        '   • Aadhaar Card',
        '   • Passport',
        '   • Driving Licence',
        '   • PAN Card (with photo)',
        '   • Bank Passbook with photo',
        '',
        '✅ Know your polling station address',
        '✅ Know your booth number',
        '',
        '📞 ECI Helpline: 1950',
      ].join('\n'),
      start: {
        dateTime: reminderDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    return createCalendarEvent(event, accessToken);
  }
}

export const calendarService = new CalendarService();
