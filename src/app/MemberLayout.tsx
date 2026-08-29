import { NavLink, Outlet } from 'react-router';
import { ClipboardList, Home, ShieldCheck, User, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FlagStripe } from '@/components/ui/FlagStripe';
import { SignOutButton } from '@/components/ui/SignOutButton';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/cas', label: 'Cas RPN', icon: ClipboardList, end: false },
  { to: '/contributions', label: 'Paiements', icon: Wallet, end: false },
  { to: '/profil', label: 'Profil', icon: User, end: false },
];

export function MemberLayout() {
  const { member, isAdmin } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-sunken">
      <FlagStripe />
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <span className="font-display text-base font-bold text-ink">RPN</span>

          {/* Primary nav: a row on desktop, a bottom bar on mobile (below). */}
          <nav aria-label="Navigation principale" className="hidden flex-1 gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-extrabold transition-colors',
                    isActive ? 'bg-accent-pale text-accent' : 'text-ink-muted hover:bg-surface-hover',
                  )
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <NavLink
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-accent px-3 py-1.5 text-[12px] font-extrabold text-accent hover:bg-accent-pale"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                Administration
              </NavLink>
            )}
            {member && (
              <span
                className="grid size-9 place-items-center rounded-full bg-accent-pale font-display text-sm font-bold text-accent"
                title={member.fullName}
              >
                {initials(member.fullName)}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile tab bar — mirrors the app's four tabs so the two feel like one product. */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border-subtle bg-surface-raised md:hidden"
      >
        <div className="flex">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold',
                  isActive ? 'text-accent' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-9 place-items-center rounded-[var(--radius-input)]',
                      isActive && 'bg-accent-pale',
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
