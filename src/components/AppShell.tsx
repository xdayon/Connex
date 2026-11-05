import { NavLink, Outlet } from "react-router";
import { Calendar, Home, ScanLine, User, Users, type LucideIcon } from "lucide-react";
import { strings } from "../i18n/strings";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { Wordmark } from "./Logo";

const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: strings.nav.home, icon: Home, end: true },
  { to: "/connections", label: strings.nav.connections, icon: Users },
  { to: "/scan", label: strings.nav.scan, icon: ScanLine },
  { to: "/events", label: strings.nav.events, icon: Calendar },
  { to: "/me", label: strings.nav.profile, icon: User },
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <Wordmark />
        <ConnectWalletButton />
      </header>
      <main className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>
      <nav
        aria-label={strings.nav.primary}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-120 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="grid grid-cols-5 items-end">
          {tabs.map(({ to, label, icon: Icon, end }) => {
            const center = to === "/scan";
            return (
              <li key={to} className="flex justify-center">
                <NavLink
                  to={to}
                  end={end}
                  aria-label={label}
                  className={({ isActive }) =>
                    center
                      ? `-mt-6 mb-2 flex size-14 items-center justify-center rounded-full bg-volt text-ink shadow-[0_0_0_4px_var(--color-ink)] transition active:scale-95 ${isActive ? "ring-2 ring-text" : ""}`
                      : `flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${isActive ? "text-volt" : "text-muted"}`
                  }
                >
                  <Icon size={center ? 26 : 22} />
                  {!center && <span>{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
