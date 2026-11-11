import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import { formatCents } from '@/lib/format';
import { queries } from '@/lib/query/keys';

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Opening a case from the death notice the admin received by email.
 *
 * The participant list is fixed here, at opening: it decides who owes a contribution, who appears on
 * the roster and, once reminders exist, who gets chased. Everyone active is ticked by default; whether
 * the beneficiary's own family contributes is the association's rule to apply case by case.
 */
export default function OpenCase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const members = useQuery({
    queryKey: queries.admin.members(0).queryKey,
    queryFn: () => adminApi.members(0, 200),
  });
  const active = useMemo(
    () => (members.data?.items ?? []).filter((m) => m.status === 'ACTIVE'),
    [members.data],
  );

  const [deceasedName, setDeceasedName] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState(isoDate());
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [amount, setAmount] = useState('50');
  const [deadline, setDeadline] = useState(isoDate(14));
  // null = untouched, meaning every active member; the first tick or untick turns it into an explicit
  // choice that then stands. Derived during render rather than seeded from an effect.
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => chosen ?? new Set(active.map((m) => m.id)), [chosen, active]);
  const setSelected = setChosen;

  const amountCents = Math.round(Number(amount.replace(/\s/g, '').replace(',', '.')) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents > 0;
  const count = selected.size;
  const beneficiaryTicked = beneficiaryId !== '' && selected.has(beneficiaryId);

  const problems = [
    !deceasedName.trim() && 'le nom du défunt',
    !beneficiaryId && 'le membre bénéficiaire',
    !amountValid && 'un montant valide',
    deadline <= isoDate() && 'une échéance dans le futur',
    dateOfDeath > isoDate() && 'une date de décès passée',
    count === 0 && 'au moins un participant',
  ].filter(Boolean) as string[];

  const open = useMutation({
    mutationFn: () =>
      adminApi.openCase({
        deceasedName: deceasedName.trim(),
        dateOfDeath,
        beneficiaryMemberId: beneficiaryId,
        contributionPerMemberCents: amountCents,
        deadline,
        participantIds: [...selected],
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
      void navigate(`/admin/cas/${created.id}`, { replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  function toggle(id: string) {
    setSelected(() => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (members.isLoading) return <LoadingState />;
  if (members.isError) return <ErrorState message={errorMessage(members.error)} onRetry={() => void members.refetch()} />;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link to="/admin/cas" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-extrabold text-accent hover:underline">
        <ArrowLeft size={14} aria-hidden="true" />
        Cas RPN
      </Link>
      <PageHeader
        title="Ouvrir un cas"
        subtitle="À partir de l'avis de décès reçu. Les montants et la liste des participants sont fixés à l'ouverture."
      />

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (problems.length === 0) open.mutate();
        }}
      >
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-bold text-ink">Le défunt</h2>
          <TextField label="Nom du défunt" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} placeholder="NOM Prénom" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Date du décès" type="date" value={dateOfDeath} max={isoDate()} onChange={(e) => setDateOfDeath(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="beneficiary" className="text-[11px] font-extrabold text-ink">Membre concerné (bénéficiaire)</label>
              <select
                id="beneficiary"
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="h-12 rounded-[var(--radius-input)] border-[1.5px] border-border-subtle bg-surface-raised px-3 text-sm font-semibold text-ink"
              >
                <option value="">Choisir…</option>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} · {m.rpnNumber}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-bold text-ink">La collecte</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Contribution par membre ($)"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={amount && !amountValid ? 'Montant invalide.' : undefined}
            />
            <TextField label="Date limite" type="date" value={deadline} min={isoDate(1)} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-ink">Participants ({count} / {active.length})</h2>
            <div className="flex gap-3 text-[12px] font-extrabold">
              <button type="button" className="text-accent hover:underline" onClick={() => setSelected(new Set(active.map((m) => m.id)))}>
                Tout cocher
              </button>
              <button type="button" className="text-ink-muted hover:underline" onClick={() => setSelected(new Set())}>
                Tout décocher
              </button>
            </div>
          </div>
          {beneficiaryTicked && (
            <p className="rounded-[var(--radius-input)] bg-pending-bg px-3 py-2 text-[12px] font-semibold text-pending-ink">
              Le bénéficiaire est coché : il cotisera aussi. Décochez-le si la famille concernée ne contribue pas.
            </p>
          )}
          <ul className="grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
            {active.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-hover">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="font-bold text-ink">{m.fullName}</span>
                  <span className="tabular text-[11px] text-ink-muted">{m.rpnNumber}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3 bg-accent-pale">
          <div>
            <p className="text-[12px] font-bold text-ink-muted">Objectif de la collecte</p>
            <p className="tabular font-display text-2xl font-bold text-accent">
              {amountValid ? formatCents(amountCents * count) : '—'}
            </p>
            <p className="text-[11px] text-ink-muted">
              {count} participant(s) × {amountValid ? formatCents(amountCents) : '—'}
            </p>
          </div>
          <Button type="submit" loading={open.isPending} disabled={problems.length > 0}>
            Ouvrir le cas
          </Button>
        </Card>

        {problems.length > 0 && (
          <p className="text-[12px] text-ink-muted">Pour ouvrir le cas, indiquez {problems.join(', ')}.</p>
        )}
        {error && (
          <p role="alert" className="rounded-[var(--radius-input)] bg-urgent-bg px-3 py-2 text-[12px] font-semibold text-urgent-ink">
            {error}
          </p>
        )}
        <p className="text-[12px] text-ink-muted">
          L'annonce par courriel aux membres arrive à la prochaine étape. En attendant, prévenez-les comme
          d'habitude : le cas apparaît dès maintenant dans leur application.
        </p>
      </form>
    </section>
  );
}
