'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QueueScreen from '@components/queue/QueueScreen';
import { fetchFacility } from '@lib/api';

function QueuePageInner() {
  const params = useSearchParams();
  const facilityId = params.get('facilityId');

  const { data, isPending, error } = useQuery({
    queryKey: ['facility', facilityId],       // ← same key as FacilityPage = cache hit
    queryFn: ({ signal }) => fetchFacility(facilityId, { signal }),
    enabled: !!facilityId,
    staleTime: 60_000,
  });

  if (!facilityId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">No facility specified.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">
          {error?.message ?? 'Facility not found'}
        </p>
      </div>
    );
  }

  // data = { facility, queue: { reports, summary } }
  return <QueueScreen facility={data.facility} queue={data.queue} />;
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      }
    >
      <QueuePageInner />
    </Suspense>
  );
}