import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setSessionExpiredHandler } from '@/lib/api/client';
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

  useEffect(() => {
    // Once the httpOnly session cookie lands (§9), this is where the silent
    // refresh runs so a reload keeps the user signed in. Until then tokens are
    // memory-only and there is nothing to restore.
    if (!session.canRestoreOnReload) return;
    let cancelled = false;
    void (async () => {
      try {
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
    session.set({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setMember(response.member);
    return response.member;
  }, []);

  const register = useCallback(async (inviteToken: string, fullName: string, password: string) => {
    const response = await authApi.register(inviteToken, fullName, password);
    session.set({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setMember(response.member);
    return response.member;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session.getRefreshToken();
    // Clear locally first: the user is signed out even if the server call fails.
    session.clear();
    setMember(null);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best effort — the refresh token expires server-side regardless.
      }
    }
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
