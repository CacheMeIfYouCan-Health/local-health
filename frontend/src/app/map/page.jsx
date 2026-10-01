'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import RadiusControl from '@components/map/RadiusControl';
import { fetchNearbyFacilities } from '@lib/api';
import { fetchMe } from '@lib/auth';
import MapHint from '@components/map/MapHint';

const DEFAULT_RADIUS_KM = 15;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;

const FacilityMapView = dynamic(() => import('@components/map/FacilityMapView'), {
  ssr: false,
  loading: () => <MapSkeleton message="Loading map…" />,
});

export default function FacilityMap() {
  const router = useRouter();

  /* ---- auth: 401 = guest ---- */
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });
  const signedIn = !!me;

  const [permission, setPermission] = useState('checking');
  const [location, setLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [debouncedRadius, setDebouncedRadius] = useState(DEFAULT_RADIUS_KM);
  const [activeId, setActiveId] = useState(null);

  const activeIdRef = useRef(null);

  const setActive = useCallback((id) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  /* ---- location permission ---- */
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'device',
        });
        setPermission('granted');
      },
      (err) => {
        setPermission(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radiusKm), 400);
    return () => clearTimeout(t);
  }, [radiusKm]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        if (!cancelled) setPermission('unsupported');
        return;
      }
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' });
        if (cancelled) return;
        if (status?.state === 'granted') return requestLocation();
        if (status?.state === 'denied') return setPermission('denied');
      } catch {}
      if (!cancelled) setPermission('prompt');
    })();
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  /* ---- TanStack query for facilities ---- */
  const {
    data,
    isPending,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ['facilities', location?.lat, location?.lng, debouncedRadius],
    queryFn: ({ signal }) =>
      fetchNearbyFacilities({
        lat: location.lat,
        lng: location.lng,
        radiusKm: debouncedRadius,
        signal,
      }),
    enabled: !!location,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const facilities = data?.facilities ?? [];
  const meta = data?.meta ?? null;
  const loading = isPending || isFetching;
  const error = queryError?.message ?? null;

  /* Clear selected marker when the query key changes */
  useEffect(() => {
    setActive(null);
  }, [location?.lat, location?.lng, debouncedRadius, setActive]);

  /* ---- marker + manual pick ---- */
  const handleMarkerActivate = useCallback(
    (facility) => {
      if (facility.id == null) return; // no id, no page, no forum

      if (activeIdRef.current === facility.id) {
        const target = `/facilities/${facility.id}`;
        router.push(
          signedIn ? target : `/login?next=${encodeURIComponent(target)}`
        );
        return;
      }
      setActive(facility.id);
    },
    [router, setActive, signedIn]
  );

  const handleManualPick = useCallback(({ lat, lng }) => {
    setLocation({ lat, lng, accuracy: null, source: 'manual' });
    setPermission('granted');
  }, []);

  const showGate =
    permission === 'checking' ||
    permission === 'prompt' ||
    permission === 'requesting' ||
    permission === 'denied' ||
    permission === 'unavailable' ||
    permission === 'unsupported';

  const canPickOnMap = permission === 'denied' || permission === 'unavailable';

  return (
    <div className="fixed inset-0 isolate z-0">
      <FacilityMapView
        origin={location}
        radiusKm={debouncedRadius}
        facilities={facilities}
        activeId={activeId}
        canPickOnMap={canPickOnMap}
        onMarkerActivate={handleMarkerActivate}
        onBackgroundClick={() => setActive(null)}
        onPickLocation={handleManualPick}
      />

      <MapOverlay
        permission={permission}
        loading={loading}
        error={error}
        meta={meta}
        facilityCount={facilities.length}
        origin={location}
        onRequestLocation={requestLocation}
        onRecenter={() =>
          location?.source === 'device' ? requestLocation() : undefined
        }
      />

      <MapHint state={activeId ? 'selected' : 'idle'} />

      <RadiusControl
        value={radiusKm}
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        loading={loading}
        onChange={setRadiusKm}
      />

      {showGate && (
        <PermissionGate
          permission={permission}
          onRequestLocation={requestLocation}
          onSkipToMap={() => setPermission('denied')}
        />
      )}
    </div>
  );
}

/* =================================================================
 * Overlay — status bar + recenter control
 * =============================================================== */

function MapOverlay({
  permission,
  loading,
  error,
  meta,
  facilityCount,
  origin,
  onRequestLocation,
  onRecenter,
}) {
  const subtitle = (() => {
    if (error) return error;
    if (permission === 'checking') return 'Checking location permission…';
    if (permission === 'requesting') return 'Waiting for your device location…';
    if (loading) return 'Looking for nearby facilities…';
    if (permission === 'denied') return 'Location blocked — tap the map to set your area';
    if (permission === 'unavailable') return 'No GPS fix — tap the map to set your area';
    if (facilityCount === 0) return 'No facilities found nearby';
    return `${facilityCount} facilit${facilityCount === 1 ? 'y' : 'ies'} nearby${
      origin?.source === 'manual' ? ' (pinned area)' : ''
    }${meta?.expanded ? ' — nearest results shown' : ''}`;
  })();

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200] p-4">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <span aria-hidden className="text-xl">🏥</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Healthcare near you
            </p>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      {origin?.source === 'device' && (
        <div className="absolute bottom-6 right-4 z-[1200]">
          <button
            type="button"
            onClick={onRecenter}
            aria-label="Centre map on my location"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg shadow-lg transition active:scale-95"
          >
            🎯
          </button>
        </div>
      )}
    </>
  );
}

/* =================================================================
 * Permission gate
 * =============================================================== */

function PermissionGate({ permission, onRequestLocation, onSkipToMap }) {
  if (permission === 'checking') {
    return (
      <Backdrop>
        <Spinner />
        <p className="mt-4 text-sm text-slate-600">Checking location permission…</p>
      </Backdrop>
    );
  }

  if (permission === 'requesting') {
    return (
      <Backdrop>
        <Spinner />
        <p className="mt-4 text-sm text-slate-600">
          Waiting for your device location…
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Allow access in the browser prompt.
        </p>
      </Backdrop>
    );
  }

  if (permission === 'unsupported') {
    return (
      <Backdrop>
        <div className="text-4xl">📍</div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Location not supported
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This device or browser cannot provide a location. You can still browse the
          map and tap a facility to view it.
        </p>
        <button
          type="button"
          onClick={onSkipToMap}
          className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Browse the map
        </button>
      </Backdrop>
    );
  }

  const isBlocked = permission === 'denied' || permission === 'unavailable';

  return (
    <Backdrop>
      <div className="text-4xl">🧭</div>
      <h2 className="mt-3 text-lg font-semibold text-slate-900">
        {isBlocked ? 'Location is blocked' : 'Find care near you'}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {isBlocked
          ? 'We need your location to show nearby clinics, hospitals and pharmacies. Enable location for this site in your browser settings, then try again.'
          : 'We use your device location only to find healthcare facilities near you. Your exact position is never posted publicly.'}
      </p>

      <button
        type="button"
        onClick={onRequestLocation}
        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
      >
        {isBlocked ? 'Try again' : 'Allow location access'}
      </button>

      <button
        type="button"
        onClick={onSkipToMap}
        className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-600"
      >
        Pick a location on the map instead
      </button>
    </Backdrop>
  );
}

function Backdrop({ children }) {
  return (
    <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
  );
}

function MapSkeleton({ message }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}