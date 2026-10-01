'use client';

import { useEffect, useState } from 'react';

// Sits just above the radius control and never takes pointer events, so on a
// phone it can't cover or swallow a tap meant for a facility pin. It only
// shows in the idle state: once a pin is selected its popup already says
// "Tap the pin again for more".
export default function MapHint({ state = 'idle', autoHideMs = 5000 }) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExpired(true), autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs]);

  const visible = state === 'idle' && !expired;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute bottom-[132px] left-4 right-20 z-[1150] mx-auto max-w-sm transition-all duration-300 sm:right-4 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900/90 px-3.5 py-2.5 text-white shadow-lg">
        <span aria-hidden className="text-base">👆</span>
        <p className="text-xs leading-snug text-slate-100">
          Tap a pin to preview a facility, then tap it again for details.
        </p>
      </div>
    </div>
  );
}
