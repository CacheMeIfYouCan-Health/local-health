import L from 'leaflet';

const COLORS = {
  hospital: '#dc2626',
  clinic: '#2563eb',
  pharmacy: '#16a34a',
  practitioner: '#9333ea',
};

export function buildMarkerIcon(type = 'clinic', active = false) {
  const color = COLORS[type] ?? COLORS.clinic;
  const size = active ? 34 : 26;
  const ring = active ? '#0f172a' : '#ffffff';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="${ring}" stroke-width="2"/>
      <path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}