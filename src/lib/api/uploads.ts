import { session } from '@/lib/auth/session';

/**
 * Fetches a proof image and returns a blob: URL for <img src>.
 *
 * Why not point <img> straight at the presigned URL: the dev storage stub serves
 * proofs from the API itself and requires the bearer token, and an <img> element
 * cannot carry an Authorization header — it renders a broken image instead.
 * Fetching the bytes ourselves works for that stub today and keeps working against
 * a real S3 presigned URL tomorrow (where the header is simply unnecessary).
 *
 * The caller owns the returned URL and must revokeObjectURL it, or the image
 * stays in memory for the life of the tab — which for a banking document is
 * exactly what we do not want.
 */
export async function fetchProofObjectUrl(presignedUrl: string, signal?: AbortSignal): Promise<string> {
  const accessToken = session.getAccessToken();

  const response = await fetch(presignedUrl, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`Preuve inaccessible (${response.status}).`);
  }
  return URL.createObjectURL(await response.blob());
}
