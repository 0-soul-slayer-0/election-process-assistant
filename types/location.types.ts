export interface LatLng {
  lat: number;
  lng: number;
}

export interface PollingStation {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  distanceKm: number;
  openingTime: string;
  closingTime: string;
  boothNumber?: string;
  constituency: string;
  accessibleForDisabled: boolean;
  directions?: string;
}

export interface DirectionsResult {
  distance: string;
  duration: string;
  steps: string[];
  polyline?: string;
  deepLink: string;
}

export interface GeolocationState {
  loading: boolean;
  position: LatLng | null;
  error: string | null;
  permissionGranted: boolean;
}

export interface PlacesSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  rating?: number;
}
