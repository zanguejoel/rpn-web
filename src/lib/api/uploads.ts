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

/* ------------------------------------------------------------------------------------------------
 * Sending a proof
 * ---------------------------------------------------------------------------------------------- */

const PROOF_MAX_EDGE = 1600;
const PROOF_JPEG_QUALITY = 0.7;
export const PROOF_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
/** Rejected before any work is done: a 40 MB camera original is not a screenshot of a receipt. */
export const PROOF_MAX_INPUT_BYTES = 15 * 1024 * 1024;

export class ProofError extends Error {}

/**
 * Shrinks a proof to something a phone on mobile data can send, and re-encodes it as JPEG.
 *
 * Re-encoding also drops EXIF — GPS position and device details embedded in a photo that the
 * treasurer has no business receiving along with a member's bank screenshot.
 */
export async function prepareProof(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new ProofError('Ce fichier n\'est pas une image. Joignez une capture d\'écran ou une photo du reçu.');
  }
  if (file.size > PROOF_MAX_INPUT_BYTES) {
    throw new ProofError('Image trop volumineuse (15 Mo maximum).');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ProofError('Impossible de lire cette image. Essayez une capture d\'écran au format PNG ou JPEG.');
  }

  const scale = Math.min(1, PROOF_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new ProofError('Votre navigateur ne permet pas de préparer l\'image.');

  // A flat white ground: a transparent PNG would otherwise turn black when flattened to JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PROOF_JPEG_QUALITY),
  );
  if (!blob) throw new ProofError('La préparation de l\'image a échoué.');
  return blob;
}

/**
 * PUT to the presigned URL.
 *
 * Mirrors fetchProofObjectUrl: the bearer token goes only to our own origin. A real bucket rejects
 * a presigned request that also carries Authorization, so it must never be sent there.
 */
export async function uploadProof(uploadUrl: string, blob: Blob): Promise<void> {
  const isSameOrigin = new URL(uploadUrl, window.location.origin).origin === window.location.origin;
  const accessToken = isSameOrigin ? session.getAccessToken() : null;

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        // Must match the type the URL was signed for, or the bucket refuses the upload.
        'Content-Type': blob.type,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: blob,
    });
  } catch {
    throw new ProofError('Envoi impossible. Vérifiez votre connexion et réessayez.');
  }
  if (!response.ok) {
    throw new ProofError(`Le dépôt de la preuve a échoué (${response.status}). Réessayez.`);
  }
}
