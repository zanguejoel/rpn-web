/* Where the browser keeps its credentials.
 *
 * THE RULE: no token ever touches localStorage or sessionStorage. Both are readable by any script,
 * and this application renders other members' banking documents — one XSS would otherwise hand an
 * attacker a 30-day refresh credential.
 *
 * How it works now:
 *   - the refresh token lives in an httpOnly + Secure + SameSite=Strict cookie set by the server
 *     (POST /auth/session). This module cannot read it, and neither can an attacker's script;
 *   - the access token is held here, in memory only, and dies with the tab;
 *   - a page reload therefore has no stored token, but CAN recover the session: the browser sends
 *     the cookie to /auth/session/refresh automatically, which returns a fresh access token.
 *
 * The native mobile app does the opposite — OS keychain, JSON token endpoints — because a browser
 * has no keychain and a phone has no cookie jar worth trusting.
 */

let accessToken: string | null = null;

type Listener = (hasSession: boolean) => void;
const listeners = new Set<Listener>();

export const session = {
  getAccessToken(): string | null {
    return accessToken;
  },

  set(token: string): void {
    accessToken = token;
    listeners.forEach((listener) => listener(true));
  },

  clear(): void {
    accessToken = null;
    listeners.forEach((listener) => listener(false));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * True now that the refresh token is cookie-backed: a reload can recover the session by asking
   * the server, instead of dropping the user at the login screen.
   */
  get canRestoreOnReload(): boolean {
    return true;
  },
};
