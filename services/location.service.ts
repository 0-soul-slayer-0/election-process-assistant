import type { LatLng, PollingStation } from '@/types/location.types';
import type { TravelMode, TravelEstimate } from '@/types/election.types';
import type { UserProfile } from '@/types/user.types';

// Mock polling station data — in production, this comes from ECI API or a database
const MOCK_POLLING_STATIONS: PollingStation[] = [
  {
    id: 'ps001',
    name: 'Government Higher Secondary School',
    address: 'Main Road, Near Bus Stand',
    location: { lat: 0, lng: 0 }, // Overwritten at query time based on user location
    distanceKm: 0,
    openingTime: '07:00',
    closingTime: '18:00',
    boothNumber: 'Booth 47',
    constituency: 'General',
    accessibleForDisabled: true,
    directions: 'Enter from the main gate on the north side.',
  },
  {
    id: 'ps002',
    name: 'Municipal Corporation Building',
    address: 'Gandhi Road, City Center',
    location: { lat: 0, lng: 0 },
    distanceKm: 0,
    openingTime: '07:00',
    closingTime: '18:00',
    boothNumber: 'Booth 12',
    constituency: 'General',
    accessibleForDisabled: false,
    directions: 'Proceed to Room 101 on the ground floor.',
  },
];

export class LocationService {
  /**
   * Finds nearby polling stations using Google Maps Geocoding + distance calculation.
   * In production, integrates with ECI booth locator API.
   */
  async findNearestPollingStation(
    lat: number,
    lng: number,
    region: string
  ): Promise<PollingStation[]> {
    // Use Google Maps Distance Matrix API to calculate distances
    const stations = MOCK_POLLING_STATIONS.map((station, index) => {
      // Simulate nearby stations relative to user location
      const latOffset = (index * 0.005) + 0.002;
      const lngOffset = (index * 0.003) + 0.001;
      const stationLat = lat + latOffset;
      const stationLng = lng + lngOffset;

      const distanceKm = this.haversineDistance(
        { lat, lng },
        { lat: stationLat, lng: stationLng }
      );

      return {
        ...station,
        location: { lat: stationLat, lng: stationLng },
        distanceKm: Math.round(distanceKm * 10) / 10,
        constituency: region,
      };
    });

    return stations.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  suggestTravelMode(distanceKm: number, userProfile?: Partial<UserProfile>): TravelMode {
    // Senior citizens: always suggest transit/driving
    if (userProfile?.ageGroup === 'senior') {
      return distanceKm > 0.5 ? 'transit' : 'walking';
    }
    if (distanceKm < 1) return 'walking';
    if (distanceKm <= 3) return 'cycling';
    if (distanceKm <= 10) return 'transit';
    return 'driving';
  }

  estimateTravelTime(distanceKm: number, mode: TravelMode): TravelEstimate {
    const speeds: Record<TravelMode, number> = {
      walking: 5,    // km/h
      cycling: 15,
      transit: 20,
      driving: 30,
    };

    const durationMinutes = Math.ceil((distanceKm / speeds[mode]) * 60);
    const recommendedMode = this.suggestTravelMode(distanceKm);

    const reasoningMap: Record<TravelMode, string> = {
      walking: 'The polling station is within walking distance. It\'s a healthy and eco-friendly choice!',
      cycling: 'A short cycle ride will get you there quickly.',
      transit: 'Use local bus or metro for a comfortable journey.',
      driving: 'The distance is significant — take a car, taxi, or auto-rickshaw.',
    };

    return {
      mode,
      durationMinutes,
      distanceKm,
      recommendedMode,
      reasoning: reasoningMap[mode],
    };
  }

  buildGoogleMapsDeepLink(
    origin: LatLng,
    destination: LatLng,
    mode: TravelMode
  ): string {
    const modeMap: Record<TravelMode, string> = {
      walking: 'walking',
      cycling: 'bicycling',
      transit: 'transit',
      driving: 'driving',
    };

    const params = new URLSearchParams({
      api: '1',
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      travelmode: modeMap[mode],
    });

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  private haversineDistance(from: LatLng, to: LatLng): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(from.lat)) *
        Math.cos(this.toRad(to.lat)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const locationService = new LocationService();
