import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { CaseBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterChips';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { casesApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { CaseListFilter } from '@/lib/api/types';
import { daysUntil, formatCents, formatDate } from '@/lib/format';
import { queries } from '@/lib/query/keys';

const FILTERS: { value: CaseListFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Ouverts' },
  { value: 'urgent', label: 'Urgents' },
  { value: 'closed', label: 'Clôturés' },
];

export default function AdminCases() {
  const [filter, setFilter] = useState<CaseListFilter>('all');
  const cases = useQuery({
    queryKey: queries.cases.list(filter).queryKey,
    queryFn: () => casesApi.list(filter),
  });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Cas RPN"
        subtitle={cases.data ? `${cases.data.totalItems} cas` : undefined}
      />
      <FilterChips label="Filtrer les cas" options={FILTERS} value={filter} onChange={setFilter} />

      {cases.isLoading ? (
        <LoadingState />
      ) : cases.isError ? (
        <ErrorState message={errorMessage(cases.error)} onRetry={() => void cases.refetch()} />
      ) : cases.data && cases.data.items.length === 0 ? (
        <EmptyState title="Aucun cas dans cette catégorie." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-border-subtle text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3">Cas</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Collecte</th>
                <th className="numeric px-4 py-3 text-right">Par membre</th>
                <th className="px-4 py-3">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {cases.data?.items.map((item) => {
                const remaining = daysUntil(item.deadline);
                return (
                  <tr key={item.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link to={`/cas/${item.id}`} className="font-extrabold text-ink hover:text-accent hover:underline">
                        {item.deceasedName}
                      </Link>
                      <p className="text-[11px] text-ink-muted">{item.caseNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CaseBadge status={item.status} urgent={item.urgent} />
                    </td>
                    <td className="w-56 px-4 py-3">
                      <ProgressBar percent={item.progressPercent} label={`Collecte ${item.deceasedName}`} />
                      <p className="tabular mt-1 text-[11px] text-ink-muted">
                        {formatCents(item.collectedAmountCents)} / {formatCents(item.targetAmountCents)}
                      </p>
                    </td>
                    <td className="numeric px-4 py-3 text-right font-bold">
                      {formatCents(item.contributionPerMemberCents)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(item.deadline)}
                      {item.status === 'OPEN' && (
                        <p className={`text-[11px] ${remaining < 0 ? 'font-bold text-urgent-ink' : 'text-ink-muted'}`}>
                          {remaining < 0 ? 'dépassée' : `${remaining} j restants`}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
