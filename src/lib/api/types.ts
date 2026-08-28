/* Mirrors cm.cccn.rpn's DTOs (rpn-backend), and kept identical in shape to
   rpn-mobile/lib/api/types.ts so the two clients cannot drift apart quietly.
   Amounts are always integer cents. Dates are ISO strings exactly as Jackson
   emits them: LocalDate -> "YYYY-MM-DD", Instant -> full ISO-8601.

   Longer term these types should be generated from /v3/api-docs rather than
   hand-kept — see §8.3 of rpn-web-project-plan.md. */

export type Role = 'MEMBER' | 'TREASURER' | 'ADMIN';
export type CaseStatus = 'OPEN' | 'CLOSED';
export type ContributionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type ContributionMethod = 'INTERAC' | 'TRANSFER' | 'CASH';

/** Roles allowed into /admin. MEMBER is deliberately absent. */
export const ADMIN_ROLES: readonly Role[] = ['TREASURER', 'ADMIN'];

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface MemberDto {
  id: string;
  rpnNumber: string;
  fullName: string;
  email: string;
  role: Role;
  associationName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  member: MemberDto;
}

export interface MeSummaryDto {
  rpnNumber: string;
  activeCases: number;
  totalContributedCents: number;
  confirmedCents: number;
  pendingCents: number;
}

export interface ContributionDto {
  id: string;
  caseId: string;
  caseNumber: string;
  deceasedName: string;
  amountCents: number;
  method: ContributionMethod;
  status: ContributionStatus;
  declaredAt: string;
  validatedAt: string | null;
  rejectionReason: string | null;
}

export interface CaseSummaryDto {
  id: string;
  caseNumber: string;
  deceasedName: string;
  dateOfDeath: string;
  deadline: string;
  status: CaseStatus;
  urgent: boolean;
  contributionPerMemberCents: number;
  targetAmountCents: number;
  collectedAmountCents: number;
  progressPercent: number;
}

export interface CaseDetailDto extends CaseSummaryDto {
  beneficiaryMemberName: string;
  beneficiaryRpnNumber: string;
  myContribution: ContributionDto | null;
}

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
}

export type CaseListFilter = 'all' | 'active' | 'urgent' | 'closed';
