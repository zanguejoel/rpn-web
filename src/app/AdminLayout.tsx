import { NavLink, Outlet } from 'react-router';
import {
  ArrowLeft,
  BookLock,
  Banknote,
  FileDown,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  MailPlus,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FlagStripe } from '@/components/ui/FlagStripe';
import { cn } from '@/lib/cn';

/* Grouped by how a treasurer actually works: what needs deciding today, then the
   records behind it, then governance. Not alphabetical, not by API resource. */
const SECTIONS: { heading: string; items: { to: string; label: string; icon: typeof Users; end?: boolean }[] }[] = [
  {
    heading: 'À traiter',
    items: [
      { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
      { to: '/admin/validation', label: 'File de validation', icon: ListChecks },
    ],
  },
  {
    heading: 'Dossiers',
    items: [
      { to: '/admin/cas', label: 'Cas RPN', icon: FolderOpen },
      { to: '/admin/membres', label: 'Membres', icon: Users },
      { to: '/admin/invitations', label: 'Invitations', icon: MailPlus },
    ],
  },
  {
    heading: 'Gouvernance',
    items: [
      { to: '/admin/finances', label: 'Finances', icon: Banknote },
      { to: '/admin/exports', label: 'Exports', icon: FileDown },
      { to: '/admin/journal', label: "Journal d'audit", icon: ScrollText },
      { to: '/admin/confidentialite', label: 'Confidentialité', icon: BookLock },
      { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const { member } = useAuth();

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <FlagStripe />
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-raised lg:flex">
          <div className="border-b border-border-subtle px-4 py-4">
            <p className="font-display text-sm font-bold text-ink">RPN · Administration</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{member?.associationName}</p>
          </div>

          <nav aria-label="Navigation d'administration" className="flex-1 overflow-y-auto px-2 py-3">
            {SECTIONS.map((section) => (
              <div key={section.heading} className="mb-4">
                <p className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-ink-faint uppercase">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-bold transition-colors',
                          isActive
                            ? 'bg-accent-pale text-accent'
                            : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
                        )
                      }
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border-subtle p-2">
            <NavLink
              to="/"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-bold text-ink-muted hover:bg-surface-hover"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Espace membre
            </NavLink>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Narrow screens get a horizontal rail; the console is desktop-first by design. */}
          <div className="sticky top-0 z-10 overflow-x-auto border-b border-border-subtle bg-surface-raised lg:hidden">
            <div className="flex gap-1 px-3 py-2">
              {SECTIONS.flatMap((s) => s.items).map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-extrabold whitespace-nowrap',
                      isActive ? 'bg-accent-pale text-accent' : 'text-ink-muted',
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <main className="p-4 lg:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
