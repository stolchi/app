import { useQueryClient } from '@tanstack/react-query';
import {
  Keyboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  WifiOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthControllerLogout } from '@/shared/api/generated/auth/auth';
import { useCafesControllerCurrent } from '@/shared/api/generated/cafes/cafes';
import { roleLabel } from '@/shared/auth/role-label';
import { usePermissions, useSessionStore } from '@/shared/auth/session-store';
import { assetUrl } from '@/shared/lib/assets';
import { applyCafeTheme } from '@/shared/lib/cafe-theme';
import { useShortcuts } from '@/shared/lib/use-shortcuts';
import { SPRING } from '@/shared/motion/variants';
import {
  RealtimeProvider,
  useSocketConnected,
} from '@/shared/realtime/RealtimeProvider';
import { Celebration } from '@/shared/ui/Celebration';
import { LoadingBlocks } from '@/shared/ui/QueryState';
import { useSidebarStore } from '@/shared/ui/sidebar-store';
import { navItemsFor } from './nav';

function useSignOut() {
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();
  return useAuthControllerLogout({
    mutation: {
      // Even if the request fails, this device must stop showing the session.
      onSettled: () => {
        signOut();
        queryClient.clear();
      },
    },
  });
}

function SideNavigation() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const { collapsed, toggle } = useSidebarStore();
  return (
    <nav
      className={cn(
        'hidden shrink-0 flex-col gap-1 overflow-x-hidden overflow-y-auto bg-sidebar p-2 text-sidebar-foreground transition-[width] duration-200 ease-out md:flex',
        collapsed ? 'w-[4.5rem]' : 'w-56',
      )}
    >
      <p
        className={cn(
          'mb-3 flex h-12 shrink-0 items-center gap-2 font-heading text-lg font-bold text-white',
          collapsed ? 'justify-center' : 'px-3',
        )}
      >
        <Store className="size-6 shrink-0 text-amber-400" />
        {!collapsed && t('brand.name')}
      </p>
      {navItemsFor(permissions).map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          title={collapsed ? t(label) : undefined}
          aria-label={t(label)}
          className={({ isActive }) =>
            cn(
              'relative flex h-12 shrink-0 items-center rounded-xl text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              collapsed ? 'justify-center' : 'gap-3 px-3.5',
              isActive
                ? 'text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="side-nav"
                  transition={SPRING}
                  className="absolute inset-0 rounded-xl bg-sidebar-primary shadow-lg shadow-black/20"
                />
              )}
              <Icon className="relative size-5 shrink-0" />
              {!collapsed && <span className="relative">{t(label)}</span>}
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={t(collapsed ? 'layout.expandMenu' : 'layout.collapseMenu')}
        title={t(collapsed ? 'layout.expandMenu' : 'layout.collapseMenu')}
        className={cn(
          'mt-auto flex h-12 shrink-0 items-center rounded-xl text-sm whitespace-nowrap text-sidebar-foreground/75 transition-colors outline-none hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-white/60',
          collapsed ? 'justify-center' : 'gap-3 px-3.5',
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="size-5 shrink-0" />
            {t('layout.collapseMenu')}
          </>
        )}
      </button>
    </nav>
  );
}

const SHORTCUT_HELP = [
  { keys: ['Ctrl', 'B'], label: 'shortcuts.toggleMenu' },
  { keys: ['Alt', '1…7'], label: 'shortcuts.pages' },
  { keys: ['?'], label: 'shortcuts.help' },
  { keys: ['/'], label: 'shortcuts.searchProduct', page: true },
  { keys: ['Enter'], label: 'shortcuts.addFirst', page: true },
  { keys: ['S'], label: 'shortcuts.chooseTable', page: true },
  { keys: ['T'], label: 'shortcuts.orderType', page: true },
  { keys: ['B'], label: 'shortcuts.cartOrOrders', page: true },
  { keys: ['N'], label: 'shortcuts.newDraft', page: true },
  { keys: ['Ctrl', 'Enter'], label: 'shortcuts.send', page: true },
];

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const rows = (page: boolean) =>
    SHORTCUT_HELP.filter((item) => Boolean(item.page) === page).map((item) => (
      <li
        key={item.label}
        className="flex items-center justify-between gap-3 py-1.5"
      >
        <span>{t(item.label)}</span>
        <span className="flex shrink-0 gap-1">
          {item.keys.map((key) => (
            <kbd
              key={key}
              className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs"
            >
              {key}
            </kbd>
          ))}
        </span>
      </li>
    ));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {t('shortcuts.title')}
          </DialogTitle>
        </DialogHeader>
        <ul>{rows(false)}</ul>
        <h3 className="font-semibold">{t('nav.pos')}</h3>
        <ul>{rows(true)}</ul>
      </DialogContent>
    </Dialog>
  );
}

