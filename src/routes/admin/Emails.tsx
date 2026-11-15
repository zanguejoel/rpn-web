import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { EmailDto, EmailKind, EmailStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { queries } from '@/lib/query/keys';

const KIND: Record<EmailKind, string> = {
  CASE_ANNOUNCEMENT: 'Annonce de cas',
  DEADLINE_REMINDER: 'Rappel automatique',
  MANUAL_REMINDER: 'Relance',
  PROOF_REJECTED: 'Preuve rejetée',
  INVITATION: 'Invitation',
  PASSWORD_RESET: 'Mot de passe',
};

const STATUS: Record<EmailStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: '⏳ En file', tone: 'pending' },
  SENT: { label: '★ Traité', tone: 'confirmed' },
  FAILED: { label: 'Échec', tone: 'urgent' },
};

/**
 * Everything the system has sent (or would have sent) — announcements, reminders, invitations. Lets a
 * treasurer answer "did Madame X get told?" without asking anyone.
 */
export default function AdminEmails() {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const delivery = useQuery({ queryKey: queries.admin.emailDelivery.queryKey, queryFn: adminApi.emailDelivery });
  const emails = useQuery({
    queryKey: queries.admin.emails(page).queryKey,
    queryFn: () => adminApi.emails(page),
    refetchInterval: 30_000,
  });
  const realDelivery = delivery.data?.realDelivery ?? true;

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Courriels"
        subtitle="Annonces de cas, rappels d'échéance, relances et invitations envoyés par le système."
      />

      {!realDelivery && (
        <div role="status" className="rounded-[var(--radius-card)] border border-pending-ink/30 bg-pending-bg p-4 text-[13px] text-pending-ink">
          <p className="font-extrabold">Mode journal : aucun courriel ne quitte réellement le serveur.</p>
          <p className="mt-1">
            Les messages sont préparés et enregistrés ici, mais l'envoi réel sera activé une fois le nom de domaine et
            le fournisseur de courriel choisis. D'ici là, transmettez les informations importantes par vos canaux
            habituels.
          </p>
        </div>
      )}

      {emails.isLoading ? (
        <LoadingState label="Chargement des courriels…" />
      ) : emails.isError || !emails.data ? (
        <ErrorState message={errorMessage(emails.error)} onRetry={() => void emails.refetch()} />
      ) : emails.data.items.length === 0 ? (
        <EmptyState
          title="Aucun courriel pour l'instant."
          hint="L'ouverture d'un cas, une relance ou une invitation créera les premiers messages."
        />
      ) : (
        <>
          <Card className="p-0">
            <ul className="divide-y divide-border-subtle">
              {emails.data.items.map((e) => (
                <EmailRow key={e.id} email={e} expanded={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
              ))}
            </ul>
          </Card>
          {emails.data.totalPages > 1 && (
            <div className="flex items-center justify-between text-[12px] text-ink-muted">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ← Plus récents
              </Button>
              <span className="tabular">
                Page {page + 1} / {emails.data.totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page + 1 >= emails.data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Plus anciens →
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function EmailRow({ email: e, expanded, onToggle }: { email: EmailDto; expanded: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="w-36 shrink-0 text-[11px] text-ink-muted">{formatDateTime(e.createdAt)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-ink">{e.subject}</span>
          <span className="block truncate text-[11px] text-ink-muted">
            {KIND[e.kind]} · {e.toEmail}
          </span>
        </span>
        <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle bg-surface-sunken px-4 py-3">
          {e.lastError && (
            <p className="mb-2 text-[12px] font-semibold text-urgent-ink">
              Dernière erreur ({e.attempts} tentative{e.attempts > 1 ? 's' : ''}) : {e.lastError}
            </p>
          )}
          <pre className="font-sans text-[12px] leading-relaxed whitespace-pre-wrap text-ink">{e.body}</pre>
        </div>
      )}
    </li>
  );
}
