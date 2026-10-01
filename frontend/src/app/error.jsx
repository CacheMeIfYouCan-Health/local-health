'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Without a boundary, one bad render (e.g. an unexpected facility shape)
// blanked the whole app. This keeps the failure contained and recoverable.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-slate-50 p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
        <p className="mt-1 text-sm text-slate-500">
          This page hit an unexpected problem. Your data is safe.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/map"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Back to map
          </Link>
          <button
            type="button"
            onClick={() => retry()}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
