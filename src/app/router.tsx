import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { MemberLayout } from './MemberLayout';
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from './guards';
import { LoadingState } from '@/components/ui/States';
import Login from '@/routes/Login';
import ForgotPassword from '@/routes/ForgotPassword';
import Home from '@/routes/member/Home';
import Cases from '@/routes/member/Cases';
import CaseDetail from '@/routes/member/CaseDetail';
import Contributions from '@/routes/member/Contributions';
import Profile from '@/routes/member/Profile';

/* The admin console is lazy so a plain member never downloads it. This is a
   payload optimisation only — authorisation is enforced server-side. */
const AdminLayout = lazy(() =>
  import('./AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboard = lazy(() => import('@/routes/admin/Dashboard'));
const AdminValidation = lazy(() => import('@/routes/admin/ValidationQueue'));
const AdminCases = lazy(() => import('@/routes/admin/Cases'));
const AdminMembers = lazy(() => import('@/routes/admin/Members'));
const AdminInvitations = lazy(() => import('@/routes/admin/Invitations'));
const AdminFinances = lazy(() => import('@/routes/admin/Finances'));
const AdminExports = lazy(() => import('@/routes/admin/Exports'));
const AdminAuditLog = lazy(() => import('@/routes/admin/AuditLog'));
const AdminPrivacy = lazy(() => import('@/routes/admin/Privacy'));
const AdminSettings = lazy(() => import('@/routes/admin/Settings'));

function lazyBoundary(node: React.ReactNode) {
  return <Suspense fallback={<LoadingState />}>{node}</Suspense>;
}

const routes: RouteObject[] = [
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/connexion', element: <Login /> },
      { path: '/mot-de-passe-oublie', element: <ForgotPassword /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <MemberLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/cas', element: <Cases /> },
          { path: '/cas/:caseId', element: <CaseDetail /> },
          { path: '/contributions', element: <Contributions /> },
          { path: '/profil', element: <Profile /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: '/admin',
            element: lazyBoundary(<AdminLayout />),
            children: [
              { index: true, element: lazyBoundary(<AdminDashboard />) },
              { path: 'validation', element: lazyBoundary(<AdminValidation />) },
              { path: 'cas', element: lazyBoundary(<AdminCases />) },
              { path: 'membres', element: lazyBoundary(<AdminMembers />) },
              { path: 'invitations', element: lazyBoundary(<AdminInvitations />) },
              { path: 'finances', element: lazyBoundary(<AdminFinances />) },
              { path: 'exports', element: lazyBoundary(<AdminExports />) },
              { path: 'journal', element: lazyBoundary(<AdminAuditLog />) },
              { path: 'confidentialite', element: lazyBoundary(<AdminPrivacy />) },
              { path: 'parametres', element: lazyBoundary(<AdminSettings />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
];

function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-sunken px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Page introuvable</h1>
        <p className="mt-2 text-sm text-ink-muted">Cette adresse ne correspond à aucun écran.</p>
        <a href="/" className="mt-4 inline-block text-sm font-extrabold text-accent hover:underline">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter(routes);
