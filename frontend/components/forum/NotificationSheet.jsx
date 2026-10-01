'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationPreferences, saveNotificationPreferences } from '@lib/forum/api';
import { enablePush, pushSupported } from '@lib/forum/push';

const INTERVAL_LABELS = { 60: 'Every hour', 90: 'Every 90 min', 120: 'Every 2 hours' };

function Toggle({ label, description, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-slate-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export default function NotificationSheet({ forum, onClose, onForumNotifications }) {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState(() =>
    pushSupported() ? Notification.permission : 'unsupported',
  );
  const [pushError, setPushError] = useState(null);

  const { data } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: ({ signal }) => fetchNotificationPreferences({ signal }),
  });
  const prefs = data?.preferences;
  const vapidKey = data?.vapidPublicKey;

  const save = useMutation({
    mutationFn: saveNotificationPreferences,
    onSuccess: (res) =>
      queryClient.setQueryData(['notification-preferences'], (old) => ({ ...old, preferences: res.preferences })),
  });
  const update = (patch) => save.mutate(patch);

  const turnOnPush = async () => {
    setPushError(null);
    try {
      setPermission(await enablePush(vapidKey));
    } catch {
      setPushError('Could not turn on notifications in this browser.');
    }
  };

  const serverReady = Boolean(vapidKey);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notification settings"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-slate-50 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-200">
            Done
          </button>
        </div>

        {!serverReady && data && (
          <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
            Browser notifications aren&apos;t set up on this server yet.
          </p>
        )}
        {serverReady && permission !== 'granted' && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm text-emerald-900">
              {permission === 'denied'
                ? 'Notifications are blocked for this site. Allow them in your browser settings.'
                : permission === 'unsupported'
                  ? "This browser doesn't support notifications."
                  : 'Turn on browser notifications to receive these alerts.'}
            </p>
            {permission === 'default' && (
              <button
                type="button"
                onClick={turnOnPush}
                className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Turn on notifications
              </button>
            )}
            {pushError && <p className="mt-1 text-xs text-red-600">{pushError}</p>}
          </div>
        )}

        <div className="mt-2 divide-y divide-slate-200">
          <Toggle
            label="This forum"
            description={forum.isMember ? 'Include this place in your notifications.' : 'Follow this forum to get its notifications.'}
            checked={forum.isMember && forum.notificationsEnabled}
            onChange={onForumNotifications}
          />
          {prefs && (
            <>
              <div>
                <Toggle
                  label="AI summary digest"
                  description="A periodic summary of forums you follow, instead of a ping for every message."
                  checked={prefs.aiSummaryEnabled}
                  onChange={(v) => update({ aiSummaryEnabled: v })}
                />
                {prefs.aiSummaryEnabled && (
                  <div className="flex flex-wrap gap-2 pb-1" role="radiogroup" aria-label="How often">
                    {(data.intervals ?? [60, 90, 120]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={prefs.aiSummaryInterval === m}
                        onClick={() => update({ aiSummaryInterval: m })}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          prefs.aiSummaryInterval === m
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-slate-100 text-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {INTERVAL_LABELS[m] ?? `${m} min`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Toggle
                label="Replies to my questions"
                checked={prefs.questionReplyEnabled}
                onChange={(v) => update({ questionReplyEnabled: v })}
              />
              <Toggle
                label="Important updates"
                description="When a summary flags a big change, like a closure or medicine out of stock."
                checked={prefs.importantUpdateEnabled}
                onChange={(v) => update({ importantUpdateEnabled: v })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
