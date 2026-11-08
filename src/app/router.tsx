import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { useSessionStore, usePermissions } from '@/shared/auth/session-store';
import { AppLayout, NoCafePage } from './AppLayout';
import { homePathFor, NAV_ITEMS } from './nav';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const PosPage = lazy(() =>
  import('@/features/pos/PosPage').then((m) => ({ default: m.PosPage })),
);
const WaiterPage = lazy(() =>
  import('@/features/waiter/WaiterPage').then((m) => ({
    default: m.WaiterPage,
  })),
);
const StaffPage = lazy(() =>
  import('@/features/staff/StaffPage').then((m) => ({ default: m.StaffPage })),
);
const CustomerScreen = lazy(() =>
  import('@/features/screen/CustomerScreen').then((m) => ({
    default: m.CustomerScreen,
  })),
);
const KitchenPage = lazy(() =>
  import('@/features/kitchen/KitchenPage').then((m) => ({
    default: m.KitchenPage,
  })),
);
const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((m) => ({
    default: m.OrdersPage,
  })),
);
const MenuPage = lazy(() =>
  import('@/features/menu/MenuPage').then((m) => ({ default: m.MenuPage })),
);
const TablesPage = lazy(() =>
  import('@/features/tables/TablesPage').then((m) => ({
    default: m.TablesPage,
  })),
);
const DeliveryPage = lazy(() =>
  import('@/features/delivery/DeliveryPage').then((m) => ({
    default: m.DeliveryPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
);

function Loading() {
  const { t } = useTranslation();
  return (
    <p role="status" className="p-6 text-center text-muted-foreground">
      {t('common.loading')}
    </p>
  );
}

function RequireAuth() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function GuestOnly() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }
  return <Outlet />;
}

function RequireCafe() {
  const cafeId = useSessionStore((state) => state.user?.cafeId);
  return cafeId ? <AppLayout /> : <NoCafePage />;
}

function Home() {
  const { t } = useTranslation();
  const home = homePathFor(usePermissions());
  // A role with nothing ticked has no page to land on. Sending them anywhere would loop.
  if (!home) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {t('layout.noAccess')}
      </p>
    );
  }
  return <Navigate to={home} replace />;
}

/** Sends a user away from a page they cannot use, for example from an old bookmark. */
function RoleRoute({
  path,
  element,
}: {
  path: string;
  element: React.ReactNode;
}) {
  const permissions = usePermissions();
  const item = NAV_ITEMS.find((candidate) => candidate.path === path);
  if (!item?.allowed(permissions)) return <Navigate to="/" replace />;
  return element;
}

const page = (path: string, element: React.ReactNode) => ({
  path,
  element: <RoleRoute path={path} element={element} />,
});

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireCafe />,
        children: [
          { path: '/', element: <Home /> },
          page('/dashboard', <DashboardPage />),
          page('/pos', <PosPage />),
          page('/waiter', <WaiterPage />),
          page('/kitchen', <KitchenPage />),
          page('/orders', <OrdersPage />),
          page('/delivery', <DeliveryPage />),
          page('/menu', <MenuPage />),
          page('/tables', <TablesPage />),
          page('/staff', <StaffPage />),
          page('/settings', <SettingsPage />),
        ],
      },
    ],
  },
  {
    // Public on purpose: a monitor facing customers must not hold a staff login.
    path: '/screen/:slug',
    element: (
      <Suspense fallback={<Loading />}>
        <CustomerScreen />
      </Suspense>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
