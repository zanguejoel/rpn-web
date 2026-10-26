import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CaseCard } from '@/components/CaseCard';
import { ContributionRow } from '@/components/ContributionRow';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { casesApi, meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatCents } from '@/lib/format';
import { queries } from '@/lib/query/keys';

export default function Home() {
  const { member } = useAuth();
  const firstName = member?.fullName.split(' ')[0] ?? '';

  const summary = useQuery({ queryKey: queries.me.summary.queryKey, queryFn: meApi.summary });
  const urgent = useQuery({
    queryKey: queries.cases.list('urgent').queryKey,
    queryFn: () => casesApi.list('urgent'),
  });
  const recent = useQuery({
    queryKey: queries.me.contributions().queryKey,
    queryFn: () => meApi.contributions(undefined, 0),
  });

  if (summary.isLoading || urgent.isLoading) return <LoadingState />;
  if (summary.isError) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />;
  }

  const urgentCase = urgent.data?.items[0];
  const latest = recent.data?.items.slice(0, 3) ?? [];
  const s = summary.data;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Bonjour {firstName}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          {member?.associationName} · membre {member?.rpnNumber}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cas actifs" value={String(s?.activeCases ?? 0)} />
        {/* Confirmed and pending are never merged: a member must not believe they have
            contributed while a proof is still waiting to be validated (or may be rejected). */}
        <Stat label="Contribué (confirmé)" value={formatCents(s?.confirmedCents ?? 0)} accent />
        <Stat label="En attente de validation" value={formatCents(s?.pendingCents ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-ink">Cas à traiter</h2>
          {urgentCase ? (
            <CaseCard item={urgentCase} to={`/cas/${urgentCase.id}`} />
          ) : (
            <Card>
              <p className="text-[13px] text-ink-muted">Aucun cas urgent pour le moment.</p>
              <Link to="/cas" className="mt-2 inline-block text-[13px] font-extrabold text-accent hover:underline">
                Voir tous les cas →
              </Link>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">Mes contributions récentes</h2>
            <Link to="/contributions" className="text-xs font-extrabold text-accent hover:underline">
              Tout voir →
            </Link>
          </div>
          <Card className="py-1">
            {latest.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-muted">Aucune contribution pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {latest.map((item) => (
                  <ContributionRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">{label}</p>
      <p className={`tabular font-display text-2xl font-bold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </Card>
  );
}
