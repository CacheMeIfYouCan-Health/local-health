/** "just now", "5 min ago", "3 h ago", "2 days ago", or a date for older items. */
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return 'never';
  const sec = Math.max(0, Math.round((now - ts) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export const FACILITY_TYPES = {
  hospital: { label: 'Hospital', plural: 'Hospitals', icon: 'medkit' },
  clinic: { label: 'Clinic', plural: 'Clinics', icon: 'medical' },
  pharmacy: { label: 'Pharmacy', plural: 'Pharmacies', icon: 'bandage' },
  practitioner: { label: 'Doctor', plural: 'Doctors', icon: 'person' },
};

export function facilityTypeLabel(type) {
  return FACILITY_TYPES[type]?.label ?? 'Facility';
}

/**
 * Parse a time typed by the user into "HH:MM" (24 h), or null if invalid.
 * Accepts "8:00", "08:00", "0800", "8.00", "8h00" and "8".
 */
export function parseTime(input) {
  const t = String(input ?? '').trim().toLowerCase();
  const m = t.match(/^(\d{1,2})(?:[:.h]?(\d{2}))?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = m[2] != null ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
