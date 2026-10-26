import { Link } from 'react-router';
import { CaseBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { daysUntil, formatCents, formatDate } from '@/lib/format';
import type { CaseSummaryDto } from '@/lib/api/types';

/**
 * One case, as a card. The left edge carries the state in colour AND the badge carries it in
 * words, so urgency never depends on colour perception alone.
 */
export function CaseCard({ item, to }: { item: CaseSummaryDto; to: string }) {
  const closed = item.status === 'CLOSED';
  const remaining = daysUntil(item.deadline);

  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-subtle border-l-4 bg-surface-raised p-4',
        'shadow-[var(--shadow-card)] transition-colors hover:bg-surface-hover',
        closed ? 'border-l-flag-green' : item.urgent ? 'border-l-flag-red' : 'border-l-flag-yellow',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">{item.deceasedName}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {item.caseNumber} · décès le {formatDate(item.dateOfDeath)}
          </p>
        </div>
        <CaseBadge status={item.status} urgent={item.urgent} />
      </div>

      <div className="flex flex-col gap-1.5">
        <ProgressBar percent={item.progressPercent} label={`Collecte ${item.deceasedName}`} />
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span className="tabular">
            {formatCents(item.collectedAmountCents)} / {formatCents(item.targetAmountCents)}
          </span>
          <span className={cn(!closed && remaining < 0 && 'font-bold text-urgent-ink')}>
            {closed
              ? `Clôturé · ${formatDate(item.deadline)}`
              : remaining < 0
                ? 'Échéance dépassée'
                : `${remaining} j restants`}
          </span>
        </div>
      </div>

      <p className="text-[12px] font-bold text-ink">
        {formatCents(item.contributionPerMemberCents)} <span className="font-semibold text-ink-muted">par membre</span>
      </p>
    </Link>
  );
}
