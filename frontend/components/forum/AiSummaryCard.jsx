'use client';

import { useState } from 'react';
import { relativeTime } from '@lib/forum/time';

export default function AiSummaryCard({ summary }) {
  const [open, setOpen] = useState(false);

  if (!summary) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">
          <span aria-hidden>✨ </span>AI Summary
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Appears here once a few updates have been posted.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <span aria-hidden>✨</span>AI Summary
            {summary.important && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Important
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-indigo-700/80">
            Summary of the past {summary.messageCount}{' '}
            {summary.messageCount === 1 ? 'message' : 'messages'} · {relativeTime(summary.createdAt)}
          </span>
        </span>
        <span
          aria-hidden
          className={`text-indigo-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-indigo-200/70 px-4 pb-3 pt-2.5">
            <p className="text-[15px] leading-relaxed text-slate-800">{summary.summary}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              Generated from community reports. It may be incomplete and isn&apos;t medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
