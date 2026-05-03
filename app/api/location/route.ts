import { NextRequest, NextResponse } from 'next/server';
import { locationService } from '@/services/location.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      lat: number;
      lng: number;
      region: string;
    };

    const { lat, lng, region } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'lat and lng are required numbers' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const stations = await locationService.findNearestPollingStation(lat, lng, region ?? 'India');
    return NextResponse.json({ stations });
  } catch (error) {
    console.error('[/api/location] Error:', error);
    return NextResponse.json(
      { error: 'Location lookup failed. Please try again.' },
      { status: 500 }
    );
  }
}
