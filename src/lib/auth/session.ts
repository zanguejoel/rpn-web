/* Where the browser keeps its credentials.
 *
 * THE RULE: no token ever touches localStorage or sessionStorage. This app puts
 * other members' bank screenshots on screen; a single XSS would otherwise hand an
 * attacker a long-lived refresh token. Web is not mobile — the mobile app can use
 * the OS Keychain (expo-secure-store), the browser has no equivalent.
 *
 * CURRENT STATE (interim): both tokens live in a module-level variable, so they
 * die with the tab. That is safe but means a page reload signs you out.
 *
 * TARGET (§9 of rpn-web-project-plan.md): the refresh token moves into an
 * httpOnly + Secure + SameSite=Strict cookie that JavaScript cannot read, set by
 * a new POST /auth/session endpoint on rpn-backend. The access token stays in
 * memory exactly as it is now, and reload-survival comes from a silent refresh
 * against that cookie at boot.
 *
 * Everything outside this module goes through these functions, so that migration
 * changes this file and nothing else.
 */

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

let tokens: SessionTokens | null = null;

/** Subscribers are notified when the session is established or torn down. */
type Listener = (hasSession: boolean) => void;
const listeners = new Set<Listener>();

export const session = {
  getAccessToken(): string | null {
    return tokens?.accessToken ?? null;
  },

  getRefreshToken(): string | null {
    return tokens?.refreshToken ?? null;
  },

  set(next: SessionTokens): void {
    tokens = next;
    listeners.forEach((listener) => listener(true));
  },

  clear(): void {
    tokens = null;
    listeners.forEach((listener) => listener(false));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * True once the cookie-backed session lands: a reload can then recover the
   * session from the httpOnly cookie instead of dropping the user at /login.
   */
  get canRestoreOnReload(): boolean {
    return false;
  },
};
