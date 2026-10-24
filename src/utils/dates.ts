import { format } from 'date-fns';

// Firestore Timestamps, Dates and date strings all become a Date (or null when missing).
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateRange(start: any, end: any): string {
  const s = toDate(start);
  const e = toDate(end);
  if (s && e) return `${format(s, 'yyyy/MM/dd')} – ${format(e, 'yyyy/MM/dd')}`;
  if (s) return `${format(s, 'yyyy/MM/dd')} 起`;
  if (e) return `至 ${format(e, 'yyyy/MM/dd')}`;
  return '';
}
