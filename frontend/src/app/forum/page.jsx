'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ForumScreen from '@components/forum/ForumScreen';

function ForumPageInner() {
  const params = useSearchParams();
  const facilityId = params.get('facilityId');

  if (!facilityId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <p className="text-sm text-slate-500">Pick a facility on the map to open its forum.</p>
      </div>
    );
  }

  return (
    <ForumScreen
      key={facilityId}
      locationId={facilityId}
      initialTab={params.get('tab')}
      initialQuestionId={params.get('question')}
    />
  );
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-100">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
        </div>
      }
    >
      <ForumPageInner />
    </Suspense>
  );
}
