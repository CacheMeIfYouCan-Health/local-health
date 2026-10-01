'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFacility } from '@lib/api';

const LEVEL_STYLES = {
  low: {
    label: 'Low',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  moderate: {
    label: 'Moderate',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  high: {
    label: 'High',
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200',
  },
  unknown: {
    label: 'No data',
    dot: 'bg-gray-400',
    chip: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

function relativeTime(iso) {
  if (!iso) return 'never';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 h ago' : `${hours} h ago`;
}

export default function QueueStatusSummary({ facilityId }) {
  const { data, isPending } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: ({ signal }) => fetchFacility(facilityId, { signal }),
    enabled: !!facilityId,
    staleTime: 60_000,
  });

  if (isPending || !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-3 w-full animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const summary = data.queue?.summary ?? {
    congestion: 'unknown',
    sampleSize: 0,
    avgWaitMinutes: null,
    lastReportedAt: null,
  };

  const level = LEVEL_STYLES[summary.congestion] ?? LEVEL_STYLES.unknown;
  const waitDisplay = summary.avgWaitMinutes ?? '—';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Current status
        </p>
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
            level.chip,
          ].join(' ')}
        >
          <span className={['h-1.5 w-1.5 rounded-full', level.dot].join(' ')} />
          {level.label}
        </span>
      </div>

      <p className="mt-2 text-4xl font-bold leading-none text-gray-900">
        {waitDisplay}
        {summary.avgWaitMinutes != null && (
          <span className="ml-1 text-base font-semibold text-gray-500">min</span>
        )}
      </p>
      <p className="mt-1 text-sm text-gray-500">average wait right now</p>

      <p className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500">
        Based on {summary.sampleSize} recent{' '}
        {summary.sampleSize === 1 ? 'report' : 'reports'} · updated{' '}
        {relativeTime(summary.lastReportedAt)}
      </p>
    </div>
  );
}