import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingState } from '@/components/ui/States';

/** Any signed-in member. Sends visitors to /connexion, remembering where they were headed. */
export function RequireAuth() {
  const { member, isLoading, justSignedOut } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState label="Vérification de votre session…" />;
  if (!member) {
    // Remember the page only when the session lapsed. After a deliberate sign-out the next person
    // to sign in on this machine is not the one who was on that page.
    return <Navigate to="/connexion" replace {...(justSignedOut ? {} : { state: { from: location.pathname } })} />;
  }
  return <Outlet />;
}

/**
 * Treasurer/admin only.
 *
 * This is a UX guard, not a security boundary: it decides what to render, while
 * every /admin endpoint is independently enforced server-side by @PreAuthorize.
 * A member who forces the URL gets this redirect; a member who forges a request
 * gets a 403 from the API.
 */
export function RequireAdmin() {
  const { member, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState label="Vérification de vos droits…" />;
  if (!member) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * Keeps signed-in users off the login page.
 *
 * This guard — not the login form — decides where a fresh session lands. The
 * form cannot: the moment it sets the member, this guard re-renders and would
 * win the race against any navigate() call inside the submit handler.
 * Order: the page the user was originally denied, else their role's home.
 */
export function RedirectIfAuthenticated() {
  const { member, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (member) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? (isAdmin ? '/admin' : '/')} replace />;
  }
  return <Outlet />;
}
