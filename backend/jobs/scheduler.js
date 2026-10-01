import { runSummaryJob } from '../services/summary.service.js';
import { sendDueSummaryNotifications } from '../services/notification.service.js';

// Periodic background work. Intervals are in minutes and configurable so the
// AI is called in batches, never once per message.
const SUMMARY_EVERY_MIN = Number(process.env.FORUM_SUMMARY_JOB_MINUTES) || 20;
const NOTIFY_EVERY_MIN = Number(process.env.FORUM_NOTIFY_JOB_MINUTES) || 5;

function every(minutes, name, fn) {
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap a slow run
    running = true;
    try {
      const n = await fn();
      if (n) console.log(`[jobs] ${name}: ${n}`);
    } catch (err) {
      console.warn(`[jobs] ${name} failed:`, err.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref();
  setTimeout(tick, 30_000).unref(); // first run shortly after boot
  return timer;
}

export function startScheduler() {
  if (process.env.DISABLE_JOBS === 'true') {
    console.log('[jobs] disabled by DISABLE_JOBS');
    return;
  }
  every(SUMMARY_EVERY_MIN, 'forum summaries generated', runSummaryJob);
  every(NOTIFY_EVERY_MIN, 'summary notifications sent', sendDueSummaryNotifications);
  console.log(
    `[jobs] summaries every ${SUMMARY_EVERY_MIN} min, notifications every ${NOTIFY_EVERY_MIN} min`
  );
}
