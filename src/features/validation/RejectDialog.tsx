import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import type { ContributionDto } from '@/lib/api/types';

/* A closed list, because free-text reasons are unusable in aggregate and a
   volunteer treasurer should not have to compose a sentence 40 times a week.
   The code is what the member sees first; the note adds the specifics. */
export const REJECTION_CODES = {
  ILLEGIBLE: 'Preuve illisible',
  WRONG_AMOUNT: 'Montant incorrect',
  DUPLICATE: 'Doublon',
  WRONG_CASE: 'Mauvais cas',
  WRONG_BENEFICIARY: 'Bénéficiaire incorrect',
  OTHER: 'Autre',
} as const;

export type RejectionCode = (typeof REJECTION_CODES)[keyof typeof REJECTION_CODES];

interface Props {
  contribution: ContributionDto;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (code: RejectionCode, note: string) => void;
}

export function RejectDialog({ contribution, pending, onCancel, onConfirm }: Props) {
  const [code, setCode] = useState<RejectionCode>(REJECTION_CODES.ILLEGIBLE);
  const [note, setNote] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Escape closes; Tab is trapped inside so focus can't wander behind the overlay.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, select, textarea, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  const noteRequired = code === REJECTION_CODES.OTHER;
  const canSubmit = !pending && (!noteRequired || note.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-raised p-5 shadow-[var(--shadow-raised)]"
      >
        <h2 id="reject-title" className="font-display text-base font-bold text-ink">
          Rejeter cette contribution
        </h2>
        <p className="mt-1 text-[12px] text-ink-muted">
          {contribution.deceasedName} · {formatCents(contribution.amountCents)} · le motif est envoyé
          au membre.
        </p>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="reject-code" className="text-[11px] font-extrabold text-ink">
            Motif
          </label>
          <select
            id="reject-code"
            ref={firstFieldRef}
            value={code}
            onChange={(event) => setCode(event.target.value as RejectionCode)}
            className="h-11 rounded-[var(--radius-input)] border-[1.5px] border-border-subtle bg-surface-raised px-3 text-sm font-semibold text-ink"
          >
            {Object.values(REJECTION_CODES).map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="reject-note" className="text-[11px] font-extrabold text-ink">
            Précision {noteRequired ? '(requise)' : '(optionnelle)'}
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Ce que le membre doit corriger pour soumettre à nouveau."
            className="rounded-[var(--radius-input)] border-[1.5px] border-border-subtle bg-surface-raised p-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-faint"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={!canSubmit}
            onClick={() => onConfirm(code, note.trim())}
          >
            Confirmer le rejet
          </Button>
        </div>
      </div>
    </div>
  );
}
