'use client';

export default function ChipGroup({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.hint ? `${opt.label}, ${opt.hint}` : opt.label}
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={[
            'min-w-[72px] rounded-full border px-4 py-2 text-center text-sm font-semibold transition',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
            selected
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-900 hover:border-emerald-400 hover:bg-emerald-50 active:bg-emerald-100',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="block leading-tight">{opt.label}</span>
            {opt.hint ? (
              <span
                className={[
                  'mt-0.5 block text-[11px]',
                  selected ? 'text-white/85' : 'text-gray-500',
                ].join(' ')}
              >
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}