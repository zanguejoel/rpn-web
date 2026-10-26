import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ContributionRow } from '@/components/ContributionRow';
import { Button } from '@/components/ui/Button';
import { CaseBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { casesApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/client';
import { daysUntil, formatCents, formatDate } from '@/lib/format';
import { queries } from '@/lib/query/keys';

export default function CaseDetail() {
  const { caseId = '' } = useParams();
  const detail = useQuery({
    queryKey: queries.cases.detail(caseId).queryKey,
    queryFn: () => casesApi.detail(caseId),
    enabled: caseId !== '',
  });

  if (detail.isLoading) return <LoadingState label="Chargement du cas…" />;
  if (detail.isError || !detail.data) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <ErrorState
        message={notFound ? "Ce cas n'existe pas ou n'est plus accessible." : errorMessage(detail.error)}
        {...(notFound ? {} : { onRetry: () => void detail.refetch() })}
      />
    );
  }

  const c = detail.data;
  const closed = c.status === 'CLOSED';
  const remaining = daysUntil(c.deadline);
  const mine = c.myContribution;
  // A rejected declaration can be resubmitted; a pending or confirmed one blocks a second.
  const canDeclare = !closed && (mine === null || mine.status === 'REJECTED');

  return (
    <section className="flex flex-col gap-5">
      <Link to="/cas" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-accent hover:underline">
        <ArrowLeft size={14} aria-hidden="true" />
        Cas RPN
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2">
            <CaseBadge status={c.status} urgent={c.urgent} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">{c.deceasedName}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Décès le {formatDate(c.dateOfDeath)} · échéance le {formatDate(c.deadline)}
            {!closed && ` (${remaining < 0 ? 'dépassée' : `${remaining} j restants`})`}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <dl className="divide-y divide-border-subtle text-[13px]">
              <Row label="N° du cas" value={c.caseNumber} />
              <Row label="Membre concerné" value={`${c.beneficiaryMemberName} · ${c.beneficiaryRpnNumber}`} />
              <Row label="Contribution" value={`${formatCents(c.contributionPerMemberCents)} / membre`} />
              <Row label="Date limite" value={formatDate(c.deadline)} />
            </dl>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-bold text-ink">Progression de la collecte</h2>
            <ProgressBar percent={c.progressPercent} label={`Collecte ${c.deceasedName}`} />
            <div className="flex justify-between text-[12px] text-ink-muted">
              <span className="tabular font-bold text-ink">{formatCents(c.collectedAmountCents)}</span>
              <span className="tabular">{c.progressPercent} %</span>
              <span className="tabular">Objectif {formatCents(c.targetAmountCents)}</span>
            </div>
          </Card>
        </div>

        {/* Sticky on desktop so the action stays in view while the case details scroll. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-bold text-ink">Ma contribution</h2>

            {mine && (
              <ul>
                <ContributionRow item={mine} />
              </ul>
            )}

            {mine?.status === 'PENDING' && (
              <p className="text-[12px] text-ink-muted">
                Un trésorier doit valider votre preuve. Vous serez prévenu de la décision.
              </p>
            )}
            {mine?.status === 'CONFIRMED' && (
              <p className="text-[12px] font-semibold text-confirmed-ink">Merci — votre contribution est confirmée.</p>
            )}
            {closed && !mine && <p className="text-[12px] text-ink-muted">Ce cas est clôturé.</p>}

            {canDeclare && (
              <Link to={`/cas/${c.id}/declarer`}>
                <Button className="w-full">
                  {mine?.status === 'REJECTED' ? 'Soumettre une nouvelle preuve' : "J'ai payé — soumettre ma preuve"}
                </Button>
              </Link>
            )}
          </Card>
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-extrabold text-ink">{value}</dd>
    </div>
  );
}
