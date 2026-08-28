import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { adminApi, casesApi } from '@/lib/api/endpoints';
import { queries } from '@/lib/query/keys';
import { Card } from '@/components/ui/Card';
import { CaseBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { daysUntil, formatAge, formatCents, formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/api/client';

export default function AdminDashboard() {
  const queue = useQuery({
    queryKey: queries.admin.pendingContributions(0).queryKey,
    queryFn: () => adminApi.pendingContributions(0),
  });
  const openCases = useQuery({
    queryKey: queries.cases.list('active').queryKey,
    queryFn: () => casesApi.list('active'),
  });

  if (queue.isLoading || openCases.isLoading) return <LoadingState />;
  if (queue.isError) {
    return <ErrorState message={errorMessage(queue.error)} onRetry={() => void queue.refetch()} />;
  }

  const pending = queue.data?.items ?? [];
  const cases = openCases.data?.items ?? [];
  // Service-level signal: anything waiting over two days is the queue slipping.
  // Measured against when the data was fetched, not Date.now() during render —
  // a clock read on every render is impure and re-answers the question unpredictably.
  const stale = pending.filter((c) => queue.dataUpdatedAt - Date.parse(c.declaredAt) > 48 * 3600_000);
  const pendingCents = pending.reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Tableau de bord</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Ce qui demande une décision aujourd'hui.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Preuves en attente" value={String(queue.data?.totalItems ?? 0)} accent />
        <Stat label="Montant en attente" value={formatCents(pendingCents)} />
        <Stat label="En attente > 48 h" value={String(stale.length)} warn={stale.length > 0} />
        <Stat label="Cas ouverts" value={String(cases.length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">File de validation</h2>
            <Link to="/admin/validation" className="text-xs font-extrabold text-accent hover:underline">
              Ouvrir la file →
            </Link>
          </div>

          {pending.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">
              Rien à valider. La file est vide.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {pending.slice(0, 5).map((contribution) => (
                <li key={contribution.id} className="flex items-center gap-3 py-2.5">
                  <ListChecks size={16} className="shrink-0 text-pending-ink" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{contribution.deceasedName}</p>
                    <p className="text-[11px] text-ink-muted">{formatAge(contribution.declaredAt)}</p>
                  </div>
                  <span className="tabular text-[13px] font-bold text-ink">
                    {formatCents(contribution.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-ink">Cas ouverts</h2>
          {cases.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">Aucun cas ouvert.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {cases.map((rpnCase) => {
                const remaining = daysUntil(rpnCase.deadline);
                return (
                  <li key={rpnCase.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-ink">{rpnCase.deceasedName}</p>
                      <CaseBadge status={rpnCase.status} urgent={rpnCase.urgent} />
                    </div>
                    <ProgressBar percent={rpnCase.progressPercent} label={`Collecte ${rpnCase.deceasedName}`} />
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="tabular">
                        {formatCents(rpnCase.collectedAmountCents)} / {formatCents(rpnCase.targetAmountCents)}
                      </span>
                      <span className={remaining < 0 ? 'font-bold text-urgent-ink' : ''}>
                        {remaining < 0
                          ? `Échéance dépassée (${formatDate(rpnCase.deadline)})`
                          : `${remaining} j restants`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="border-dashed">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-pending-ink" aria-hidden="true" />
          <div className="text-[13px] text-ink-muted">
            <p className="font-bold text-ink">Indicateurs encore indisponibles</p>
            <p className="mt-1">
              Retardataires par cas, écarts de rapprochement et activité récente nécessitent
              d'abord les tables <code>case_participants</code> et <code>audit_log</code> côté
              backend (phase 2 du plan).
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">{label}</p>
      <p
        className={`tabular font-display text-2xl font-bold ${
          warn ? 'text-urgent-ink' : accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
