import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Healthcare Access</h1>
      <p className="mt-2 text-sm text-gray-600">
        Find and understand local healthcare access.
      </p>

      <Link
        href="/map"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-emerald-400 hover:bg-emerald-50 active:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <span aria-hidden>🗺️</span>
        Open map
      </Link>
    </main>
  );
}