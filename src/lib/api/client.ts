import { session } from '@/lib/auth/session';
import type { LoginResponse } from './types';

/* Same-origin by design: Vite proxies /api to rpn-api in dev, and production
   serves both from one host (§9). That is what allows an httpOnly session
   cookie without third-party-cookie or CORS-preflight problems. */
export const API_BASE = '/api/v1';

/** Thrown for any non-2xx response, carrying the RFC 9457 problem detail. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | undefined;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

interface ProblemDetail {
  title?: string;
  detail?: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetail = {};
  try {
    problem = (await response.json()) as ProblemDetail;
  } catch {
    // Not every error body is problem+json (a proxy 502, for instance).
  }
  const message = problem.detail ?? problem.title ?? response.statusText;
  return new ApiError(response.status, message, problem.detail);
}

let onSessionExpired: (() => void) | null = null;

/** Registered once by the auth provider so a dead session can bounce to /login. */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as LoginResponse;
    session.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Extra headers, e.g. an Idempotency-Key on a declaration. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions, isRetry = false): Promise<Response> {
  const accessToken = session.getAccessToken();
  const headers: Record<string, string> = { ...options.headers };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  // Marks the request as same-origin XHR. Once the session moves to a cookie this
  // header is also the CSRF guard: a cross-site form post cannot set it.
  headers['X-Requested-With'] = 'rpn-web';

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    ...(options.signal ? { signal: options.signal } : {}),
  });

  // One refresh attempt, shared across concurrent 401s, never on /auth/* itself.
  if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;

    if (!refreshed) {
      session.clear();
      onSessionExpired?.();
      throw await toApiError(response);
    }
    return send(path, options, true);
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    apiRequest<T>(path, signal ? { signal } : {}),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'POST', body, ...(headers ? { headers } : {}) }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/** Turns any thrown value into something safe to render in French. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.message === 'Failed to fetch') {
      return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    }
    return error.message || fallback;
  }
  if (error instanceof TypeError) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return fallback;
}
