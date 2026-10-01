'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from '@lib/auth';
import {
  fetchForumForLocation,
  joinForum,
  leaveForum,
  postQuestion,
  postReply,
  postUpdate,
} from '@lib/forum/api';
import useForumLive, { addOnce, forumQueryKey } from '@lib/forum/useForumLive';
import AiSummaryCard from './AiSummaryCard';
import Composer from './Composer';
import ForumMenu from './ForumMenu';
import MessageBubble from './MessageBubble';
import NotificationSheet from './NotificationSheet';
import QuestionThread from './QuestionThread';

const TABS = [
  { key: 'updates', label: 'Updates' },
  { key: 'questions', label: 'Questions' },
];

/** Device position for the one-off "At facility" check; null if unavailable. */
function currentPosition() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/** Keeps a list pinned to the bottom when new messages arrive, unless the reader scrolled up. */
function useStickToBottom(count, lastIsMine) {
  // The list only mounts after the forum has loaded, so a callback ref
  // records the node (ref) and re-runs the effects once it exists (state).
  const node = useRef(null);
  const [mounted, setMounted] = useState(false);
  const nearBottom = useRef(true);
  const attach = useCallback((el) => {
    node.current = el;
    setMounted(Boolean(el));
  }, []);

  useEffect(() => {
    const el = node.current;
    if (!mounted || !el) return undefined;
    const onScroll = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [mounted]);

  useLayoutEffect(() => {
    const el = node.current;
    if (el && (nearBottom.current || lastIsMine)) el.scrollTop = el.scrollHeight;
  }, [mounted, count, lastIsMine]);

  return attach;
}

export default function ForumScreen({ locationId, initialTab, initialQuestionId }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = forumQueryKey(locationId);

  const [tab, setTab] = useState(initialTab === 'questions' ? 'questions' : 'updates');
  const [openQuestionId, setOpenQuestionId] = useState(initialQuestionId ?? null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => fetchMe({ signal }).catch(() => null),
    staleTime: 5 * 60_000,
  });

  const { data, isPending, error } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchForumForLocation(locationId, { signal }),
    staleTime: 15_000,
  });

  const forum = data?.forum;
  useForumLive(forum?.id, locationId);

  const updates = data?.updates ?? [];
  const questions = data?.questions ?? [];
  const openQuestion = questions.find((q) => q.id === openQuestionId) ?? null;

  const updatesRef = useStickToBottom(updates.length, updates.at(-1)?.author.id === me?.id);
  const questionsRef = useStickToBottom(questions.length, questions.at(-1)?.author.id === me?.id);
  const threadRef = useRef(null);

  // Reflect tab/thread in the URL so refresh and notification links land here.
  useEffect(() => {
    const params = new URLSearchParams({ facilityId: locationId });
    if (tab === 'questions') params.set('tab', 'questions');
    if (tab === 'questions' && openQuestionId) params.set('question', openQuestionId);
    window.history.replaceState(null, '', `/forum?${params}`);
  }, [locationId, tab, openQuestionId]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loginHref = `/login?next=${encodeURIComponent(
    `/forum?facilityId=${locationId}${tab === 'questions' ? '&tab=questions' : ''}`,
  )}`;

  const patchForum = useCallback(
    (fn) => queryClient.setQueryData(forumQueryKey(locationId), (old) => (old ? fn(old) : old)),
    [queryClient, locationId],
  );

  const membership = useMutation({
    mutationFn: ({ action, notificationsEnabled }) =>
      action === 'leave' ? leaveForum(forum.id) : joinForum(forum.id, notificationsEnabled),
    onSuccess: (res, { action }) => {
      patchForum((old) => ({ ...old, forum: { ...old.forum, ...res.forum } }));
      if (action === 'leave') setToast('You left this forum. Return any time from the map.');
      if (action === 'follow') setToast('Following this forum.');
    },
    onError: () => setToast('Something went wrong. Please try again.'),
  });

  const sendUpdate = async (content) => {
    const position = await currentPosition();
    const { message } = await postUpdate(forum.id, { content, ...position });
    patchForum((old) => ({ ...old, updates: addOnce(old.updates, message) }));
  };

  const sendQuestion = async (content) => {
    const { message } = await postQuestion(forum.id, content);
    patchForum((old) => ({ ...old, questions: addOnce(old.questions, message) }));
  };

  const sendReply = async (content) => {
    const { reply, replyCount } = await postReply(openQuestionId, content);
    queryClient.setQueryData(['replies', openQuestionId], (old) =>
      old ? { ...old, replies: addOnce(old.replies, reply) } : old,
    );
    patchForum((old) => ({
      ...old,
      questions: old.questions.map((q) => (q.id === openQuestionId ? { ...q, replyCount } : q)),
    }));
    requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
  };

  if (isPending) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-slate-100">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      </div>
    );
  }

  if (error || !forum) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-slate-100 p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-slate-900">Forum unavailable</p>
          <p className="mt-1 text-sm text-slate-500">{error?.message ?? 'This location could not be found.'}</p>
          <button
            type="button"
            onClick={() => router.push('/map')}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const signedIn = Boolean(me);
  const composer =
    tab === 'updates'
      ? {
          placeholder: 'Share an update about this place…',
          hint: '📍 Your location is checked once to show "At facility". It is never shared.',
          onSend: sendUpdate,
        }
      : openQuestion
        ? { placeholder: 'Write a reply…', onSend: sendReply }
        : { placeholder: 'Ask a question about this place…', onSend: sendQuestion };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100">
      {/* Top bar: back, Updates/Questions toggle, menu */}
      <header className="relative z-20 flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-2 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-slate-600 transition hover:bg-slate-200/80"
        >
          ←
        </button>
        <div role="tablist" aria-label="Forum sections" className="relative mx-auto grid w-full max-w-xs grid-cols-2 rounded-full bg-slate-200/80 p-1">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-slate-50 shadow-sm transition-transform duration-300 ease-out ${
              tab === 'questions' ? 'translate-x-full' : ''
            }`}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`relative z-10 rounded-full py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ForumMenu
          locationName={forum.location.name}
          isMember={forum.isMember}
          signedIn={signedIn}
          busy={membership.isPending}
          onLeave={() => membership.mutate({ action: 'leave' })}
          onFollow={() =>
            signedIn ? membership.mutate({ action: 'follow', notificationsEnabled: true }) : router.push(loginHref)
          }
          onNotifications={() => setShowNotifications(true)}
        />
      </header>

      {/* Sliding panels */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={`flex h-full w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none ${
            tab === 'questions' ? '-translate-x-1/2' : ''
          }`}
        >
          {/* Updates */}
          <section role="tabpanel" aria-label="Updates" className="h-full w-1/2" inert={tab !== 'updates'}>
            <div ref={updatesRef} className="h-full overflow-y-auto overscroll-contain">
              <div className="mx-auto max-w-2xl space-y-3 px-3 py-3">
                <AiSummaryCard summary={data.summary} />
                {updates.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-slate-500">
                    No updates yet. If you&apos;re here now, share what it&apos;s like: the queue, waiting
                    time, or anything others should know.
                  </p>
                ) : (
                  updates.map((m) => (
                    <MessageBubble key={m.id} message={m} mine={m.author.id === me?.id} verification />
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Questions: list, or one question's thread */}
          <section role="tabpanel" aria-label="Questions" className="relative h-full w-1/2 overflow-hidden" inert={tab !== 'questions'}>
            <div
              ref={questionsRef}
              inert={Boolean(openQuestion)}
              className={`absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-out ${
                openQuestion ? '-translate-x-full' : ''
              }`}
            >
              <div className="mx-auto max-w-2xl space-y-3 px-3 py-3">
                {questions.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-slate-500">
                    No questions yet. Ask anything before you visit: opening hours, services,
                    walk-ins.
                  </p>
                ) : (
                  questions.map((q) => (
                    <MessageBubble
                      key={q.id}
                      message={q}
                      mine={q.author.id === me?.id}
                      onClick={() => setOpenQuestionId(q.id)}
                      footer={
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {q.replyCount} {q.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                      }
                    />
                  ))
                )}
              </div>
            </div>
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out ${
                openQuestion ? '' : 'translate-x-full'
              }`}
            >
              {openQuestion && (
                <QuestionThread
                  key={openQuestion.id}
                  question={openQuestion}
                  me={me}
                  scrollRef={threadRef}
                  onBack={() => setOpenQuestionId(null)}
                />
              )}
            </div>
          </section>
        </div>

        {toast && (
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <p className="rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg">{toast}</p>
          </div>
        )}
      </main>

      <Composer
        key={tab + (openQuestion?.id ?? '')}
        signedIn={signedIn}
        loginHref={loginHref}
        {...composer}
      />

      {showNotifications && (
        <NotificationSheet
          forum={forum}
          onClose={() => setShowNotifications(false)}
          onForumNotifications={(enabled) =>
            membership.mutate({ action: 'notifications', notificationsEnabled: enabled })
          }
        />
      )}
    </div>
  );
}
