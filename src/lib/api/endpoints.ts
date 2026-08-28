import { api } from './client';
import type {
  CaseDetailDto,
  CaseListFilter,
  CaseSummaryDto,
  ContributionDto,
  ContributionStatus,
  LoginResponse,
  MeSummaryDto,
  MemberDto,
  PageResponse,
} from './types';

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  register: (inviteToken: string, fullName: string, password: string) =>
    api.post<LoginResponse>('/auth/register', { inviteToken, fullName, password }),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }),
};

export const meApi = {
  profile: () => api.get<MemberDto>('/me'),
  update: (fullName: string) => api.patch<MemberDto>('/me', { fullName }),
  summary: () => api.get<MeSummaryDto>('/me/summary'),
  contributions: (status?: ContributionStatus, page = 0) =>
    api.get<PageResponse<ContributionDto>>(`/me/contributions${query({ status, page })}`),
};

export const casesApi = {
  list: (filter: CaseListFilter, page = 0) =>
    api.get<PageResponse<CaseSummaryDto>>(
      `/cases${query({ status: filter === 'all' ? undefined : filter, page })}`,
    ),
  detail: (id: string) => api.get<CaseDetailDto>(`/cases/${id}`),
};

export const adminApi = {
  /**
   * Validation queue. NOTE: the endpoint is pending-only and takes no status
   * filter — it always returns PENDING, oldest first. Reviewing already-decided
   * contributions needs a backend change (§7.1 of the plan).
   */
  pendingContributions: (page = 0, size = 20) =>
    api.get<PageResponse<ContributionDto>>(`/admin/contributions${query({ page, size })}`),
  validate: (contributionId: string) =>
    api.post<ContributionDto>(`/contributions/${contributionId}/validate`),
  reject: (contributionId: string, reason: string) =>
    api.post<ContributionDto>(`/contributions/${contributionId}/reject`, { reason }),
  members: (page = 0, size = 50) =>
    api.get<PageResponse<MemberDto>>(`/admin/members${query({ page, size })}`),
  proofUrl: (contributionId: string) =>
    api.get<{ url: string }>(`/contributions/${contributionId}/proof`),
};
