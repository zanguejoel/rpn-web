import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Keyboard, X } from 'lucide-react';
import { adminApi, casesApi } from '@/lib/api/endpoints';
import { queries } from '@/lib/query/keys';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { ProofViewer } from '@/features/validation/ProofViewer';
import { RejectDialog, type RejectionCode } from '@/features/validation/RejectDialog';
import { errorMessage } from '@/lib/api/client';
import { formatAge, formatCents, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ContributionDto } from '@/lib/api/types';

const METHOD_LABEL: Record<ContributionDto['method'], string> = {
  INTERAC: 'Interac',
  TRANSFER: 'Virement',
  CASH: 'Espèces',
};

export default function ValidationQueue() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queue = useQuery({
    queryKey: queries.admin.pendingContributions(0).queryKey,
    queryFn: () => adminApi.pendingContributions(0),
  });

  const items = useMemo(() => queue.data?.items ?? [], [queue.data]);

  /* The queue shifts under us — another treasurer decides something, a refetch
     lands. Rather than correcting the stored id in an effect (which costs a
     second render every time the list changes), the effective selection is
     derived: keep the stored id while it still exists, otherwise fall to the
     head of the queue. */
  const effectiveSelectedId =
    selectedId !== null && items.some((item) => item.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null);

  const selectedIndex = items.findIndex((item) => item.id === effectiveSelectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  /* The case tells us what this member was supposed to pay. Comparing it to the
     declared amount is the check a treasurer would otherwise do by memory. */
  const caseQuery = useQuery({
    queryKey: queries.cases.detail(selected?.caseId ?? 'none').queryKey,
    queryFn: () => casesApi.detail(selected!.caseId),
    enabled: Boolean(selected?.caseId),
  });

  const expectedCents = caseQuery.data?.contributionPerMemberCents;
  const hasAmountMismatch =
    selected !== undefined && expectedCents !== undefined && selected.amountCents !== expectedCents;

  /** After any decision the queue, the case and the member's totals all move. */
  const invalidateAfterDecision = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'pendingContributions'] }),
      queryClient.invalidateQueries({ queryKey: ['cases'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]);
  }, [queryClient]);

  /** Advance before the list refetches, so the cursor doesn't jump to the top. */
  const advanceSelection = useCallback(() => {
    const next = items[selectedIndex + 1] ?? items[selectedIndex - 1];
    setSelectedId(next ? next.id : null);
  }, [items, selectedIndex]);

  const validate = useMutation({
    mutationFn: (id: string) => adminApi.validate(id),
    onSuccess: async () => {
      setActionError(null);
      advanceSelection();
      await invalidateAfterDecision();
    },
    onError: (error) => setActionError(decisionError(error)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.reject(id, reason),
    onSuccess: async () => {
      setActionError(null);
      setRejecting(false);
      advanceSelection();
      await invalidateAfterDecision();
    },
    onError: (error) => setActionError(decisionError(error)),
  });

  const busy = validate.isPending || reject.isPending;

  const move = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const nextIndex = Math.min(Math.max(selectedIndex + delta, 0), items.length - 1);
      setSelectedId(items[nextIndex]!.id);
    },
    [items, selectedIndex],
  );

  /* Keyboard-first: validating 40 proofs with a mouse is the difference between a
     tool that gets used and one that gets abandoned for a paper list. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (rejecting || busy) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      switch (event.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          event.preventDefault();
          move(1);
          break;
        case 'k':
        case 'arrowup':
          event.preventDefault();
          move(-1);
          break;
        case 'v':
          if (selected && !hasAmountMismatch) validate.mutate(selected.id);
          break;
        case 'r':
          if (selected) setRejecting(true);
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move, selected, rejecting, busy, validate, hasAmountMismatch]);

  if (queue.isLoading) return <LoadingState label="Chargement de la file…" />;
  if (queue.isError) {
    return <ErrorState message={errorMessage(queue.error)} onRetry={() => void queue.refetch()} />;
  }

  return (
    <section className="flex h-[calc(100dvh-6rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">File de validation</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {queue.data?.totalItems ?? 0} preuve(s) en attente · les plus anciennes d'abord
          </p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-surface-hover px-3 py-1.5 text-[11px] font-semibold text-ink-muted">
          <Keyboard size={14} aria-hidden="true" />
          <kbd className="font-bold">J</kbd>/<kbd className="font-bold">K</kbd> naviguer ·
          <kbd className="font-bold">V</kbd> valider · <kbd className="font-bold">R</kbd> rejeter
        </p>
      </header>

      {items.length === 0 ? (
        <Card className="grid flex-1 place-items-center">
          <EmptyState title="La file est vide." hint="Toutes les preuves déclarées ont été traitées." />
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,380px)_1fr]">
          {/* Queue */}
          <Card className="min-h-0 overflow-y-auto p-0">
            <ul role="listbox" aria-label="Preuves en attente" className="divide-y divide-border-subtle">
              {items.map((item) => {
                const isSelected = item.id === effectiveSelectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
                        isSelected ? 'bg-accent-pale' : 'hover:bg-surface-hover',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-extrabold text-ink">
                          {item.deceasedName}
                        </span>
                        <span className="tabular shrink-0 text-[13px] font-bold text-ink">
                          {formatCents(item.amountCents)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                        <span className="truncate">
                          {item.caseNumber} · {METHOD_LABEL[item.method]}
                        </span>
                        <span className="shrink-0">{formatAge(item.declaredAt)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Detail */}
          {selected && (
            <Card className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">{selected.deceasedName}</h2>
                  <p className="text-[12px] text-ink-muted">
                    {selected.caseNumber} · déclaré le {formatDateTime(selected.declaredAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular font-display text-2xl font-bold text-ink">
                    {formatCents(selected.amountCents)}
                  </p>
                  <p className="text-[11px] text-ink-muted">{METHOD_LABEL[selected.method]}</p>
                </div>
              </div>

              {hasAmountMismatch && expectedCents !== undefined && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-input)] bg-urgent-bg px-3 py-2 text-[12px] font-semibold text-urgent-ink"
                >
                  Montant différent du cas : {formatCents(selected.amountCents)} déclaré contre{' '}
                  {formatCents(expectedCents)} attendu. Vérifiez avant de valider — la validation par
                  raccourci est désactivée pour cette ligne.
                </p>
              )}

              <div className="min-h-0 flex-1">
                <ProofViewer contributionId={selected.id} />
              </div>

              {actionError && (
                <p role="alert" className="text-[12px] font-semibold text-urgent-ink">
                  {actionError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => validate.mutate(selected.id)}
                  loading={validate.isPending}
                  disabled={busy}
                >
                  <Check size={16} aria-hidden="true" />
                  Valider
                </Button>
                <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                  <X size={16} aria-hidden="true" />
                  Rejeter
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {rejecting && selected && (
        <RejectDialog
          contribution={selected}
          pending={reject.isPending}
          onCancel={() => setRejecting(false)}
          onConfirm={(code: RejectionCode, note: string) =>
            reject.mutate({ id: selected.id, reason: note ? `${code} — ${note}` : code })
          }
        />
      )}
    </section>
  );
}

/** A 409 here means another treasurer got there first — say so plainly. */
function decisionError(error: unknown): string {
  const message = errorMessage(error);
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
    return `Cette contribution a déjà été traitée par un autre trésorier. ${message}`;
  }
  return message;
}
