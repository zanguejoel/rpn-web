import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { FlagStripe } from '@/components/ui/FlagStripe';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { InvitationStatus } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthContext';

const UNUSABLE: Record<InvitationStatus, string> = {
  PENDING: "Ce lien n'est pas valide.",
  USED: 'Cette invitation a déjà servi à créer un compte. Connectez-vous avec votre adresse courriel.',
  EXPIRED: "Cette invitation a expiré. Demandez à votre trésorier de vous la renvoyer.",
  REVOKED: "Cette invitation a été annulée. Contactez votre trésorier si c'est une erreur.",
};

/**
 * Where an invitation link lands. Deliberately outside the auth guards: a treasurer testing a link in
 * their own browser should see what happened, not be bounced silently to their dashboard.
 */
export default function AcceptInvitation() {
  const { token = '' } = useParams();
  const { member, register, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => authApi.invitation(token),
    enabled: token !== '',
    retry: false,
  });

  const nameError = submitted && fullName.trim().length < 2 ? 'Indiquez votre nom complet.' : undefined;
  const passwordError = submitted && password.length < 8 ? 'Au moins 8 caractères.' : undefined;
  const confirmError = submitted && confirm !== password ? 'Les deux mots de passe diffèrent.' : undefined;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (fullName.trim().length < 2 || password.length < 8 || confirm !== password) return;
    setBusy(true);
    setServerError(null);
    try {
      await register(token, fullName.trim(), password);
      void navigate('/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error, "Impossible de créer le compte. Le lien n'est peut-être plus valide."));
    } finally {
      setBusy(false);
    }
  }

  let content: React.ReactNode;
  if (member) {
    content = (
      <>
        <h1 className="font-display text-lg font-bold text-ink">Vous êtes déjà connecté</h1>
        <p className="mt-2 text-[13px] text-ink-muted">
          Session ouverte au nom de <strong>{member.fullName}</strong>. Pour accepter cette invitation, déconnectez-vous
          d'abord.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => void logout()}>Se déconnecter</Button>
          <Link to="/" className="inline-flex min-h-11 items-center px-4 text-sm font-extrabold text-accent">
            Retour à l'accueil
          </Link>
        </div>
      </>
    );
  } else if (preview.isLoading) {
    content = <LoadingState label="Vérification de l'invitation…" />;
  } else if (preview.isError || !preview.data) {
    content = <Problem message="Ce lien d'invitation est invalide. Vérifiez qu'il a été copié en entier." />;
  } else if (!preview.data.usable) {
    content = <Problem message={UNUSABLE[preview.data.status]} />;
  } else {
    const p = preview.data;
    content = (
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4 text-left">
        <div className="text-center">
          <h1 className="font-display text-lg font-bold text-ink">Rejoindre {p.associationName}</h1>
          <p className="mt-1 text-[12px] text-ink-muted">
            Invitation pour <strong className="text-ink">{p.email}</strong>
            {p.role !== 'MEMBER' && <> · rôle {p.role === 'ADMIN' ? 'administrateur' : 'trésorier'}</>}
          </p>
        </div>
        <TextField
          label="Nom complet"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={nameError}
        />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          hint="Au moins 8 caractères."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
        />
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={confirmError}
        />
        {serverError && (
          <p role="alert" className="text-center text-xs font-semibold text-urgent-ink">{serverError}</p>
        )}
        <Button type="submit" loading={busy}>Créer mon compte</Button>
      </form>
    );
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-surface-sunken to-accent-pale">
      <DemoBanner />
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <main className="w-full max-w-[420px]">
          <FlagStripe className="mx-auto mb-5 w-20 overflow-hidden rounded-sm" />
          <Card className="text-center">{content}</Card>
        </main>
      </div>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <>
      <h1 className="font-display text-lg font-bold text-ink">Invitation indisponible</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{message}</p>
      <Link to="/connexion" className="mt-4 inline-block text-[13px] font-extrabold text-accent hover:underline">
        Aller à la connexion
      </Link>
    </>
  );
}
