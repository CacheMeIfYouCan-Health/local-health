'use client';

import { useState } from 'react';
import ChipGroup from './ChipGroup';
import {
  QUEUE_TYPES,
  PEOPLE_AHEAD_PRESETS,
  QUEUE_CONFIG,
} from '@lib/queue/queueConstants';
import { checkFacilityProximity } from '@lib/queue/location';

const VERIFY_REASON_TEXT = {
  permission_denied:
    'Location permission was blocked. Check your browser settings.',
  unavailable: 'Location unavailable — signal or GPS issue.',
  timeout: 'Timed out waiting for your location. Try again.',
  out_of_range: 'You appear to be away from this facility.',
  unsupported: 'This browser does not support location.',
  no_facility_coords: 'No location set for this facility.',
  unknown: "Couldn't get your location. You can still submit.",
};

export default function QueueReportForm({
  facility,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}) {
  const [queueType, setQueueType] = useState(null);
  const [peopleAhead, setPeopleAhead] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyAttempted, setVerifyAttempted] = useState(false);
  const [verifyReason, setVerifyReason] = useState(null);

  const locked = busy || verifying;
  const canSubmit = Boolean(queueType && peopleAhead) && !locked;

  const handleToggleLocation = async () => {
    if (locationVerified) {
      setLocationVerified(false);
      setVerifyAttempted(false);
      setVerifyReason(null);
      return;
    }

    setVerifying(true);
    setVerifyAttempted(false);
    setVerifyReason(null);

    const { verified, reason } = await checkFacilityProximity(
      facility,
      QUEUE_CONFIG.verifyRadiusMeters,
    );

    setLocationVerified(verified);
    setVerifyAttempted(true);
    setVerifyReason(reason);
    setVerifying(false);
  };

  const handleSubmit = () => {
    const option = PEOPLE_AHEAD_PRESETS.find((p) => p.key === peopleAhead);
    onSubmit({ queueType, peopleAheadOption: option, locationVerified });
  };

  const verifyFailed = verifyAttempted && !locationVerified;

  const checkboxClass = verifying
    ? 'border-emerald-600 bg-emerald-50'
    : locationVerified
      ? 'border-emerald-600 bg-emerald-600 text-white'
      : verifyFailed
        ? 'border-amber-500 bg-amber-50 text-amber-700'
        : 'border-gray-300 bg-white';

  const verifyButtonClass = [
    'mt-6 flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition disabled:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
    verifying
      ? 'border-emerald-300 bg-emerald-50'
      : locationVerified
        ? 'border-emerald-400 bg-emerald-50'
        : verifyFailed
          ? 'border-amber-300 bg-amber-50'
          : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 active:bg-emerald-100',
  ].join(' ');

  const verifyLabel = verifying
    ? 'Checking location…'
    : locationVerified
      ? "Verified — you're at this facility"
      : verifyFailed
        ? "Couldn't verify your location"
        : "Verify I'm at this facility";

  const verifyHint = verifying
    ? 'Waiting for browser permission'
    : locationVerified
      ? 'Tap to remove verification'
      : verifyFailed
        ? VERIFY_REASON_TEXT[verifyReason] ??
          'You can still submit without verification'
        : 'Only a yes/no flag is shared. Your location is never sent.';

  const helperText = !canSubmit && !busy
    ? !queueType && !peopleAhead
      ? 'Pick a queue type and how many people are ahead to continue'
      : !queueType
        ? 'Pick a queue type to continue'
        : 'Pick how many people are ahead to continue'
    : null;

  return (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold text-gray-900">
        Which queue are you in?
      </p>
      <ChipGroup
        options={QUEUE_TYPES}
        value={queueType}
        onChange={setQueueType}
        disabled={locked}
      />

      <p className="mt-4 text-[15px] font-semibold text-gray-900">
        How many people ahead of you?
      </p>
      <ChipGroup
        options={PEOPLE_AHEAD_PRESETS}
        value={peopleAhead}
        onChange={setPeopleAhead}
        disabled={locked}
      />

      <button
        type="button"
        onClick={handleToggleLocation}
        disabled={locked}
        role="checkbox"
        aria-checked={locationVerified}
        className={verifyButtonClass}
      >
        <span
          className={[
            'flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 text-sm font-bold transition',
            checkboxClass,
          ].join(' ')}
        >
          {verifying ? (
            <span className="block h-3 w-3 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          ) : locationVerified ? (
            '✓'
          ) : verifyFailed ? (
            '?'
          ) : null}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-gray-900">
            {verifyLabel}
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            {verifyHint}
          </span>
        </span>
      </button>

      {helperText ? (
        <p className="mt-6 text-center text-xs text-gray-500">{helperText}</p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={[
          'mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl px-5 py-4 text-base font-bold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
          canSubmit
            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm cursor-pointer'
            : 'cursor-not-allowed bg-gray-200 text-gray-400',
        ].join(' ')}
      >
        {busy ? (
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          submitLabel
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={locked}
        className="w-full py-3 text-sm font-semibold text-gray-500 transition hover:text-gray-900 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}