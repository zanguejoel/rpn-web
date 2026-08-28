import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/* Amounts cross the wire as integer cents and are only ever divided here.
   Same rule as the mobile app: never a float in the domain. */
const currency = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return currency.format(cents / 100);
}

/** Two-decimal form for ledgers and exports, where rounding would hide cents. */
export function formatCentsPrecise(cents: number): string {
  return currencyPrecise.format(cents / 100);
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: fr });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });
}

/** "il y a 3 jours" — used for queue ageing, a service-level signal for treasurers. */
export function formatAge(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { locale: fr, addSuffix: true });
}

/** Whole days from today until an ISO date; negative once overdue. */
export function daysUntil(iso: string): number {
  const target = parseISO(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
