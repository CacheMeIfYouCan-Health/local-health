'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { buildMarkerIcon } from './markerIcons';

const SA_CENTER = [-29.0, 24.0]; // fallback view: whole South Africa
const SA_ZOOM = 6;

const KM_PER_DEG_LAT = 111.0;

export default function FacilityMapView({
  origin,
  radiusKm = 15,
  facilities,
  activeId,
  canPickOnMap,
  onMarkerActivate,
  onBackgroundClick,
  onPickLocation,
}) {
  const center = useMemo(
    () => (origin ? [origin.lat, origin.lng] : SA_CENTER),
    [origin?.lat, origin?.lng]
  );
  const zoom = origin ? 13 : SA_ZOOM;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={19}
      />

      <MapEvents
        onBackgroundClick={onBackgroundClick}
        onPickLocation={canPickOnMap ? onPickLocation : null}
      />

      {/* Auto-fit to the radius circle whenever origin or radius changes */}
      {origin && <FitToRadius origin={origin} radiusKm={radiusKm} />}

      {origin?.source === 'device' && (
        <Circle
          center={[origin.lat, origin.lng]}
          radius={origin.accuracy ?? 40}
          pathOptions={{
            color: '#2563eb',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          }}
        />
      )}

      {/* Visual radius circle (added in Task 3, but harmless to include now) */}
      {origin && (
        <Circle
          center={[origin.lat, origin.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#2563eb',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
          }}
        />
      )}

      {facilities
        .filter((f) => Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
        .map((f) => (
          <MarkerItem
            key={f.id}
            facility={f}
            isActive={activeId === f.id}
            onActivate={onMarkerActivate}
          />
        ))}
    </MapContainer>
  );
}

/* =================================================================
 * Marker
 * =============================================================== */

function MarkerItem({ facility, isActive, onActivate }) {
  const ref = useRef(null);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    if (isActive) m.openPopup();
    else m.closePopup();
  }, [isActive]);

  return (
    <Marker
      ref={ref}
      position={[facility.latitude, facility.longitude]}
      icon={buildMarkerIcon(facility.type, isActive)}
      eventHandlers={{ click: () => onActivate(facility) }}
    >
      <Popup
        closeButton={false}
        offset={[0, -30]}
        autoPan
        maxWidth={260}
        minWidth={230}
      >
        <FacilityPreviewCard
          facility={facility}
          onOpen={() => onActivate(facility)}
        />
      </Popup>
    </Marker>
  );
}

/* =================================================================
 * Auto-fit
 * =============================================================== */

/**
 * Fits the map so the entire radius circle around the origin is visible.
 * A Circle's bounds are origin ± radius (in degrees), which is a cheap,
 * accurate-enough calculation for radii up to ~50 km.
 */
function FitToRadius({ origin, radiusKm }) {
  const map = useMap();
  const lastKey = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(origin?.lat) || !Number.isFinite(origin?.lng)) return;
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) return;

    // Avoid re-fitting when neither origin nor radius actually changed
    const key = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)},${radiusKm}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const dLat = radiusKm / KM_PER_DEG_LAT;
    const dLng = radiusKm / (KM_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180));

    const bounds = L.latLngBounds(
      [origin.lat - dLat, origin.lng - dLng],
      [origin.lat + dLat, origin.lng + dLng]
    );

    map.fitBounds(bounds, {
      padding: [40, 40],       // a little breathing room around the circle
      animate: true,
      duration: 0.6,
      maxZoom: 15,             // don't zoom in absurdly for tiny radii
    });
  }, [map, origin?.lat, origin?.lng, radiusKm]);

  return null;
}

/* =================================================================
 * Map events
 * =============================================================== */

function MapEvents({ onBackgroundClick, onPickLocation }) {
  useMapEvents({
    click(e) {
      if (onPickLocation) onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      else onBackgroundClick?.();
    },
  });
  return null;
}

function FacilityPreviewCard({ facility, onOpen }) {
  const queue = facility.queue ?? {
    congestion: 'unknown',
    avgWaitMinutes: null,
    sampleSize: 0,
  };
  const distance = Number.isFinite(facility.distanceKm)
    ? `${facility.distanceKm.toFixed(1)} km`
    : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="block w-full cursor-pointer text-left"
    >
      <p className="text-sm font-semibold leading-snug text-slate-900">
        {facility.name}
      </p>

      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        <span>{facility.type}</span>
        {distance && (
          <>
            <span aria-hidden>·</span>
            <span>{distance}</span>
          </>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
        <QueuePill level={queue.congestion} />
        <span className="text-xs text-slate-600">
          {queue.avgWaitMinutes != null
            ? `~${queue.avgWaitMinutes} min wait`
            : 'No recent reports'}
        </span>
      </div>

      <p className="mt-2 text-[11px] font-medium text-blue-600">
        Tap the pin again for more →
      </p>
    </button>
  );
}

function QueuePill({ level }) {
  const styles = {
    low: 'bg-emerald-100 text-emerald-700',
    moderate: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-600',
  };
  const labels = {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    unknown: 'Unknown',
  };
  const cls = styles[level] ?? styles.unknown;
  const label = labels[level] ?? labels.unknown;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}