import L from 'leaflet';

const TYPES = {
  hospital:     { color: '#dc2626', glyph: '🏥', label: 'Hospital' },
  clinic:       { color: '#2563eb', glyph: '🏥', label: 'Clinic' },
  pharmacy:     { color: '#16a34a', glyph: '💊', label: 'Pharmacy' },
  practitioner: { color: '#9333ea', glyph: '🩺', label: 'Practitioner' },
};

const DEFAULT_TYPE = 'clinic';

export function buildMarkerIcon(type, active = false) {
  const t = TYPES[type] ?? TYPES[DEFAULT_TYPE];

  const size = active ? 56 : 44;      // bigger overall
  const ring = active ? 4 : 3;         // thicker outline when active
  const shadow = active
    ? '0 6px 16px rgba(15,23,42,0.35)'
    : '0 3px 10px rgba(15,23,42,0.25)';

  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${t.color};
      border:${ring}px solid #ffffff;
      box-shadow:${shadow};
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:${Math.round(size * 0.5)}px;
      line-height:1;
      transform:translateY(-2px);
      transition:transform 120ms ease, box-shadow 120ms ease;
    ">${t.glyph}</div>
    <div style="
      width:${size * 0.28}px;
      height:${size * 0.28}px;
      margin:-6px auto 0;
      background:${t.color};
      border-left:${ring}px solid #ffffff;
      border-bottom:${ring}px solid #ffffff;
      transform:rotate(-45deg);
      border-bottom-left-radius:3px;
    "></div>
  `;

  return L.divIcon({
    html,
    className: 'facility-marker',
    iconSize: [size, size + size * 0.28],
    iconAnchor: [size / 2, size + size * 0.28 - size * 0.18],
    popupAnchor: [0, -size],
  });
}