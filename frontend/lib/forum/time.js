/** "14:05" today, "Mon 14:05" this week, "3 Oct" otherwise. */
export function messageTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const clock = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return clock;
  const days = (now - d) / 86_400_000;
  if (days < 6) return `${d.toLocaleDateString([], { weekday: 'short' })} ${clock}`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function relativeTime(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return messageTime(iso);
}
