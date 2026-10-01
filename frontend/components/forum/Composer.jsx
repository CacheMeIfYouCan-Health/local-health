'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

const MAX = 500; // matches the body CHECK in the database

/**
 * Fixed bottom input. Returns focus to the field after sending and keeps the
 * draft if sending fails.
 */
export default function Composer({ placeholder, hint, signedIn, loginHref, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  if (!signedIn) {
    return (
      <div className="border-t border-slate-200 bg-slate-50/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        <Link
          href={loginHref}
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition active:bg-emerald-700"
        >
          Log in to post
        </Link>
        <p className="mt-1.5 text-center text-xs text-slate-500">Anyone can read the forum.</p>
      </div>
    );
  }

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText('');
      if (ref.current) ref.current.style.height = '';
    } catch (err) {
      setError(err.status === 401 ? 'Your session expired. Log in again to post.' : err.message);
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50/95 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 backdrop-blur">
      {error && <p className="mb-1.5 px-1 text-xs font-medium text-red-600">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            // Enter sends on a keyboard; Shift+Enter adds a new line.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-[15px] leading-snug text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm transition enabled:active:scale-95 disabled:bg-slate-300"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>
      {hint && <p className="mt-1 px-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
