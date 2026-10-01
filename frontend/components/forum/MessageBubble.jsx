'use client';

import { messageTime } from '@lib/forum/time';

/**
 * One chat-style message. `verification` is only passed for Updates:
 * questions and replies never show a location badge.
 */
export default function MessageBubble({ message, mine, verification = false, onClick, footer }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={[
          'max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-left shadow-sm',
          mine
            ? 'rounded-br-md border-emerald-200 bg-emerald-50'
            : 'rounded-bl-md border-slate-200 bg-slate-50',
          onClick
            ? 'transition hover:border-slate-300 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
            : '',
        ].join(' ')}
      >
        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-tight">
          <span className="font-semibold text-slate-800">{mine ? 'You' : message.author.name}</span>
          {verification && (
            <>
              <span aria-hidden className="text-slate-300">·</span>
              {message.locationVerified ? (
                <span
                  className="font-medium text-emerald-700"
                  title="Their device location was checked when they posted: they were at this facility."
                >
                  At facility ✓
                </span>
              ) : (
                <span className="text-slate-400" title="Location could not be checked for this update.">
                  Unverified
                </span>
              )}
            </>
          )}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug text-slate-900">
          {message.content}
        </p>
        <div className="mt-1.5 flex items-center justify-end gap-2">
          {footer}
          <time dateTime={message.createdAt} className="text-[11px] text-slate-400">
            {messageTime(message.createdAt)}
          </time>
        </div>
      </Tag>
    </div>
  );
}
