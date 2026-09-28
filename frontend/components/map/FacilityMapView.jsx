'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { buildMarkerIcon } from './markerIcons';

const SA_CENTER = [-29.0, 24.0]; // fallback: whole South Africa
const SA_ZOOM = 6;

export default function FacilityMapView({
  origin, facilities, activeId, canPickOnMap,
  onMarkerActivate, onBackgroundClick, onPickLocation,
}) {
  const center = origin ? [origin.lat, origin.lng] : SA_CENTER;
  const zoom = origin ? 13 : SA_ZOOM;

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={19}
      />

      <MapEvents onBackgroundClick={onBackgroundClick} onPickLocation={canPickOnMap ? onPickLocation : null} />
      <Recenter center={center} zoom={zoom} />

      {origin?.source === 'device' && (
        <Circle
          center={[origin.lat, origin.lng]}
          radius={origin.accuracy ?? 40}
          pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.2 }}
        />
      )}

      {facilities.map((f) => (
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

function MarkerItem({ facility, isActive, onActivate }) {
  const ref = useRef(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    isActive ? m.openPopup() : m.closePopup();
  }, [isActive]);

  return (
    <Marker
      ref={ref}
      position={[facility.latitude, facility.longitude]}
      icon={buildMarkerIcon(facility.type, isActive)}
      eventHandlers={{ click: () => onActivate(facility) }}
    >
      <Popup closeButton={false} offset={[0, -18]} autoPan>
        <span className="block whitespace-nowrap text-[13px] font-semibold text-slate-900">
          {facility.name}
        </span>
      </Popup>
    </Marker>
  );
}

function MapEvents({ onBackgroundClick, onPickLocation }) {
  useMapEvents({
    click(e) {
      if (onPickLocation) onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      else onBackgroundClick?.();
    },
  });
  return null;
}

function Recenter({ center, zoom }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}