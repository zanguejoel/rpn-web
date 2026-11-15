import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';

/** Where the emailed reset link lands. A successful reset signs the member out of every device. */
export default function ResetPassword() {
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordError = submitted && password.length < 8 ? 'Au moins 8 caractères.' : undefined;
  const confirmError = submitted && confirm !== password ? 'Les deux mots de passe diffèrent.' : undefined;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (password.length < 8 || confirm !== password) return;
    setBusy(true);
    setServerError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (error) {
      setServerError(errorMessage(error, 'Ce lien est invalide ou a expiré.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <DemoBanner />
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <Card className="w-full max-w-md">
          {done ? (
            <div className="text-center">
              <h1 className="font-display text-lg font-bold text-ink">Mot de passe modifié</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe. Par sécurité, vos autres
                sessions ont été fermées.
              </p>
              <Link
                to="/connexion"
                className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-accent px-5 text-sm font-extrabold text-accent-contrast hover:bg-accent-hover"
              >
                Se connecter
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
              <div>
                <h1 className="font-display text-lg font-bold text-ink">Nouveau mot de passe</h1>
                <p className="mt-1 text-[13px] text-ink-muted">Choisissez un mot de passe d'au moins 8 caractères.</p>
              </div>
              <TextField
                label="Nouveau mot de passe"
                type="password"
                autoComplete="new-password"
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
                <div role="alert" className="flex flex-col items-center gap-1 text-center text-xs font-semibold text-urgent-ink">
                  <p>{serverError}</p>
                  <Link to="/mot-de-passe-oublie" className="font-extrabold text-accent underline">
                    Recevoir un nouveau lien
                  </Link>
                </div>
              )}
              <Button type="submit" loading={busy}>Enregistrer</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
