import { Suspense } from 'react';
import EmergencyClient from './EmergencyClient';

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-50">Loading…</div>}>
      <EmergencyClient />
    </Suspense>
  );
}