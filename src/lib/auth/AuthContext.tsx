import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { refreshSession, setSessionExpiredHandler } from '@/lib/api/client';
import { authApi, meApi } from '@/lib/api/endpoints';
import { session } from './session';
import { ADMIN_ROLES, type MemberDto } from '@/lib/api/types';

interface AuthValue {
  member: MemberDto | null;
  /** True while the boot-time session restore is still running. */
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<MemberDto>;
  register: (inviteToken: string, fullName: string, password: string) => Promise<MemberDto>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberDto | null>(null);
  const [isLoading, setIsLoading] = useState(session.canRestoreOnReload);

  useEffect(() => {
    setSessionExpiredHandler(() => setMember(null));
  }, []);

  /* Boot-time session recovery. The page holds no persisted token, so it asks the server whether
     the browser is still carrying a valid refresh cookie. A failure here is the ordinary
     "not signed in" path, not an error worth surfacing. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const restored = await refreshSession();
        if (!restored || cancelled) return;
        const profile = await meApi.profile();
        if (!cancelled) setMember(profile);
      } catch {
        session.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    session.set(response.accessToken);
    setMember(response.member);
    return response.member;
  }, []);

  const register = useCallback(async (inviteToken: string, fullName: string, password: string) => {
    const response = await authApi.register(inviteToken, fullName, password);
    session.set(response.accessToken);
    setMember(response.member);
    return response.member;
  }, []);

  const logout = useCallback(async () => {
    /* Order matters: the server call must go first, because it is the only thing that can clear an
       httpOnly cookie — the page cannot. Clearing local state first would leave the browser still
       holding a valid refresh cookie that a reload would happily use to sign back in. */
    try {
      await authApi.logout();
    } catch {
      // Best effort: even if it fails the local session goes, and the token expires server-side.
    }
    session.clear();
    setMember(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    setMember(await meApi.profile());
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      member,
      isLoading,
      isAdmin: member !== null && ADMIN_ROLES.includes(member.role),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [member, isLoading, login, register, logout, refreshProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}
