'use client';

import { useEffect, useRef, useState } from 'react';

/** Small "⋯" menu: follow/leave and notification settings, nothing else. */
export default function ForumMenu({ locationName, isMember, signedIn, busy, onLeave, onFollow, onNotifications }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const item = 'block w-full px-4 py-3 text-left text-[15px] transition hover:bg-slate-100 disabled:opacity-50';
  const choose = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Forum options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full text-xl leading-none text-slate-600 transition hover:bg-slate-200/80"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl"
        >
          <p className="truncate border-b border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            Forum for {locationName}
          </p>
          {signedIn && (
            <button type="button" role="menuitem" className={`${item} text-slate-800`} onClick={choose(onNotifications)}>
              Notification settings
            </button>
          )}
          {signedIn && isMember && (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className={`${item} font-medium text-red-600`}
              onClick={choose(onLeave)}
            >
              Leave forum
            </button>
          )}
          {(!signedIn || !isMember) && (
            <button type="button" role="menuitem" disabled={busy} className={`${item} text-slate-800`} onClick={choose(onFollow)}>
              Follow this forum
            </button>
          )}
        </div>
      )}
    </div>
  );
}
