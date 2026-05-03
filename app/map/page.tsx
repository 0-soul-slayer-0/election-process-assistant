'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase-client';
import { userRepository } from '@/repositories/user.repository';
import { locationService } from '@/services/location.service';
import type { UserProfile } from '@/types/user.types';
import type { PollingStation } from '@/types/location.types';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export default function MapPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [selected, setSelected] = useState<PollingStation | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/'; return; }
      const p = await userRepository.getUser(user.uid);
      if (p) setProfile(p);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('google-maps-script')) { setMapLoaded(true); return; }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !userPos || stations.length === 0) return;
    const g = (window as unknown as { google: typeof google }).google;
    if (!g) return;
    const map = new g.maps.Map(document.getElementById('map-canvas')!, {
      center: userPos, zoom: 14, mapTypeControl: false, streetViewControl: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0d1629' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ea4cc' }] },
        { featureType: 'water', stylers: [{ color: '#050b18' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2a50' }] },
      ],
    });
    new g.maps.Marker({ position: userPos, map, title: 'Your Location', icon: { path: g.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#4f7bff', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    stations.forEach((station, i) => {
      const marker = new g.maps.Marker({ position: station.location, map, title: station.name, label: { text: `P${i + 1}`, color: 'white', fontWeight: 'bold', fontSize: '12px' }, icon: { path: g.maps.SymbolPath.MAP_PIN, scale: 14, fillColor: '#00d4aa', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      marker.addListener('click', () => setSelected(station));
    });
  }, [mapLoaded, userPos, stations]);

  const locateMe = useCallback(async () => {
    setLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng, region: profile?.region ?? 'general' }) });
        const data = await res.json() as { stations: PollingStation[] };
        setStations(data.stations);
        if (data.stations[0]) setSelected(data.stations[0]);
        setLoading(false);
      },
      () => { setGeoError('Location denied. Enter your address below.'); setLoading(false); }
    );
  }, [profile]);

  const searchAddress = async () => {
    if (!address.trim() || !mapLoaded) return;
    setLoading(true);
    const g = (window as unknown as { google: typeof google }).google;
    new g.maps.Geocoder().geocode({ address: `${address}, India` }, async (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        const lat = loc.lat(), lng = loc.lng();
        setUserPos({ lat, lng });
        const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng, region: profile?.region ?? 'general' }) });
        const data = await res.json() as { stations: PollingStation[] };
        setStations(data.stations);
        if (data.stations[0]) setSelected(data.stations[0]);
      }
      setLoading(false);
    });
  };

  if (!profile) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p></div>;

  return (
    <main id="main-content" style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <a href="/chat" style={{ color: 'var(--color-primary-light)', fontSize: '0.875rem', display: 'inline-flex', gap: '4px', marginBottom: '24px', textDecoration: 'none' }}>← Back to Chat</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>📍 Find Your Polling Station</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '28px' }}>Locate your nearest polling booth and get step-by-step directions.</p>

      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={locateMe} disabled={loading} aria-label="Use GPS location">
            {loading ? 'Locating...' : '📍 Use My Location'}
          </button>
          <input type="text" className="input-field" placeholder="Or enter your address..." value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchAddress()} aria-label="Enter address" style={{ flex: 1, minWidth: '200px' }} />
          <button className="btn-secondary" onClick={searchAddress} disabled={!address.trim() || loading}>Search</button>
        </div>
        {geoError && <p style={{ color: 'var(--color-warning)', fontSize: '0.85rem', marginTop: '10px' }}>⚠️ {geoError}</p>}
      </div>

      <div id="map-canvas" className="map-container" style={{ marginBottom: '24px', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!userPos && <p style={{ color: 'var(--color-text-muted)' }}>Use location or enter address to see the map</p>}
      </div>

      {stations.map((station, i) => {
        const mode = locationService.suggestTravelMode(station.distanceKm, profile);
        const estimate = locationService.estimateTravelTime(station.distanceKm, mode);
        const mapsLink = userPos ? locationService.buildGoogleMapsDeepLink(userPos, station.location, mode) : '#';
        return (
          <div key={station.id} className="glass-card" onClick={() => setSelected(station)} style={{ padding: '20px', marginBottom: '16px', cursor: 'pointer', borderColor: selected?.id === station.id ? 'var(--color-primary)' : 'var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>P{i + 1}. {station.name}</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{station.address}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{station.distanceKm} km</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>~{estimate.durationMinutes} min</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ padding: '4px 10px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>🕖 {station.openingTime}–{station.closingTime}</span>
              <span style={{ padding: '4px 10px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{station.boothNumber}</span>
              {station.accessibleForDisabled && <span style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--color-success)' }}>♿ Accessible</span>}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: 1 }}>{estimate.reasoning}</p>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={e => e.stopPropagation()} style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex' }} aria-label={`Directions to ${station.name}`}>🗺️ Directions</a>
            </div>
          </div>
        );
      })}
    </main>
  );
}
