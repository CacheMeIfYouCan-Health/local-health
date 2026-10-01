'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@lib/auth';
import * as f from '@lib/forum';

const same = (a, b) => String(a) === String(b);
const time = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Spinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
    </div>
  );
}

function Composer({ placeholder, onSend }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await onSend(body);
      setText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <button
        disabled={busy || !text.trim()}
        className="rounded-xl bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}

function Forum({ facilityId, myId }) {
  const router = useRouter();
  const [tab, setTab] = useState('updates');
  const [updates, setUpdates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [replies, setReplies] = useState({});
  const [open, setOpen] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    f.getUpdates(facilityId).then(setUpdates).catch(() => {});
    f.getQuestions(facilityId).then(setQuestions).catch(() => {});

    const s = f.getSocket();
    const join = () => s.emit('join', facilityId);
    const addUnique = (list, item) =>
      list.some((x) => same(x.id, item.id)) ? list : [...list, item];

    const onUpdate = (u) => setUpdates((l) => addUnique(l, u));
    const onQuestion = (q) =>
      setQuestions((l) => (l.some((x) => same(x.id, q.id)) ? l : [q, ...l]));
    const onReply = ({ questionId, reply, replyCount }) => {
      setReplies((r) =>
        r[questionId] ? { ...r, [questionId]: addUnique(r[questionId], reply) } : r
      );
      setQuestions((l) =>
        l.map((q) => (same(q.id, questionId) ? { ...q, reply_count: replyCount } : q))
      );
    };

    s.on('connect', join);
    s.on('update:new', onUpdate);
    s.on('question:new', onQuestion);
    s.on('reply:new', onReply);
    if (s.connected) join();

    return () => {
      s.emit('leave', facilityId);
      s.off('connect', join);
      s.off('update:new', onUpdate);
      s.off('question:new', onQuestion);
      s.off('reply:new', onReply);
    };
  }, [facilityId]);

  useEffect(() => {
    if (tab === 'updates') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates.length, tab]);

  async function toggle(q) {
    if (same(open, q.id)) return setOpen(null);
    setOpen(q.id);
    if (!replies[q.id]) {
      const rows = await f.getReplies(q.id).catch(() => []);
      setReplies((r) => ({ ...r, [q.id]: rows }));
    }
  }

  async function sendReply(q, body) {
    const reply = await f.postReply(q.id, body);
    setReplies((r) => {
      const list = r[q.id] || [];
      return list.some((x) => same(x.id, reply.id))
        ? r
        : { ...r, [q.id]: [...list, reply] };
    });
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-4 pt-3">
          <button onClick={() => router.back()} className="text-sm text-slate-500">
            ← Back
          </button>
          <h1 className="text-base font-semibold text-slate-900">Forum</h1>
        </div>
        <div className="mt-2 flex">
          {['updates', 'questions'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 border-b-2 py-2 text-sm font-medium capitalize ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'updates' ? (
        <>
          <main className="flex-1 space-y-2 overflow-y-auto p-4">
            {updates.length === 0 && (
              <p className="pt-10 text-center text-sm text-slate-400">No updates yet.</p>
            )}
            {updates.map((u) => {
              const mine = same(u.user_id, myId);
              return (
                <div key={u.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm'
                    }`}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-xs font-medium text-slate-500">{u.name}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{u.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                      {time(u.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </main>
          <Composer
            placeholder="Share an update…"
            onSend={async (body) => {
              const u = await f.postUpdate(facilityId, body);
              setUpdates((l) => (l.some((x) => same(x.id, u.id)) ? l : [...l, u]));
            }}
          />
        </>
      ) : (
        <>
          <main className="flex-1 space-y-3 overflow-y-auto p-4">
            {questions.length === 0 && (
              <p className="pt-10 text-center text-sm text-slate-400">No questions yet.</p>
            )}
            {questions.map((q) => {
              const isOpen = same(open, q.id);
              return (
                <div key={q.id} className="rounded-2xl bg-white shadow-sm">
                  <button onClick={() => toggle(q)} className="w-full p-3 text-left">
                    <p className="text-xs font-medium text-slate-500">{q.name}</p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">
                      {q.body}
                    </p>
                    <p className="mt-2 text-xs font-medium text-blue-600">
                      {q.reply_count} {q.reply_count === 1 ? 'reply' : 'replies'}{' '}
                      {isOpen ? '▲' : '▼'}
                    </p>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100">
                      <div className="space-y-2 p-3">
                        {(replies[q.id] || []).map((r) => (
                          <div key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                            <p className="text-xs font-medium text-slate-500">
                              {r.name} · {time(r.created_at)}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-slate-800">
                              {r.body}
                            </p>
                          </div>
                        ))}
                        {replies[q.id]?.length === 0 && (
                          <p className="text-xs text-slate-400">No replies yet.</p>
                        )}
                      </div>
                      <Composer placeholder="Write a reply…" onSend={(b) => sendReply(q, b)} />
                    </div>
                  )}
                </div>
              );
            })}
          </main>
          <Composer
            placeholder="Ask a question…"
            onSend={async (body) => {
              const q = await f.postQuestion(facilityId, body);
              setQuestions((l) => (l.some((x) => same(x.id, q.id)) ? l : [q, ...l]));
            }}
          />
        </>
      )}
    </div>
  );
}

function ForumGate() {
  const router = useRouter();
  const params = useSearchParams();
  const facilityId = params.get('facilityId');

  const { data: me, isPending, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      const next = `/forum?facilityId=${encodeURIComponent(facilityId ?? '')}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isError, facilityId, router]);

  if (!facilityId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">No facility specified.</p>
      </div>
    );
  }
  if (isPending || isError) return <Spinner />;

  return <Forum facilityId={facilityId} myId={me?.user?.id ?? me?.id} />;
}

export default function ForumPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ForumGate />
    </Suspense>
  );
}