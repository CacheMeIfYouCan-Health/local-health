'use client';

import { savePushSubscription } from './api';

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

function base64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Asks for notification permission, registers /sw.js and stores this
 * browser's push subscription on the server. Returns 'granted', 'denied'
 * or 'unsupported'.
 */
export async function enablePush(vapidPublicKey) {
  if (!pushSupported() || !vapidPublicKey) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(vapidPublicKey),
    }));
  await savePushSubscription(subscription.toJSON());
  return 'granted';
}
