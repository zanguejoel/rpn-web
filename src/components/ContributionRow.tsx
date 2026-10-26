import { ContributionBadge } from '@/components/ui/Badge';
import { formatCents, formatDate } from '@/lib/format';
import type { ContributionDto, ContributionMethod } from '@/lib/api/types';

export const METHOD_LABEL: Record<ContributionMethod, string> = {
  INTERAC: 'Interac',
  TRANSFER: 'Virement',
  CASH: 'Espèces',
};

/** A contribution as a compact row; a rejection shows its reason inline, since that is what the member must act on. */
export function ContributionRow({ item }: { item: ContributionDto }) {
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-ink">{item.deceasedName}</p>
          <p className="text-[11px] text-ink-muted">
            {item.caseNumber} · {METHOD_LABEL[item.method]} · {formatDate(item.declaredAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="tabular text-[13px] font-bold text-ink">{formatCents(item.amountCents)}</span>
          <ContributionBadge status={item.status} />
        </div>
      </div>
      {item.status === 'REJECTED' && item.rejectionReason && (
        <p className="rounded-[var(--radius-input)] bg-urgent-bg px-3 py-2 text-[12px] font-semibold text-urgent-ink">
          Motif du rejet : {item.rejectionReason}
        </p>
      )}
    </li>
  );
}
