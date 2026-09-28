'use client';

import { useEffect, useState } from 'react';
import { getQueueStatus } from '@lib/queueService';
import { queueTypeLabel } from '@lib/queueConstants';

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
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 h ago' : `${hours} h ago`;
}

export default function QueueStatusSummary({ facilityId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getQueueStatus({ facilityId });
      if (!cancelled) setStatus(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  if (!status) {
    return (
      <div className="rounded-2xl bg-gray-50 p-5">
        <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-3 w-full animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const level = LEVEL_STYLES[status.congestionLevel] ?? LEVEL_STYLES.unknown;

  return (
    <div className="rounded-2xl bg-gray-50 p-5">
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
        {status.averageWaitMinutes}
        <span className="ml-1 text-base font-semibold text-gray-500">min</span>
      </p>
      <p className="mt-1 text-sm text-gray-500">average wait right now</p>

      <p className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500">
        Based on {status.sampleSize} recent{' '}
        {status.sampleSize === 1 ? 'report' : 'reports'} · updated{' '}
        {relativeTime(status.lastReportedAt)}
      </p>

      {status.breakdown?.length ? (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            By queue
          </p>
          <ul className="space-y-1.5">
            {status.breakdown.map((row) => {
              const rowLevel =
                LEVEL_STYLES[row.congestionLevel] ?? LEVEL_STYLES.unknown;
              return (
                <li
                  key={row.queueType}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        rowLevel.dot,
                      ].join(' ')}
                    />
                    {queueTypeLabel(row.queueType)}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ~{row.averageWaitMinutes} min
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}