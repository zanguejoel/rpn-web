import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CaseCard } from '@/components/CaseCard';
import { FilterChips } from '@/components/ui/FilterChips';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { casesApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { CaseListFilter } from '@/lib/api/types';
import { queries } from '@/lib/query/keys';

const FILTERS: { value: CaseListFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'urgent', label: 'Urgents' },
  { value: 'closed', label: 'Clôturés' },
];

export default function Cases() {
  const [filter, setFilter] = useState<CaseListFilter>('all');
  const cases = useQuery({
    queryKey: queries.cases.list(filter).queryKey,
    queryFn: () => casesApi.list(filter),
  });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Cas RPN"
        subtitle={cases.data ? `${cases.data.totalItems} résultat(s)` : 'Chargement…'}
      />
      <FilterChips label="Filtrer les cas" options={FILTERS} value={filter} onChange={setFilter} />

      {cases.isLoading ? (
        <LoadingState />
      ) : cases.isError ? (
        <ErrorState message={errorMessage(cases.error)} onRetry={() => void cases.refetch()} />
      ) : cases.data && cases.data.items.length === 0 ? (
        <EmptyState title="Aucun cas dans cette catégorie." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cases.data?.items.map((item) => (
            <CaseCard key={item.id} item={item} to={`/cas/${item.id}`} />
          ))}
        </div>
      )}
    </section>
  );
}
