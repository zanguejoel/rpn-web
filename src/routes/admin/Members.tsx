import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { Role } from '@/lib/api/types';
import { queries } from '@/lib/query/keys';

const ROLE_LABEL: Record<Role, string> = { MEMBER: 'Membre', TREASURER: 'Trésorier', ADMIN: 'Administrateur' };

export default function AdminMembers() {
  const members = useQuery({
    queryKey: queries.admin.members(0).queryKey,
    queryFn: () => adminApi.members(0),
  });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader title="Membres" subtitle={members.data ? `${members.data.totalItems} membre(s)` : undefined} />

      {members.isLoading ? (
        <LoadingState />
      ) : members.isError ? (
        <ErrorState message={errorMessage(members.error)} onRetry={() => void members.refetch()} />
      ) : members.data && members.data.items.length === 0 ? (
        <EmptyState title="Aucun membre." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b border-border-subtle text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3">N° RPN</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Courriel</th>
                <th className="px-4 py-3">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {members.data?.items.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover">
                  <td className="tabular px-4 py-3 font-bold text-pending-ink">{m.rpnNumber}</td>
                  <td className="px-4 py-3 font-extrabold text-ink">{m.fullName}</td>
                  <td className="px-4 py-3 text-ink-muted">{m.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.role === 'MEMBER' ? 'neutral' : 'confirmed'}>{ROLE_LABEL[m.role]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
