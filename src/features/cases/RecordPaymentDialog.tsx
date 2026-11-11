import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { METHOD_LABEL } from '@/components/ContributionRow';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { ContributionMethod, ParticipantDto } from '@/lib/api/types';
import { formatCents } from '@/lib/format';
import { cn } from '@/lib/cn';

const METHODS: ContributionMethod[] = ['INTERAC', 'TRANSFER', 'CASH'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Records money a treasurer received outside the app — cash, or an Interac transfer they saw arrive in
 * the association's account — for a member who did not declare it.
 *
 * This is confirmed on save, with no proof to examine, so the dialog says so plainly and asks for the
 * details the books need. The server logs it with the treasurer's name.
 */
export function RecordPaymentDialog({
  caseId,
  participant,
  defaultAmountCents,
  onClose,
}: {
  caseId: string;
  participant: ParticipantDto;
  defaultAmountCents: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<ContributionMethod>('INTERAC');
  const [amount, setAmount] = useState((defaultAmountCents / 100).toFixed(2).replace('.', ','));
  const [reference, setReference] = useState('');
  const [receivedOn, setReceivedOn] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  // One key per dialog: a retry or a double click resubmits the same payment, never a second one.
  const idempotencyKey = useRef(crypto.randomUUID());

  const amountCents = Math.round(Number(amount.replace(/\s/g, '').replace(',', '.')) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents > 0;

  const save = useMutation({
    mutationFn: () =>
      adminApi.recordPayment(caseId, idempotencyKey.current, {
        memberId: participant.memberId,
        amountCents,
        method,
        reference: reference.trim() || undefined,
        receivedOn,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
      ]);
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <Dialog
      title="Enregistrer un paiement reçu"
      busy={save.isPending}
      onClose={onClose}
      description={
        <>
          Pour <strong className="text-ink">{participant.fullName}</strong> ({participant.rpnNumber}). À utiliser
          quand l'argent est arrivé hors de l'application — espèces, virement vu sur le compte de l'association.
          Le paiement est <strong className="text-ink">confirmé immédiatement</strong> et votre nom est inscrit au
          journal.
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (amountValid) save.mutate();
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-extrabold text-ink">Méthode</legend>
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 rounded-full px-3 py-2 text-[13px] font-extrabold transition-colors',
                  method === m ? 'bg-accent text-accent-contrast' : 'bg-surface-hover text-ink-muted hover:text-ink',
                )}
              >
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <TextField
          label="Montant reçu ($)"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={amount && !amountValid ? 'Montant invalide.' : undefined}
          hint={`Contribution prévue : ${formatCents(defaultAmountCents)}`}
        />
        <TextField
          label="Date de réception"
          type="date"
          value={receivedOn}
          max={todayIso()}
          onChange={(event) => setReceivedOn(event.target.value)}
        />
        <TextField
          label="Référence (optionnel)"
          placeholder="N° de confirmation Interac, n° de reçu…"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-[var(--radius-input)] bg-urgent-bg px-3 py-2 text-[12px] font-semibold text-urgent-ink">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!amountValid}>
            Enregistrer {amountValid ? formatCents(amountCents) : ''}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
