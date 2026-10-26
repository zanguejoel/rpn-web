import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { METHOD_LABEL } from '@/components/ContributionRow';
import { casesApi, contributionsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import { ProofError, prepareProof, uploadProof } from '@/lib/api/uploads';
import type { ContributionMethod } from '@/lib/api/types';
import { formatCents } from '@/lib/format';
import { queries } from '@/lib/query/keys';
import { cn } from '@/lib/cn';

const METHODS: ContributionMethod[] = ['INTERAC', 'TRANSFER', 'CASH'];

interface UploadedProof {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export default function DeclareContribution() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: queries.cases.detail(caseId).queryKey,
    queryFn: () => casesApi.detail(caseId),
    enabled: caseId !== '',
  });

  const [method, setMethod] = useState<ContributionMethod>('INTERAC');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* One idempotency key per attempt, held for the life of this screen, so a retry after a flaky
     network can never turn one declaration into two. A rejected proof is resubmitted from a fresh
     screen, which gets a fresh key. */
  const idempotencyKey = useRef(crypto.randomUUID());

  /* If the file reached the bucket but the declaration call failed, the retry must reuse that upload
     rather than send the proof again under a new key. */
  const uploaded = useRef<UploadedProof | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFile = useCallback((next: File | null) => {
    setError(null);
    uploaded.current = null; // a different file invalidates any earlier upload
    setFile(next);
  }, []);

  // Ctrl+V of a screenshot is the natural gesture on a computer.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (image) chooseFile(image);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [chooseFile]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!file || !detail.data) throw new ProofError('Joignez une preuve de paiement.');

      if (!uploaded.current) {
        const prepared = await prepareProof(file);
        const presigned = await contributionsApi.presign(prepared.type, prepared.size);
        await uploadProof(presigned.uploadUrl, prepared);
        uploaded.current = {
          storageKey: presigned.storageKey,
          sizeBytes: prepared.size,
          mimeType: prepared.type,
        };
      }

      return contributionsApi.declare(caseId, idempotencyKey.current, {
        amountCents: detail.data.contributionPerMemberCents,
        method,
        reference: reference.trim() || undefined,
        ...uploaded.current,
      });
    },
    onSuccess: async () => {
      // A declaration changes the case, the member's lists and their totals.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
      ]);
      void navigate(`/cas/${caseId}`, { replace: true });
    },
    onError: (err) => setError(err instanceof ProofError ? err.message : errorMessage(err)),
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError || !detail.data) {
    return <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />;
  }
  const c = detail.data;

  if (c.status === 'CLOSED' || (c.myContribution && c.myContribution.status !== 'REJECTED')) {
    return (
      <ErrorState message="Vous ne pouvez plus déclarer de paiement pour ce cas : il est clôturé ou déjà déclaré." />
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link
        to={`/cas/${c.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-accent hover:underline"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {c.deceasedName}
      </Link>

      <div>
        <h1 className="font-display text-xl font-bold text-ink">Déclarer un paiement</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          {c.caseNumber} · payez d'abord hors de l'application, puis joignez la preuve.
        </p>
      </div>

      <Card className="flex items-center justify-between bg-accent-pale">
        <span className="text-[12px] font-bold text-ink-muted">Montant à déclarer</span>
        <span className="tabular font-display text-2xl font-bold text-accent">
          {formatCents(c.contributionPerMemberCents)}
        </span>
      </Card>

      <Card className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-extrabold text-ink">Méthode de paiement</legend>
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 rounded-full px-3 py-2.5 text-[13px] font-extrabold transition-colors',
                  method === m ? 'bg-accent text-accent-contrast' : 'bg-surface-hover text-ink-muted hover:text-ink',
                )}
              >
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <TextField
          label="Référence (optionnel)"
          placeholder="N° de confirmation Interac…"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-extrabold text-ink">Preuve de paiement</span>

          {file && previewUrl ? (
            <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-surface-sunken">
              <img src={previewUrl} alt="Aperçu de la preuve choisie" className="mx-auto max-h-72 object-contain" />
              <button
                type="button"
                onClick={() => chooseFile(null)}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface-raised text-ink shadow-[var(--shadow-card)] hover:text-urgent-ink"
                aria-label="Retirer cette image"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const dropped = event.dataTransfer.files[0];
                if (dropped) chooseFile(dropped);
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed px-4 py-10 text-center transition-colors',
                dragging ? 'border-accent bg-accent-pale' : 'border-border-strong hover:bg-surface-hover',
              )}
            >
              <ImagePlus size={26} className="text-ink-muted" aria-hidden="true" />
              <span className="text-[13px] font-extrabold text-ink">Ajouter une preuve de paiement</span>
              <span className="text-[12px] text-ink-muted">
                Glissez une image ici, collez une capture (Ctrl+V) ou cliquez pour parcourir
              </span>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              chooseFile(event.target.files?.[0] ?? null);
              event.target.value = ''; // allow choosing the same file again after removing it
            }}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-[var(--radius-input)] bg-urgent-bg px-3 py-2 text-[12px] font-semibold text-urgent-ink">
            {error}
          </p>
        )}

        <Button onClick={() => submit.mutate()} loading={submit.isPending} disabled={!file}>
          Soumettre ma preuve
        </Button>
      </Card>
    </section>
  );
}