/** Within reach of the thumb. Scrolls sideways when a role has many pages. */
function BottomNavigation() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const { pathname } = useLocation();

  useEffect(() => {
    document
      .querySelector('[data-bottom-nav] a[aria-current="page"]')
      ?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
  }, [pathname]);

  return (
    <nav
      data-bottom-nav
      className="flex shrink-0 gap-0.5 overflow-x-auto border-t bg-card px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] [scrollbar-width:none] md:hidden"
    >
      {navItemsFor(permissions).map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'relative flex h-14 min-w-[4.75rem] flex-1 shrink-0 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="bottom-nav"
                  transition={SPRING}
                  className="absolute inset-x-1.5 inset-y-0.5 rounded-xl bg-primary/10"
                />
              )}
              <Icon className="relative size-5" />
              <span className="relative whitespace-nowrap">{t(label)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function ConnectionStatus() {
  const { t } = useTranslation();
  const connected = useSocketConnected();
  if (connected) {
    return (
      <span
        title={t('layout.online')}
        className="relative hidden size-2.5 sm:flex"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
        <span className="relative size-2.5 rounded-full bg-emerald-500" />
      </span>
    );
  }
  return (
    // The delay hides the moment it takes to connect when the page opens.
    <span
      role="status"
      className="flex animate-in items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive delay-2000 duration-200 fade-in fill-mode-backwards"
    >
      <WifiOff className="size-3.5" />
      {t('layout.offline')}
    </span>
  );
}

function TopBar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const cafe = useCafesControllerCurrent();
  const logout = useSignOut();
  const color = cafe.data?.primaryColor;

  useEffect(() => applyCafeTheme(color), [color]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur">
      {cafe.data?.logoUrl ? (
        <img
          src={assetUrl(cafe.data.logoUrl)}
          alt=""
          className="size-9 rounded-xl object-cover"
        />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-5" />
        </span>
      )}
      <span className="truncate font-heading text-lg font-bold">
        {cafe.data?.name}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <ConnectionStatus />
        {/* Only where there is a keyboard to speak of. */}
        <Button
          variant="ghost"
          className="hidden size-10 pointer-fine:inline-flex"
          aria-label={t('shortcuts.title')}
          title={t('shortcuts.title')}
          onClick={onShowShortcuts}
        >
          <Keyboard />
        </Button>
        {user && (
          <span className="hidden items-center gap-2 sm:flex">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-secondary font-semibold"
            >
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="text-sm leading-tight">
              {user.name}
              <span className="block text-xs text-muted-foreground">
                {roleLabel(t, user.role)}
              </span>
            </span>
          </span>
        )}
        <Button
          variant="ghost"
          className="h-10"
          aria-label={t('layout.logout')}
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut />
          <span className="hidden lg:inline">{t('layout.logout')}</span>
        </Button>
      </div>
    </header>
  );
}

export function AppLayout() {
  const permissions = usePermissions();
  const { pathname } = useLocation();
  // A cook has one screen, and it needs all the room it can get.
  const items = navItemsFor(permissions);
  const hasMenu = items.length > 1;
  const navigate = useNavigate();
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useShortcuts({
    'ctrl+b': hasMenu ? toggleSidebar : undefined,
    'shift+/': () => setShowShortcuts(true),
    ...Object.fromEntries(
      items.map(({ path }, index) => [
        `alt+${index + 1}`,
        () => void navigate(path),
      ]),
    ),
  });

  return (
    <RealtimeProvider>
      <div className="flex h-dvh">
        {hasMenu && <SideNavigation />}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onShowShortcuts={() => setShowShortcuts(true)} />
          <main className="min-h-0 flex-1 overflow-auto">
            <Suspense fallback={<LoadingBlocks />}>
              <motion.div
                key={pathname}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </main>
          {hasMenu && <BottomNavigation />}
        </div>
      </div>
      <Celebration />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </RealtimeProvider>
  );
}

/** A platform admin has no cafe, and so nothing in this panel yet. */
export function NoCafePage() {
  const { t } = useTranslation();
  const logout = useSignOut();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground">{t('layout.noCafe')}</p>
      <Button
        variant="outline"
        className="h-11"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {t('layout.logout')}
      </Button>
    </main>
  );
}
