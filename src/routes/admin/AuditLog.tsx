import { useQuery } from '@tanstack/react-query';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { AuditAction } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { queries } from '@/lib/query/keys';

const ACTION: Record<AuditAction, { label: string; tone: BadgeTone }> = {
  CASE_OPENED: { label: 'Cas ouvert', tone: 'neutral' },
  CASE_CLOSED: { label: 'Cas clôturé', tone: 'neutral' },
  CONTRIBUTION_VALIDATED: { label: 'Paiement confirmé', tone: 'confirmed' },
  CONTRIBUTION_REJECTED: { label: 'Preuve rejetée', tone: 'urgent' },
  // Highlighted: no proof backs it, only the treasurer's word.
  PAYMENT_RECORDED: { label: 'Paiement saisi', tone: 'pending' },
  SETTINGS_UPDATED: { label: 'Paramètres', tone: 'neutral' },
};

export default function AdminAuditLog() {
  const log = useQuery({ queryKey: queries.admin.auditLog(0).queryKey, queryFn: () => adminApi.auditLog(0, 100) });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Journal d'audit"
        subtitle="Chaque décision administrative, qui l'a prise et quand. Rien ici ne peut être modifié ni supprimé."
      />
      {log.isLoading ? (
        <LoadingState />
      ) : log.isError ? (
        <ErrorState message={errorMessage(log.error)} onRetry={() => void log.refetch()} />
      ) : log.data && log.data.items.length === 0 ? (
        <EmptyState title="Aucune action enregistrée pour l'instant." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-border-subtle text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3">Quand</th>
                <th className="px-4 py-3">Qui</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {log.data?.items.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="tabular px-4 py-3 whitespace-nowrap text-ink-muted">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{entry.actorName ?? '—'}</p>
                    <p className="tabular text-[11px] text-ink-muted">{entry.actorRpnNumber}</p>
                  </td>
                  <td className="px-4 py-3"><Badge tone={ACTION[entry.action].tone}>{ACTION[entry.action].label}</Badge></td>
                  <td className="px-4 py-3 text-ink-muted">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
