import { session } from '@/lib/auth/session';

/**
 * Fetches a proof image and returns a blob: URL for <img src>.
 *
 * Why not point <img> straight at the URL: with the local dev stub the proof is served by the API
 * itself and needs the bearer token, and an <img> element cannot carry an Authorization header —
 * it renders a broken image instead.
 *
 * Why the header is conditional: against a real object store (R2/S3) the URL is presigned, and its
 * signature already IS the authorisation. Sending an Authorization header alongside a presigned
 * query string makes S3 reject the request outright — it refuses requests carrying two auth
 * mechanisms. So the token goes only to our own origin, never to the bucket.
 *
 * The caller owns the returned URL and must revoke it.
 */
export async function fetchProofObjectUrl(proofUrl: string, signal?: AbortSignal): Promise<string> {
  const isSameOrigin = new URL(proofUrl, window.location.origin).origin === window.location.origin;
  const accessToken = isSameOrigin ? session.getAccessToken() : null;

  const response = await fetch(proofUrl, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`Preuve inaccessible (${response.status}).`);
  }
  return URL.createObjectURL(await response.blob());
}
