import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/cn';

/**
 * Sign-out has to exist in the shell, not only on the profile screen: on a shared machine — and on
 * the demo, where the credentials are published — leaving the session open is the failure mode.
 */
export function SignOutButton({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await logout();
    } finally {
      // The route guard sends the user to /connexion once member becomes null.
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onSignOut()}
      disabled={busy}
      title="Se déconnecter"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-bold text-ink-muted transition-colors',
        'hover:bg-surface-hover hover:text-urgent-ink disabled:opacity-60',
        variant === 'full' ? 'w-full px-2.5 py-2 text-[13px]' : 'size-9 justify-center',
      )}
    >
      <LogOut size={16} aria-hidden="true" />
      {variant === 'full' ? 'Se déconnecter' : <span className="sr-only">Se déconnecter</span>}
    </button>
  );
}
