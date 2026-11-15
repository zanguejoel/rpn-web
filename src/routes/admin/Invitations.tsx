import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { adminApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/client';
import type { InvitationDto, InvitationStatus, Role } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDate } from '@/lib/format';
import { queries } from '@/lib/query/keys';

const ROLE_LABEL: Record<Role, string> = { MEMBER: 'Membre', TREASURER: 'Trésorier', ADMIN: 'Administrateur' };

const STATUS: Record<InvitationStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'En attente', tone: 'pending' },
  USED: { label: '★ Acceptée', tone: 'confirmed' },
  EXPIRED: { label: 'Expirée', tone: 'neutral' },
  REVOKED: { label: 'Révoquée', tone: 'urgent' },
};

export default function AdminInvitations() {
  const { member } = useAuth();
  // The server enforces this too: a treasurer who forges a TREASURER invite gets a 403.
  const canChooseRole = member?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [revoking, setRevoking] = useState<InvitationDto | null>(null);

  const list = useQuery({ queryKey: queries.admin.invitations.queryKey, queryFn: adminApi.invitations });
  const delivery = useQuery({ queryKey: queries.admin.emailDelivery.queryKey, queryFn: adminApi.emailDelivery });
  const realDelivery = delivery.data?.realDelivery ?? true;

  const refresh = () => queryClient.invalidateQueries({ queryKey: queries.admin.invitations.queryKey });

  const invite = useMutation({
    mutationFn: () => adminApi.invite(email.trim(), canChooseRole ? role : 'MEMBER'),
    onSuccess: async (created) => {
      if (created.inviteUrl) setLink({ email: created.email, url: created.inviteUrl });
      setEmail('');
      setRole('MEMBER');
      await refresh();
    },
  });
  const resend = useMutation({
    mutationFn: (id: string) => adminApi.resendInvitation(id),
    onSuccess: async (updated) => {
      if (updated.inviteUrl) setLink({ email: updated.email, url: updated.inviteUrl });
      await refresh();
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.revokeInvitation(id),
    onSuccess: async () => {
      setRevoking(null);
      await refresh();
    },
  });

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Invitations"
        subtitle="Un nouveau membre reçoit un lien personnel, valable 14 jours, pour créer son compte."
      />

      <Card>
        <form
          noValidate
          className="flex flex-col gap-4 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (email.trim()) invite.mutate();
          }}
        >
          <div className="flex-1">
            <TextField
              label="Adresse courriel"
              type="email"
              autoComplete="off"
              placeholder="nouveau.membre@courriel.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {canChooseRole && (
            <label className="flex flex-col gap-1.5 text-[11px] font-extrabold text-ink">
              Rôle
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="h-12 rounded-[var(--radius-input)] border-[1.5px] border-border-subtle bg-surface-raised px-3 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
              >
                <option value="MEMBER">Membre</option>
                <option value="TREASURER">Trésorier</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </label>
          )}
          <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
            Envoyer l'invitation
          </Button>
        </form>
        {!canChooseRole && (
          <p className="mt-3 text-[11px] text-ink-muted">
            Les trésoriers invitent des membres. Seul un administrateur peut inviter un trésorier ou un administrateur.
          </p>
        )}
        {invite.isError && (
          <p role="alert" className="mt-3 text-[12px] font-semibold text-urgent-ink">
            {errorMessage(invite.error)}
          </p>
        )}
      </Card>

      {link && (
        <InviteLinkCard email={link.email} url={link.url} realDelivery={realDelivery} onDismiss={() => setLink(null)} />
      )}

      {list.isLoading ? (
        <LoadingState label="Chargement des invitations…" />
      ) : list.isError || !list.data ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState title="Aucune invitation pour l'instant." hint="Les invitations envoyées apparaîtront ici avec leur statut." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-border-subtle text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3">Courriel</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Envoyée</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {list.data.map((i) => (
                <tr key={i.id} className="align-top hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-ink">{i.email}</p>
                    {i.invitedByName && <p className="text-[11px] text-ink-muted">par {i.invitedByName}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{ROLE_LABEL[i.role]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                    {i.status === 'PENDING' && (
                      <p className="mt-1 text-[11px] text-ink-muted">expire le {formatDate(i.expiresAt)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(i.createdAt)}</td>
                  <td className="px-4 py-3">
                    {(i.status === 'PENDING' || i.status === 'EXPIRED') && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={resend.isPending && resend.variables === i.id}
                          onClick={() => resend.mutate(i.id)}
                        >
                          Renvoyer
                        </Button>
                        {i.status === 'PENDING' && (
                          <Button size="sm" variant="ghost" onClick={() => setRevoking(i)}>
                            Révoquer
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resend.isError && (
            <p role="alert" className="px-4 pb-3 text-[12px] font-semibold text-urgent-ink">
              {errorMessage(resend.error)}
            </p>
          )}
        </Card>
      )}

      {revoking && (
        <Dialog
          title="Révoquer cette invitation ?"
          busy={revoke.isPending}
          onClose={() => setRevoking(null)}
          description={
            <>
              Le lien envoyé à <strong>{revoking.email}</strong> cessera de fonctionner. Vous pourrez inviter cette
              adresse à nouveau plus tard.
            </>
          }
        >
          {revoke.isError && (
            <p role="alert" className="mb-3 text-[12px] font-semibold text-urgent-ink">{errorMessage(revoke.error)}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRevoking(null)} disabled={revoke.isPending}>
              Annuler
            </Button>
            <Button variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(revoking.id)}>
              Révoquer
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

/**
 * The link is shown once, right after it is created. Until real email delivery is switched on the
 * treasurer must pass it on themselves (WhatsApp, SMS…), so the copy button matters more than it looks.
 */
function InviteLinkCard({
  email,
  url,
  realDelivery,
  onDismiss,
}: {
  email: string;
  url: string;
  realDelivery: boolean;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="border-l-4 border-l-accent">
      <p className="text-[13px] font-extrabold text-ink">Invitation prête pour {email}</p>
      <p className="mt-1 text-[12px] text-ink-muted">
        {realDelivery
          ? 'Un courriel contenant ce lien vient de lui être envoyé. Vous pouvez aussi le transmettre vous-même.'
          : "Les courriels ne sont pas encore réellement envoyés : transmettez ce lien vous-même (WhatsApp, SMS, courriel personnel)."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label="Lien d'invitation"
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-[var(--radius-input)] border border-border-subtle bg-surface-sunken px-3 font-mono text-[12px] text-ink"
        />
        <Button
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => setCopied(true));
          }}
        >
          {copied ? 'Copié ✓' : 'Copier le lien'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Fermer
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">Ce lien ne sera plus affiché : copiez-le maintenant ou renvoyez l'invitation plus tard.</p>
    </Card>
  );
}
