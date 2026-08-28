import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { adminApi } from '@/lib/api/endpoints';
import { fetchProofObjectUrl } from '@/lib/api/uploads';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

/**
 * Displays a payment proof — a banking document.
 *
 * Deliberate constraints (§11 of the plan):
 *  - the presigned URL is short-lived (60 s server-side) and is refetched, never cached;
 *  - the viewer's name and the timestamp are burnt over the image, so a screenshot
 *    that leaks is attributable to whoever took it;
 *  - there is no download control and no bulk export anywhere in this app.
 *
 * Still owed by the backend: an access-log write per view. Until `audit_log`
 * exists (phase 2), viewing a proof leaves no trace — which is exactly the gap
 * the audit table is meant to close.
 */
export function ProofViewer({ contributionId }: { contributionId: string }) {
  const { member } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);


  const proof = useQuery({
    queryKey: ['proof', contributionId],
    queryFn: async ({ signal }) => {
      const { url } = await adminApi.proofUrl(contributionId);
      return fetchProofObjectUrl(url, signal);
    },
    // Presigned URLs are short-lived; never serve one from cache.
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });

  const objectUrl = proof.data;

  /* The watermark records when this document was actually retrieved. Derived from
     the fetch timestamp rather than a clock read during render: stable across
     re-renders, and it re-stamps naturally when a different proof loads. */
  const openedAt = useMemo(
    () => (proof.dataUpdatedAt ? formatDateTime(new Date(proof.dataUpdatedAt).toISOString()) : ''),
    [proof.dataUpdatedAt],
  );

  /* Free the previous proof's blob when a new one replaces it, so working through
     a long queue does not accumulate members' bank documents in memory.
     Deliberately NOT `return () => revoke(objectUrl)`: StrictMode double-invokes
     effects in development, and that form revokes the URL still bound to the
     <img>, leaving a silently broken image. The final blob is released by the
     browser on document unload. */
  const previousUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousUrlRef.current;
    if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
    previousUrlRef.current = objectUrl ?? null;
  }, [objectUrl]);

  if (proof.isLoading) return <LoadingState label="Chargement de la preuve…" />;
  if (proof.isError) {
    return (
      <ErrorState
        message={errorMessage(proof.error, "Impossible de charger la preuve de paiement.")}
        onRetry={() => void proof.refetch()}
      />
    );
  }

  return (
    <figure className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-1">
        <ViewerButton label="Réduire" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
          <ZoomOut size={15} aria-hidden="true" />
        </ViewerButton>
        <ViewerButton label="Agrandir" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          <ZoomIn size={15} aria-hidden="true" />
        </ViewerButton>
        <ViewerButton label="Pivoter" onClick={() => setRotation((r) => (r + 90) % 360)}>
          <RotateCw size={15} aria-hidden="true" />
        </ViewerButton>
        <ViewerButton
          label="Ajuster à la fenêtre"
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
        >
          <Maximize2 size={15} aria-hidden="true" />
        </ViewerButton>
        <span className="tabular ml-auto text-[11px] text-ink-muted">{Math.round(zoom * 100)} %</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto rounded-[var(--radius-input)] bg-surface-sunken">
        <img
          src={objectUrl}
          alt="Preuve de paiement déclarée par le membre"
          className="mx-auto block origin-top transition-transform"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
        />

        {/* Attribution watermark — deters casual screenshotting of a member's bank details. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        >
          <p className="rotate-[-24deg] text-center font-display text-lg font-bold text-ink/10">
            {member?.fullName ?? 'RPN'}
            <br />
            <span className="text-sm">{openedAt}</span>
          </p>
        </div>
      </div>

      <figcaption className="text-[11px] text-ink-faint">
        Document confidentiel. Sa consultation est destinée à la validation uniquement.
      </figcaption>
    </figure>
  );
}

function ViewerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink"
    >
      {children}
    </button>
  );
}
