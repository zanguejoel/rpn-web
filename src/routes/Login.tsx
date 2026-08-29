import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { FlagStripe } from '@/components/ui/FlagStripe';
import { useAuth } from '@/lib/auth/AuthContext';
import { errorMessage } from '@/lib/api/client';

const schema = z.object({
  email: z.string().min(1, "L'adresse courriel est requise").email('Adresse courriel invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      // No navigation here: RedirectIfAuthenticated routes the new session,
      // sending treasurers to /admin and members to their home screen.
      await login(values.email, values.password);
    } catch (error) {
      setServerError(errorMessage(error, 'Adresse courriel ou mot de passe invalide.'));
    }
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-surface-sunken to-accent-pale">
      <DemoBanner />
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <main className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-full border-[3px] border-flag-yellow bg-surface-raised text-3xl">
            <span aria-hidden="true">🇨🇲</span>
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-ink">Bienvenue dans RPN</h1>
          <FlagStripe className="mt-2 w-20 overflow-hidden rounded-sm" />
          <p className="mt-2 text-xs font-semibold text-ink-muted">
            Gérez vos contributions · Association Côte-Nord
          </p>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          noValidate
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-5 shadow-[var(--shadow-card)]"
        >
          <TextField
            label="Adresse courriel"
            type="email"
            autoComplete="email"
            placeholder="exemple@courriel.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <TextField
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="text-[11px] font-extrabold text-accent"
              >
                {showPassword ? 'Cacher' : 'Voir'}
              </button>
            }
            {...register('password')}
          />

          <Link
            to="/mot-de-passe-oublie"
            className="-mt-1 self-end text-xs font-extrabold text-flag-red hover:underline"
          >
            Mot de passe oublié ?
          </Link>

          {serverError && (
            <p role="alert" className="text-center text-xs font-semibold text-urgent-ink">
              {serverError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Se connecter
          </Button>

          <p className="text-center text-[11px] text-ink-muted">
            Première fois ? Contactez votre administrateur RPN pour recevoir votre invitation.
          </p>
        </form>
        </main>
      </div>
    </div>
  );
}
