export const QUEUE_TYPES = [
  { key: 'general', label: 'General' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'chronic', label: 'Chronic meds' },
  { key: 'maternity', label: 'Maternity' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'other', label: 'Other' },
];

// Buckets, not a free-text number. Faster to tap, honest about being an
// estimate, and `value` gives the backend a stable representative number
// for aggregation without exposing bucket boundaries to every caller.
export const PEOPLE_AHEAD_PRESETS = [
  { key: 'none', label: 'None', hint: '0', value: 0 },
  { key: '1-4', label: '1-4', hint: '', value: 2 },
  { key: '5-8', label: '5-8', hint: '', value: 6 },
  { key: '9-12', label: '9-12', hint: '', value: 10 },
  { key: '13-16', label: '13-16', hint: '', value: 14 },
  { key: '16plus', label: '16+', hint: '', value: 20 },
];

export const QUEUE_CONFIG = {
  staleAfterMs: 3 * 60 * 60 * 1000, // 3h — drop abandoned sessions
  verifyRadiusMeters: 40000,
  storageKey: 'queue.session.v1',
};

export const queueTypeLabel = (key) =>
  QUEUE_TYPES.find((t) => t.key === key)?.label ?? 'Unknown';

export const peopleAheadLabel = (bucket) =>
  PEOPLE_AHEAD_PRESETS.find((p) => p.key === bucket)?.label ?? null;