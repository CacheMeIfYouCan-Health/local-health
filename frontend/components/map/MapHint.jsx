'use client';

import { useEffect, useState } from 'react';

const HINTS = {
  idle: {
    icon: '👆',
    title: 'Explore facilities nearby',
    body: 'Tap any pin to see details. Adjust the search radius at the bottom.',
  },
  selected: {
    icon: '📍',
    title: 'Facility selected',
    body: 'Tap the same pin again for full details — queue, directions, emergency call and forum.',
  },
};

export default function MapHint({ state = 'idle', autoHideMs = 6000 }) {
  const [visible, setVisible] = useState(false);
  // Remember what the user has dismissed so we don't nag again
  const [dismissed, setDismissed] = useState({ idle: false, selected: false });

  useEffect(() => {
    if (dismissed[state]) return;

    setVisible(true);
    const t = setTimeout(() => setVisible(false), autoHideMs);
    return () => clearTimeout(t);
  }, [state, dismissed, autoHideMs]);

  const hint = HINTS[state] ?? HINTS.idle;

  return (
    <div
      className={`
        pointer-events-none absolute inset-x-0 top-24 z-[1150] mx-auto flex max-w-sm px-4
        transition-all duration-300
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
      `}
    >
      <div className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur">
        <span aria-hidden className="mt-0.5 text-lg">
          {hint.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{hint.title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
            {hint.body}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss hint"
          onClick={() => {
            setDismissed((d) => ({ ...d, [state]: true }));
            setVisible(false);
          }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}