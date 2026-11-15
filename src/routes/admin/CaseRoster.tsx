import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Badge, CaseBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { FilterChips } from '@/components/ui/FilterChips';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { RecordPaymentDialog } from '@/features/cases/RecordPaymentDialog';
import { adminApi, casesApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { ParticipantDto, RemindResult } from '@/lib/api/types';
import { daysUntil, formatAge, formatCents, formatDate } from '@/lib/format';
import { queries } from '@/lib/query/keys';

type Filter = 'all' | 'unpaid' | 'pending' | 'confirmed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'unpaid', label: 'Non payés' },
  { value: 'pending', label: 'À valider' },
  { value: 'confirmed', label: 'Confirmés' },
];

/** Same window the server enforces: one manual reminder per member per 24 h. */
const REMIND_THROTTLE_MS = 24 * 60 * 60 * 1000;

function isLate(p: ParticipantDto): boolean {
  return p.participant && (p.status === 'NONE' || p.status === 'REJECTED');
}

function recentlyReminded(p: ParticipantDto): boolean {
  return p.lastReminderAt !== null && Date.now() - new Date(p.lastReminderAt).getTime() < REMIND_THROTTLE_MS;
}

function remindSummary(r: RemindResult): string {
  const parts = [`${r.sent} relance${r.sent > 1 ? 's' : ''} envoyée${r.sent > 1 ? 's' : ''}`];
  if (r.throttled > 0) parts.push(`${r.throttled} déjà relancé${r.throttled > 1 ? 's' : ''} il y a moins de 24 h`);
  if (r.notLate > 0) parts.push(`${r.notLate} déjà à jour`);
  return parts.join(' · ') + '.';
}

function matches(filter: Filter, p: ParticipantDto): boolean {
  switch (filter) {
    case 'unpaid':
      // A rejected proof means the money is still owed.
      return p.participant && (p.status === 'NONE' || p.status === 'REJECTED');
    case 'pending':
      return p.status === 'PENDING';
    case 'confirmed':
      return p.status === 'CONFIRMED';
    default:
      return true;
  }
}

