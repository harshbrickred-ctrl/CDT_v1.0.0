import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { pageEnter } from '../../lib/motion';
import BrandLogo from '../brand/BrandLogo';
import SearchBox from './SearchBox';

type NavItem = {
  to: string;
  label: string;
  roles?: string[];
  icon: React.ReactNode;
};

const SIDEBAR_KEY = 'cdt_sidebar_collapsed';

function Icon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const PRIMARY_NAV: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <Icon d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    ),
  },
  {
    to: '/candidates',
    label: 'Candidates',
    icon: (
      <Icon d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    ),
  },
  {
    to: '/leave',
    label: 'Leave',
    icon: (
      <Icon d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    ),
  },
  {
    to: '/timesheets',
    label: 'Timesheets',
    icon: (
      <Icon d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
  {
    to: '/delivery-reviews',
    label: 'Delivery Reviews',
    icon: (
      <Icon d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
    ),
  },
  {
    to: '/approvals',
    label: 'Approvals',
    roles: ['ADMIN', 'ACCOUNT_MANAGER'],
    icon: (
      <Icon d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
  {
    to: '/invoices',
    label: 'Invoices',
    roles: ['ADMIN', 'ACCOUNT_MANAGER'],
    icon: (
      <Icon d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    ),
  },
  {
    to: '/clients',
    label: 'Clients',
    icon: (
      <Icon d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    ),
  },
];

const SETTINGS_NAV: NavItem[] = [
  {
    to: '/settings/users',
    label: 'Users',
    roles: ['ADMIN'],
    icon: (
      <Icon d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    ),
  },
  {
    to: '/settings/lookups',
    label: 'Lookups',
    roles: ['ADMIN'],
    icon: (
      <Icon d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    ),
  },
  {
    to: '/settings/audit',
    label: 'Audit',
    roles: ['ADMIN'],
    icon: (
      <Icon d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    ),
  },
  {
    to: '/settings/import',
    label: 'Import',
    roles: ['ADMIN'],
    icon: (
      <Icon d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    ),
  },
];

function visible(items: NavItem[], role?: string | null) {
  return items.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );
}

function initials(name?: string | null) {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      {collapsed ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
        />
      )}
    </svg>
  );
}

export default function AppShell() {
  const { user, logout, organization, organizationMeta } = useAuth();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const role = user?.role;
  const primary = visible(PRIMARY_NAV, role);
  const settings = visible(SETTINGS_NAV, role);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-2.5 rounded-xl text-sm transition-all duration-200 ${
      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
    } ${
      isActive
        ? 'bg-primary/15 font-semibold text-slate-deep'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <div className="app-main-bg flex min-h-screen gap-3 p-3 sm:gap-4 sm:p-4">
      {/* Floating sidebar panel */}
      <aside
        className={`relative z-20 flex shrink-0 flex-col rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_-28px_hsl(222_28%_16%_/_0.28)] transition-[width] duration-300 ease-out ${
          collapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        <div
          className={`flex items-start gap-2 border-b border-border/70 ${
            collapsed ? 'flex-col items-center px-2 py-4' : 'px-4 py-4'
          }`}
        >
          <div
            className={`min-w-0 flex-1 ${collapsed ? 'flex justify-center' : ''}`}
          >
            {collapsed ? (
              <BrandLogo
                organization={organization}
                variant="mark"
                tone="light"
                markClassName="h-9 w-9"
              />
            ) : (
              <BrandLogo organization={organization} tone="light" showTagline />
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-95"
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
                    >
                      <motion.span
                        layoutId={
                          prefersReducedMotion ? undefined : 'nav-active-bar'
                        }
                        className="h-5 w-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    </span>
                  )}
                  <span
                    className={`transition-transform duration-200 ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:scale-105 group-hover:text-foreground'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && item.label}
                </>
              )}
            </NavLink>
          ))}
          {settings.length > 0 && (
            <>
              {!collapsed ? (
                <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Settings
                </p>
              ) : (
                <div className="mx-auto my-3 h-px w-6 bg-border" aria-hidden />
              )}
              {settings.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
                        >
                          <motion.span
                            layoutId={
                              prefersReducedMotion ? undefined : 'nav-active-bar'
                            }
                            className="h-5 w-0.5 rounded-full bg-primary"
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 32,
                            }}
                          />
                        </span>
                      )}
                      <span
                        className={`transition-transform duration-200 ${
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:scale-105 group-hover:text-foreground'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Main content column */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-[0_12px_40px_-28px_hsl(222_28%_16%_/_0.18)] backdrop-blur-[2px]">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur-md sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
            <div className="min-w-0 sm:hidden">
              <BrandLogo
                organization={organization}
                variant="mark"
                tone="light"
                markClassName="h-8 w-8"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-sm text-muted-foreground">
                {organizationMeta.name} ops console
              </p>
            </div>
          </div>
          <SearchBox />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {initials(user?.fullName)}
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">
                  {user?.fullName ?? 'User'}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {organizationMeta.shortName} · {user?.role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.98]"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            variants={pageEnter}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
