'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function EmergencyClient() {
  const router = useRouter();
  const params = useSearchParams();

  const facilityName = params.get('name') ?? 'Emergency services';
  const phoneNumber = params.get('phone') ?? '10177';

  const clean = phoneNumber.replace(/\s+/g, '');

  const call = () => {
    window.location.href = `tel:${clean}`;
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-slate-50 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-lg">
            📞
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Call emergency line
            </p>
            <p className="truncate text-xs text-slate-500">{facilityName}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-4 text-center">
          <p className="text-3xl font-bold tracking-wider text-slate-900">
            {clean}
          </p>
        </div>

        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
          Your phone&apos;s dialler will open with this number ready. You still need
          to press call to connect.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={call}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Open dialler
          </button>
        </div>
      </div>
    </div>
  );
}