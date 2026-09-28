import Link from 'next/link';
import { listFacilities } from '@lib/queue/facilities';

export default async function Home() {
  const facilities = await listFacilities();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Healthcare Access</h1>
      <p className="mt-2 text-sm text-gray-600">
        Demo — tap a facility to open its queue screen.
      </p>

      <div className="mt-6 space-y-2">
        {facilities.map((f) => (
          <Link
            key={f.id}
            href={`/queue?facility=${f.id}`}
            className="group block rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm active:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <span className="flex items-center justify-between">
              <span className="block font-semibold text-gray-900">
                {f.name}
              </span>
              <span
                aria-hidden
                className="ml-3 text-emerald-600 opacity-0 transition group-hover:opacity-100"
              >
                →
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              {f.address}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}