'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useQueueSession from '@lib/queue/useQueueSession';
import QueueReportForm from './QueueReportForm';
import { formatDuration, formatClock } from '@lib/queue/time';
import { queueTypeLabel, peopleAheadLabel } from '@lib/queue/queueConstants';
import QueueStatusSummary from './QueueStatusSummary';

function Card({ children }) {
  return <div className="rounded-2xl bg-gray-50 p-5">{children}</div>;
}

function PrimaryButton({ onClick, disabled, busy, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl px-5 py-4 text-base font-bold text-white transition',
        disabled
          ? 'cursor-not-allowed bg-gray-200'
          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm cursor-pointer',
      ].join(' ')}
    >
      {busy ? (
        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        children
      )}
    </button>
  );
}

function SecondaryButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-emerald-400 hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {children}
    </button>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between border-t border-gray-200 py-2 first:border-t-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={[
          'text-sm font-semibold',
          accent ? 'text-blue-700' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export default function QueueScreen({ facility }) {
  const {
    status,
    session,
    elapsedMs,
    error,
    clearError,
    checkIn,
    checkOut,
    discardSession,
    submitQuickReport,
  } = useQueueSession(facility);

  const [mode, setMode] = useState('overview'); // 'overview' | 'checkin' | 'report'
  const [summaryMinutes, setSummaryMinutes] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const router = useRouter();

  const busy = status === 'checking_in' || status === 'checking_out';

  const handleCheckIn = async (payload) => {
    const ok = await checkIn(payload);
    if (ok) {
      setMode('overview');
      setConfirmation('Checked in');
    }
  };

  const handleQuickReport = async (payload) => {
    const ok = await submitQuickReport(payload);
    if (ok) {
      setMode('overview');
      setConfirmation('Report submitted — thanks');
    }
  };

  const handleCheckOut = async () => {
    const waitMinutes = await checkOut();
    if (waitMinutes !== null) setSummaryMinutes(waitMinutes);
  };

  const renderBody = () => {
    if (mode === 'checkin') {
      return (
        <QueueReportForm
          facility={facility}
          submitLabel="Check in"
          busy={status === 'checking_in'}
          onSubmit={handleCheckIn}
          onCancel={() => setMode('overview')}
        />
      );
    }

    if (mode === 'report') {
      return (
        <QueueReportForm
          facility={facility}
          submitLabel="Submit report"
          busy={false}
          onSubmit={handleQuickReport}
          onCancel={() => setMode('overview')}
        />
      );
    }

    if (summaryMinutes !== null) {
      return (
        <div className="space-y-3">
          <QueueStatusSummary facilityId={facility.id} />
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Visit recorded
            </p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {summaryMinutes === 0 ? '< 1 min' : `${summaryMinutes} min`}
            </p>
            <p className="mt-2 text-sm leading-5 text-gray-500">
              Thanks — this helps everyone else plan their trip.
            </p>
            <PrimaryButton onClick={() => setSummaryMinutes(null)}>
              Done
            </PrimaryButton>
          </Card>
        </div>
      );
    }

    if (status === 'checked_in' && session) {
      return (
        <div className="space-y-3">
          <QueueStatusSummary facilityId={facility.id} />
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              You&apos;ve been waiting
            </p>
            <p className="mb-5 mt-2 text-[44px] font-bold leading-none text-gray-900">
              {formatDuration(elapsedMs)}
            </p>

            <div className="border-t border-gray-200">
              <Row label="Checked in" value={formatClock(session.checkInAt)} />
              <Row label="Queue" value={queueTypeLabel(session.queueType)} />
              {peopleAheadLabel(session.peopleAheadBucket) ? (
                <Row
                  label="People ahead"
                  value={peopleAheadLabel(session.peopleAheadBucket)}
                />
              ) : null}
              {session.locationVerified ? (
                <Row label="Location" value="Verified" accent />
              ) : null}
            </div>

            <PrimaryButton
              onClick={handleCheckOut}
              busy={busy}
              disabled={busy}
            >
              Check out
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setMode('report')}
              disabled={busy}
            >
              Post a queue update
            </SecondaryButton>
            <button
              type="button"
              onClick={discardSession}
              disabled={busy}
              className="mt-3 w-full py-3 text-sm font-semibold text-gray-500 transition hover:text-red-600 disabled:opacity-50 cursor-pointer"
            >
              Cancel check-in
            </button>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <QueueStatusSummary facilityId={facility.id} />

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Add your report
          </p>
          <p className="mb-5 mt-2 text-[15px] leading-6 text-gray-500">
            Check in to time your visit, or send a quick update.
          </p>
          <PrimaryButton onClick={() => setMode('checkin')}>
            Check in
          </PrimaryButton>
          <SecondaryButton onClick={() => setMode('report')}>
            Quick report
          </SecondaryButton>
        </Card>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-6">
        <header className="mb-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-block py-2 text-[15px] font-semibold text-emerald-600"
        >
          ← Back
        </button>
        <h1 className="mt-1 text-[22px] font-bold leading-tight text-gray-900">
          {facility.name}
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">{facility.address}</p>
      </header>

      {confirmation ? (
        <button
          type="button"
          onClick={() => setConfirmation(null)}
          className="mb-3 w-full rounded-xl bg-emerald-50 p-3 text-left text-[13px] font-semibold text-emerald-700"
        >
          {confirmation}
        </button>
      ) : null}

      {error ? (
        <button
          type="button"
          onClick={clearError}
          className="mb-3 w-full rounded-xl bg-red-50 p-3 text-left text-[13px] font-semibold text-red-700"
        >
          {error}
        </button>
      ) : null}

      {status === 'loading' ? (
        <div className="flex justify-center py-16">
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600/30 border-t-emerald-600" />
        </div>
      ) : (
        renderBody()
      )}
    </main>
  );
}