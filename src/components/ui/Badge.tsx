import { cn } from '@/lib/cn';
import type { CaseStatus, ContributionStatus } from '@/lib/api/types';

export type BadgeTone = 'confirmed' | 'pending' | 'urgent' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
  confirmed: 'bg-confirmed-bg text-confirmed-ink',
  pending: 'bg-pending-bg text-pending-ink',
  urgent: 'bg-urgent-bg text-urgent-ink',
  neutral: 'bg-surface-hover text-ink-muted',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap',
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

/* Status never travels as colour alone — every badge carries a word too, so the
   meaning survives greyscale, colour-blindness and a screen reader. */

export function ContributionBadge({ status }: { status: ContributionStatus }) {
  if (status === 'CONFIRMED') return <Badge tone="confirmed">★ Confirmé</Badge>;
  if (status === 'REJECTED') return <Badge tone="urgent">Rejeté</Badge>;
  return <Badge tone="pending">⏳ En attente</Badge>;
}

export function CaseBadge({ status, urgent }: { status: CaseStatus; urgent: boolean }) {
  if (status === 'CLOSED') return <Badge tone="confirmed">★ Clôturé</Badge>;
  if (urgent) return <Badge tone="urgent">⚡ Urgent</Badge>;
  return <Badge tone="pending">⏳ En cours</Badge>;
}