export default function CaseRoster() {
  const { caseId = '' } = useParams();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [recording, setRecording] = useState<ParticipantDto | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [remindNote, setRemindNote] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: queries.cases.detail(caseId).queryKey,
    queryFn: () => casesApi.detail(caseId),
    enabled: caseId !== '',
  });
  const roster = useQuery({
    queryKey: queries.admin.participants(caseId).queryKey,
    queryFn: () => adminApi.participants(caseId),
    enabled: caseId !== '',
  });

  const close = useMutation({
    mutationFn: () => adminApi.closeCase(caseId),
    onSuccess: async () => {
      setConfirmClose(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
      ]);
    },
  });

  const remind = useMutation({
    mutationFn: (memberIds?: string[]) => adminApi.remind(caseId, memberIds),
    onSuccess: async (result) => {
      setRemindNote(remindSummary(result));
      await queryClient.invalidateQueries({ queryKey: queries.admin.participants(caseId).queryKey });
    },
    onError: (error) => setRemindNote(errorMessage(error)),
  });

  if (detail.isLoading || roster.isLoading) return <LoadingState label="Chargement du cas…" />;
  if (detail.isError || !detail.data) {
    return <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />;
  }
  if (roster.isError || !roster.data) {
    return <ErrorState message={errorMessage(roster.error)} onRetry={() => void roster.refetch()} />;
  }

  const c = detail.data;
  const r = roster.data;
  const open = c.status === 'OPEN';
  const remaining = daysUntil(c.deadline);
  const rows = r.items.filter((p) => matches(filter, p));
  const unpaid = r.notDeclared + r.rejected;
  const remindable = r.items.filter((p) => isLate(p) && !recentlyReminded(p)).length;

  return (
    <section className="flex flex-col gap-5">
      <Link to="/admin/cas" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-accent hover:underline">
        <ArrowLeft size={14} aria-hidden="true" />
        Cas RPN
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2"><CaseBadge status={c.status} urgent={c.urgent} /></div>
          <h1 className="font-display text-2xl font-bold text-ink">{c.deceasedName}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {c.caseNumber} · bénéficiaire {c.beneficiaryMemberName} ({c.beneficiaryRpnNumber}) · échéance{' '}
            {formatDate(c.deadline)}
            {open && ` (${remaining < 0 ? 'dépassée' : `${remaining} j restants`})`}
          </p>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2">
            {unpaid > 0 && (
              <Button
                loading={remind.isPending && remind.variables === undefined}
                disabled={remindable === 0}
                title={remindable === 0 ? 'Tous les retardataires ont été relancés il y a moins de 24 h.' : undefined}
                onClick={() => remind.mutate(undefined)}
              >
                Relancer les retardataires ({remindable})
              </Button>
            )}
            <Button variant="secondary" onClick={() => setConfirmClose(true)}>
              Clôturer le cas
            </Button>
          </div>
        )}
      </div>

      {open && remaining >= 0 && (
        <p className="-mt-2 text-[12px] text-ink-muted">
          Rappels automatiques par courriel 7 jours puis 1 jour avant l'échéance, aux participants qui n'ont rien
          déclaré.
        </p>
      )}
      {remindNote && (
        <p role="status" className="rounded-[var(--radius-card)] bg-accent-pale px-4 py-2.5 text-[13px] font-semibold text-accent">
          {remindNote}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Participants" value={r.participants} />
        <Stat label="Confirmés" value={r.confirmed} tone="confirmed" />
        <Stat
          label="À valider"
          value={r.pending}
          tone={r.pending > 0 ? 'pending' : undefined}
          {...(r.pending > 0 ? { to: '/admin/validation' } : {})}
        />
        <Stat label="Non payés" value={unpaid} tone={unpaid > 0 ? 'urgent' : undefined} />
        <Card className="flex flex-col justify-center gap-1.5 p-4">
          <p className="text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">Collecté</p>
          <ProgressBar percent={c.progressPercent} label={`Collecte ${c.deceasedName}`} />
          <p className="tabular text-[12px] text-ink-muted">
            <strong className="text-ink">{formatCents(c.collectedAmountCents)}</strong> / {formatCents(c.targetAmountCents)}
          </p>
        </Card>
      </div>

      <FilterChips label="Filtrer les participants" options={FILTERS} value={filter} onChange={setFilter} />

      {rows.length === 0 ? (
        <EmptyState title="Personne dans cette catégorie." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-border-subtle text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3">Membre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="numeric px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((p) => (
                <tr key={p.memberId} className="align-top hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-ink">{p.fullName}</p>
                    <p className="tabular text-[11px] text-ink-muted">{p.rpnNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={p.status} />
                      {p.recordedManually && <Badge tone="neutral">Saisi par le trésorier</Badge>}
                      {!p.participant && <Badge tone="neutral">Hors liste</Badge>}
                    </div>
                    {p.status === 'REJECTED' && p.rejectionReason && (
                      <p className="mt-1 max-w-xs text-[11px] text-urgent-ink">Motif : {p.rejectionReason}</p>
                    )}
                    {isLate(p) && p.lastReminderAt && (
                      <p className="mt-1 text-[11px] text-ink-muted">Relancé {formatAge(p.lastReminderAt)}</p>
                    )}
                  </td>
                  <td className="numeric px-4 py-3 text-right font-bold">
                    {p.amountCents === null ? '—' : formatCents(p.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.declaredAt ? formatDate(p.declaredAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {open && isLate(p) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={recentlyReminded(p)}
                          loading={remind.isPending && remind.variables?.[0] === p.memberId}
                          title={recentlyReminded(p) ? 'Déjà relancé il y a moins de 24 h.' : undefined}
                          onClick={() => remind.mutate([p.memberId])}
                        >
                          Relancer
                        </Button>
                      )}
                      <RowAction
                        participant={p}
                        caseOpen={open}
                        onRecord={() => setRecording(p)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {recording && (
        <RecordPaymentDialog
          caseId={caseId}
          participant={recording}
          defaultAmountCents={c.contributionPerMemberCents}
          onClose={() => setRecording(null)}
        />
      )}

      {confirmClose && (
        <Dialog
          title="Clôturer ce cas ?"
          busy={close.isPending}
          onClose={() => setConfirmClose(false)}
          description={
            <>
              {formatCents(c.collectedAmountCents)} collectés sur {formatCents(c.targetAmountCents)}
              {unpaid > 0 && <> · <strong className="text-urgent-ink">{unpaid} participant(s) n'ont pas payé</strong></>}
              . Une fois clôturé, plus aucune contribution ne peut être déclarée ni enregistrée.
            </>
          }
        >
          {close.isError && (
            <p role="alert" className="mb-3 text-[12px] font-semibold text-urgent-ink">{errorMessage(close.error)}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClose(false)} disabled={close.isPending}>
              Annuler
            </Button>
            <Button variant="danger" loading={close.isPending} onClick={() => close.mutate()}>
              Clôturer
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function RowAction({ participant: p, caseOpen, onRecord }: { participant: ParticipantDto; caseOpen: boolean; onRecord: () => void }) {
  if (p.status === 'PENDING' && p.contributionId) {
    // One place to validate, with the proof viewer and the amount check — not a second, weaker one here.
    return (
      <Link
        to={`/admin/validation?c=${p.contributionId}`}
        className="inline-flex min-h-9 items-center rounded-[var(--radius-button)] bg-accent px-3 text-[13px] font-extrabold text-accent-contrast hover:bg-accent-hover"
      >
        Examiner la preuve
      </Link>
    );
  }
  if (caseOpen && p.participant && (p.status === 'NONE' || p.status === 'REJECTED')) {
    return (
      <Button size="sm" variant="secondary" onClick={onRecord}>
        Enregistrer un paiement
      </Button>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: ParticipantDto['status'] }) {
  if (status === 'CONFIRMED') return <Badge tone="confirmed">★ Confirmé</Badge>;
  if (status === 'PENDING') return <Badge tone="pending">⏳ À valider</Badge>;
  if (status === 'REJECTED') return <Badge tone="urgent">Rejeté</Badge>;
  return <Badge tone="neutral">Rien déclaré</Badge>;
}

function Stat({ label, value, tone, to }: { label: string; value: number; tone?: 'confirmed' | 'pending' | 'urgent' | undefined; to?: string }) {
  const color = tone === 'confirmed' ? 'text-confirmed-ink' : tone === 'pending' ? 'text-pending-ink' : tone === 'urgent' ? 'text-urgent-ink' : 'text-ink';
  const body = (
    <Card className="flex h-full flex-col gap-1 p-4">
      <p className="text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">{label}</p>
      <p className={`tabular font-display text-2xl font-bold ${color}`}>{value}</p>
      {to && <p className="text-[11px] font-extrabold text-accent">Ouvrir la file →</p>}
    </Card>
  );
  return to ? <Link to={to} className="rounded-[var(--radius-card)] hover:brightness-[0.98]">{body}</Link> : body;
}
