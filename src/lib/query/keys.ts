import { createQueryKeyStore } from '@lukemorales/query-key-factory';
import type { CaseListFilter, ContributionStatus } from '@/lib/api/types';

/* Same key structure as the mobile app, so invalidation rules read the same in
   both codebases: validating a proof must invalidate the case, the queue and
   the member's own summary. */
export const queries = createQueryKeyStore({
  me: {
    summary: null,
    contributions: (status?: ContributionStatus) => [status ?? 'all'],
  },
  cases: {
    list: (filter: CaseListFilter) => [filter],
    detail: (id: string) => [id],
  },
  admin: {
    pendingContributions: (page: number) => [page],
    members: (page: number) => [page],
  },
});
