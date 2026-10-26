import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ContributionRow } from '@/components/ContributionRow';
import { Card } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterChips';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { ContributionStatus } from '@/lib/api/types';
import { formatCents } from '@/lib/format';
import { queries } from '@/lib/query/keys';

type Filter = 'ALL' | ContributionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'CONFIRMED', label: 'Confirmées' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'REJECTED', label: 'Rejetées' },
];

export default function Contributions() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const status = filter === 'ALL' ? undefined : filter;

  const summary = useQuery({ queryKey: queries.me.summary.queryKey, queryFn: meApi.summary });
  const list = useQuery({
    queryKey: queries.me.contributions(status).queryKey,
    queryFn: () => meApi.contributions(status, 0),
  });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Mes contributions"
        subtitle={
          summary.data
            ? `${formatCents(summary.data.confirmedCents)} confirmés · ${formatCents(summary.data.pendingCents)} en attente`
            : undefined
        }
      />
      <FilterChips label="Filtrer les contributions" options={FILTERS} value={filter} onChange={setFilter} />

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState
          title="Aucune contribution dans cette catégorie."
          hint="Déclarez un paiement depuis la page d'un cas."
        />
      ) : (
        <Card className="py-1">
          <ul className="divide-y divide-border-subtle">
            {list.data?.items.map((item) => <ContributionRow key={item.id} item={item} />)}
          </ul>
        </Card>
      )}
    </section>
  );
}
