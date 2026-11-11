import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { queries } from '@/lib/query/keys';

export default function AdminSettings() {
  const { member } = useAuth();
  const isAdmin = member?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const settings = useQuery({ queryKey: queries.admin.settings.queryKey, queryFn: adminApi.settings });
  // null = untouched, so the field shows the saved value; editing creates a draft. Deriving it during
  // render avoids copying fetched data into state in an effect (an extra render, and a stale copy).
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const stored = settings.data?.paymentInstructions ?? '';
  const instructions = draft ?? stored;

  const save = useMutation({
    mutationFn: () => adminApi.updateSettings(instructions),
    onSuccess: async () => {
      setSaved(true);
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  if (settings.isLoading) return <LoadingState />;
  if (settings.isError) return <ErrorState message={errorMessage(settings.error)} onRetry={() => void settings.refetch()} />;

  const dirty = draft !== null && draft !== stored;

  return (
    <section className="flex max-w-3xl flex-col gap-5">
      <PageHeader title="Paramètres" subtitle={settings.data?.associationName} />

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-sm font-bold text-ink">Instructions de paiement</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Affichées aux membres sur chaque cas ouvert : où et comment envoyer leur contribution.
            Seul un administrateur peut les modifier, et chaque changement est inscrit au journal.
          </p>
        </div>
        <label htmlFor="instructions" className="sr-only">Instructions de paiement</label>
        <textarea
          id="instructions"
          rows={6}
          maxLength={2000}
          value={instructions}
          readOnly={!isAdmin}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          placeholder={'Virement Interac à tresorerie@association.org\nQuestion de sécurité : nom du défunt\nIndiquez votre numéro RPN dans le message.'}
          className="rounded-[var(--radius-input)] border-[1.5px] border-border-subtle bg-surface-raised p-3 text-sm font-semibold text-ink read-only:bg-surface-sunken read-only:text-ink-muted placeholder:font-normal placeholder:text-ink-faint"
        />
        {!isAdmin && <p className="text-[12px] text-ink-muted">Lecture seule : réservé aux administrateurs.</p>}
        {save.isError && <p role="alert" className="text-[12px] font-semibold text-urgent-ink">{errorMessage(save.error)}</p>}
        {saved && !dirty && <p role="status" className="text-[12px] font-semibold text-confirmed-ink">Enregistré.</p>}
        {isAdmin && (
          <Button className="self-start" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
            Enregistrer
          </Button>
        )}
      </Card>
    </section>
  );
}
