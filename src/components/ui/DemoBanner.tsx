import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface PublicConfig {
  demo: boolean;
}

/**
 * Permanent notice that this deployment is a demonstration.
 *
 * The demo publishes its own credentials, so anyone with the link can sign in and see what look
 * like other members' payment proofs. The banner exists so nobody mistakes it for the real system
 * and uploads a genuine Interac receipt — which is the one way a fictional environment turns into
 * a real data leak.
 */
export function DemoBanner() {
  const config = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api.get<PublicConfig>('/config'),
    staleTime: Infinity,
    retry: false,
  });

  if (!config.data?.demo) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 bg-pending-bg px-3 py-1.5 text-center text-[11px] font-bold text-pending-ink"
    >
      <span>DÉMONSTRATION — données fictives, réinitialisées chaque nuit.</span>
      <span className="font-semibold">
        N'y déposez aucune vraie preuve de paiement.
      </span>
    </div>
  );
}
