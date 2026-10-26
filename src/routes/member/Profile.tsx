import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SignOutButton } from '@/components/ui/SignOutButton';
import { TextField } from '@/components/ui/TextField';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatCents, initials } from '@/lib/format';
import { queries } from '@/lib/query/keys';

const schema = z.object({ fullName: z.string().trim().min(2, 'Le nom complet est requis') });
type Values = z.infer<typeof schema>;

const ROLE_LABEL = { MEMBER: 'Membre', TREASURER: 'Trésorier', ADMIN: 'Administrateur' } as const;

export default function Profile() {
  const { member, refreshProfile } = useAuth();
  const summary = useQuery({ queryKey: queries.me.summary.queryKey, queryFn: meApi.summary });
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: member?.fullName ?? '' },
  });

  async function onSubmit(values: Values) {
    setServerError(null);
    setSaved(false);
    try {
      await meApi.update(values.fullName);
      await refreshProfile();
      reset({ fullName: values.fullName });
      setSaved(true);
    } catch (error) {
      setServerError(errorMessage(error, 'Impossible de mettre à jour vos informations.'));
    }
  }

  if (!member) return null;

  return (
    <section className="flex flex-col gap-5">
      <PageHeader title="Profil" />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent-pale font-display text-xl font-bold text-accent">
            {initials(member.fullName)}
          </span>
          <div>
            <p className="font-display text-base font-bold text-ink">{member.fullName}</p>
            <p className="text-[12px] font-bold text-pending-ink">{member.rpnNumber}</p>
            <p className="text-[12px] text-ink-muted">
              {ROLE_LABEL[member.role]} · {member.associationName}
            </p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-2 border-t border-border-subtle pt-3 text-[12px]">
            <div>
              <dt className="text-ink-muted">Confirmé</dt>
              <dd className="tabular font-extrabold text-accent">{formatCents(summary.data?.confirmedCents ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">En attente</dt>
              <dd className="tabular font-extrabold text-ink">{formatCents(summary.data?.pendingCents ?? 0)}</dd>
            </div>
          </dl>
          <div className="w-full border-t border-border-subtle pt-3">
            <SignOutButton variant="full" />
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="flex flex-col gap-4">
              <h2 className="font-display text-sm font-bold text-ink">Informations personnelles</h2>
              <TextField label="Nom complet" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
              <TextField label="Adresse courriel" value={member.email} readOnly disabled hint="Pour changer d'adresse, contactez votre administrateur." />
              <TextField label="Numéro RPN" value={member.rpnNumber} readOnly disabled />

              {serverError && <p role="alert" className="text-[12px] font-semibold text-urgent-ink">{serverError}</p>}
              {saved && <p role="status" className="text-[12px] font-semibold text-confirmed-ink">Vos informations ont été mises à jour.</p>}

              <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="self-start">
                Enregistrer
              </Button>
            </form>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-sm font-bold text-ink">Confidentialité</h2>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Vos preuves de paiement ne sont visibles que par vous et par les trésoriers de votre
              association. Elles sont supprimées automatiquement après la clôture du cas ; seuls le montant
              et la date restent dans votre historique. Pour accéder à vos données, les corriger ou les
              faire effacer, contactez l'administrateur de votre association.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
