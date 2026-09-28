'use client';

import { useCallback, useEffect, useState } from 'react';
import * as queueService from './queueService';
import { QUEUE_CONFIG } from './queueConstants';

/**
 * Status: 'loading' | 'idle' | 'checking_in' | 'checked_in' | 'checking_out'
 *
 * Session is persisted in localStorage so the timer survives a reload.
 * A session belongs to one facility only — visiting another facility's page
 * leaves the old session in storage but does not surface it here.
 */
export default function useQueueSession(facility) {
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [now, setNow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = window.localStorage.getItem(QUEUE_CONFIG.storageKey);
        if (cancelled) return;

        if (!raw) {
          setStatus('idle');
          return;
        }

        const saved = JSON.parse(raw);

        if (saved?.facilityId !== facility.id) {
          setStatus('idle');
          return;
        }

        const age = Date.now() - new Date(saved.checkInAt).getTime();
        if (age > QUEUE_CONFIG.staleAfterMs) {
          window.localStorage.removeItem(QUEUE_CONFIG.storageKey);
          if (!cancelled) setStatus('idle');
          return;
        }

        setSession(saved);
        setNow(Date.now());
        setStatus('checked_in');
      } catch {
        if (!cancelled) setStatus('idle');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [facility.id]);

  useEffect(() => {
    if (status !== 'checked_in') return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const elapsedMs =
    session && now ? Math.max(0, now - new Date(session.checkInAt).getTime()) : 0;

  const checkIn = useCallback(
    async ({ queueType, peopleAheadOption, locationVerified }) => {
      setError(null);
      setStatus('checking_in');
      try {
        const created = await queueService.checkIn({
          facilityId: facility.id,
          queueType,
          peopleAhead: peopleAheadOption?.value ?? null,
          peopleAheadBucket: peopleAheadOption?.key ?? null,
          locationVerified,
        });
        window.localStorage.setItem(
          QUEUE_CONFIG.storageKey,
          JSON.stringify(created),
        );
        setSession(created);
        setNow(Date.now());
        setStatus('checked_in');
        return true;
      } catch {
        setError('Could not check in. Please try again.');
        setStatus('idle');
        return false;
      }
    },
    [facility.id],
  );

  const checkOut = useCallback(async () => {
    if (!session) return null;
    setError(null);
    setStatus('checking_out');
    try {
      const result = await queueService.checkOut({
        facilityId: facility.id,
        sessionId: session.sessionId,
        checkInAt: session.checkInAt,
      });
      window.localStorage.removeItem(QUEUE_CONFIG.storageKey);
      setSession(null);
      setStatus('idle');
      return result.waitMinutes;
    } catch {
      setError('Could not check out. Your timer is still running.');
      setStatus('checked_in');
      return null;
    }
  }, [facility.id, session]);

  const discardSession = useCallback(async () => {
    window.localStorage.removeItem(QUEUE_CONFIG.storageKey);
    setSession(null);
    setError(null);
    setStatus('idle');
  }, []);

  const submitQuickReport = useCallback(
    async ({ queueType, peopleAheadOption, locationVerified }) => {
      setError(null);
      try {
        await queueService.submitReport({
          facilityId: facility.id,
          queueType,
          peopleAhead: peopleAheadOption?.value ?? null,
          peopleAheadBucket: peopleAheadOption?.key ?? null,
          locationVerified,
        });
        return true;
      } catch {
        setError('Could not submit report. Please try again.');
        return false;
      }
    },
    [facility.id],
  );

  return {
    status,
    session,
    elapsedMs,
    error,
    clearError: () => setError(null),
    checkIn,
    checkOut,
    discardSession,
    submitQuickReport,
  };
}