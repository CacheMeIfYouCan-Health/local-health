'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchFacility } from '@lib/api';

const QUEUE_STYLES = {
  low:      { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  moderate: { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
  high:     { bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200' },
  unknown:  { bg: 'bg-slate-50',   text: 'text-slate-600',   ring: 'ring-slate-200' },
};

export default function FacilityPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [live, setLive] = useState(null);

  const { data, isPending, error } = useQuery({
    queryKey: ['facility', id],
    queryFn: ({ signal }) => fetchFacility(id, { signal }),
    enabled: !!id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLive({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLive(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

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
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-slate-900">Facility not found</p>
          <p className="mt-1 text-sm text-slate-500">{error?.message}</p>
          <button
            onClick={() => router.push('/map')}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const { facility, queue } = data;
  const congestion = queue?.summary?.congestion ?? 'unknown';
  const styles = QUEUE_STYLES[congestion] ?? QUEUE_STYLES.unknown;
  const waitMin = queue?.summary?.avgWaitMinutes ?? null;

  const handleDirections = () => {
    const dest = `${facility.latitude},${facility.longitude}`;
    const url = live
      ? `https://www.google.com/maps/dir/?api=1&origin=${live.lat},${live.lng}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmergencyCall = () => {
    const number = facility.emergencyPhone || '10177';
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-slate-600"
        >
          <span aria-hidden>←</span> Back
        </button>
        <h1 className="mt-1 truncate text-lg font-semibold text-slate-900">
          {facility.name}
        </h1>
        <p className="truncate text-xs text-slate-500">
          {facility.type} · {facility.address}
        </p>
      </header>

      {/* Cards */}
      <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <ActionCard
          title="Queue status"
          icon="⏱"
          accent="blue"
          onClick={() => router.push(`/queue?facilityId=${facility.id}`)}
        >
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ${styles.bg} ${styles.text} ${styles.ring}`}>
            <span className="text-xs font-semibold uppercase tracking-wide">
              {congestion}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {waitMin != null
              ? `Estimated wait ~${waitMin} min`
              : 'No recent reports'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {queue?.summary?.sampleSize ?? 0} recent report
            {(queue?.summary?.sampleSize ?? 0) === 1 ? '' : 's'}
          </p>
        </ActionCard>

        <ActionCard
          title="Directions"
          icon="🧭"
          accent="green"
          onClick={handleDirections}
        >
          <p className="text-sm text-slate-600">
            Open Google Maps
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {live ? 'From your current location' : 'Enter your origin in Maps'}
          </p>
        </ActionCard>

        <ActionCard
          title="Emergency call"
          icon="📞"
          accent="red"
          onClick={handleEmergencyCall}
        >
          <p className="text-sm text-slate-600">
            {facility.emergencyPhone || '10177 (National emergency)'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Opens your phone dialler
          </p>
        </ActionCard>

        <ActionCard
          title="Community forum"
          icon="💬"
          accent="purple"
          onClick={() => router.push(`/forum?facilityId=${facility.id}`)}
        >
          <p className="text-sm text-slate-600">
            Ask, share and confirm updates
          </p>
          <p className="mt-1 text-xs text-slate-400">
            With people near {facility.name}
          </p>
        </ActionCard>
      </main>
    </div>
  );
}

function ActionCard({ title, icon, accent, onClick, children }) {
  const accents = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  const cls = accents[accent] ?? accents.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98] hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${cls}`}>
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <div className="mt-3">{children}</div>
    </button>
  );
}