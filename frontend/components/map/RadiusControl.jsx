'use client';

export default function RadiusControl({
  value,
  min = 1,
  max = 50,
  step = 1,
  loading = false,
  onChange,
}) {
  return (
    <div
      className="absolute bottom-6 left-4 right-4 z-[1200] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-50/95 p-4 shadow-lg backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Search radius
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {value} km
          {loading && (
            <span className="ml-2 text-xs font-normal text-slate-400">updating…</span>
          )}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Search radius in kilometres"
        className="radius-slider w-full"
        style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
      />

      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
        <span>{min} km</span>
        <span>{Math.round((min + max) / 2)} km</span>
        <span>{max} km</span>
      </div>
    </div>
  );
}