'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchReplies } from '@lib/forum/api';
import MessageBubble from './MessageBubble';

/** A question with its replies, shown in place of the question list. */
export default function QuestionThread({ question, me, onBack, scrollRef }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['replies', question.id],
    queryFn: ({ signal }) => fetchReplies(question.id, { signal }),
  });
  const replies = data?.replies ?? [];

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-slate-200/70"
        >
          ← All questions
        </button>
      </div>
      <div className="space-y-3 px-3 py-4">
        <MessageBubble message={question} mine={question.author.id === me?.id} />
        <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </p>
        {isPending && <p className="px-1 text-sm text-slate-500">Loading replies…</p>}
        {error && <p className="px-1 text-sm text-red-600">Couldn&apos;t load replies.</p>}
        {!isPending && replies.length === 0 && (
          <p className="px-1 text-sm text-slate-500">No replies yet. Know the answer? Reply below.</p>
        )}
        {replies.map((r) => (
          <MessageBubble key={r.id} message={r} mine={r.author.id === me?.id} />
        ))}
      </div>
    </div>
  );
}
