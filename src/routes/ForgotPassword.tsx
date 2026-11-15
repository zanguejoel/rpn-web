import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The confirmation reads the same whether or not the address has an account — the server answers 202
 * either way — so this page cannot be used to find out who belongs to the association.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailError = submitted && !EMAIL.test(email.trim()) ? 'Adresse courriel invalide' : undefined;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!EMAIL.test(email.trim())) return;
    setBusy(true);
    setServerError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <DemoBanner />
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <Card className="w-full max-w-md">
          {sent ? (
            <div className="text-center">
              <h1 className="font-display text-lg font-bold text-ink">Vérifiez vos courriels</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                Si un compte existe pour <strong className="text-ink">{email.trim()}</strong>, un lien de
                réinitialisation vient d'y être envoyé. Il est valable une heure. Pensez à regarder dans les
                indésirables.
              </p>
              <p className="mt-3 text-[12px] text-ink-muted">
                Rien reçu ? Votre trésorier peut aussi vous aider à retrouver l'accès.
              </p>
              <Link to="/connexion" className="mt-4 inline-block text-[13px] font-extrabold text-accent hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
              <div>
                <h1 className="font-display text-lg font-bold text-ink">Mot de passe oublié</h1>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Indiquez l'adresse courriel de votre compte : nous vous enverrons un lien pour choisir un nouveau
                  mot de passe.
                </p>
              </div>
              <TextField
                label="Adresse courriel"
                type="email"
                autoComplete="email"
                placeholder="exemple@courriel.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={emailError}
              />
              {serverError && (
                <p role="alert" className="text-center text-xs font-semibold text-urgent-ink">{serverError}</p>
              )}
              <Button type="submit" loading={busy}>Envoyer le lien</Button>
              <Link to="/connexion" className="text-center text-[13px] font-extrabold text-accent hover:underline">
                Retour à la connexion
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
