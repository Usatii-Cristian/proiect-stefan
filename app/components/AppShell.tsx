"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { QuickAddProvider, useQuickAdd } from "./quick-add-context";
import VoiceButton from "./VoiceButton";
import type { CategoryLite, QuickDefaults } from "./types";

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/dashboard", label: "Dashboard", icon: gridIcon() },
  { href: "/appointments", label: "Programări", icon: listIcon() },
  { href: "/calendar", label: "Calendar", icon: calIcon() },
  { href: "/kanban", label: "Kanban", icon: kanbanIcon() },
  { href: "/clients", label: "Clienți", icon: usersIcon() },
  { href: "/telegram", label: "Telegram", icon: sendIcon() },
  { href: "/settings", label: "Setări", icon: gearIcon() },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
              active
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-[var(--color-surface-2)] hover:text-ink"
            }`}
          >
            <span className="grid size-5 place-items-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.documentElement;
        const dark = el.classList.toggle("dark");
        localStorage.setItem("theme", dark ? "dark" : "light");
      }}
      className="tap grid size-11 place-items-center rounded-xl bg-[var(--color-surface-2)] text-ink hover:bg-brand-soft"
      title="Comută tema"
      aria-label="Comută tema"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
      </svg>
    </button>
  );
}

function Fab() {
  const { open } = useQuickAdd();
  return (
    <button
      onClick={() => open()}
      className="tap fixed bottom-20 right-5 z-40 grid size-14 place-items-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 lg:bottom-6"
      aria-label="Adaugă programare"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

export default function AppShell({
  userName,
  demo = false,
  categories,
  defaults,
  children,
}: {
  userName: string;
  demo?: boolean;
  categories: CategoryLite[];
  defaults: QuickDefaults;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const path = usePathname();
  const current = NAV.find((n) => path.startsWith(n.href))?.label ?? "Programări";

  return (
    <QuickAddProvider categories={categories} defaults={defaults}>
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:flex">
          <Brand />
          <div className="mt-6 flex-1">
            <NavList />
          </div>
          <Account userName={userName} />
        </aside>

        {/* Drawer mobil */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[var(--color-surface)] p-4">
              <Brand />
              <div className="mt-6 flex-1">
                <NavList onNavigate={() => setDrawer(false)} />
              </div>
              <Account userName={userName} />
            </aside>
          </div>
        )}

        <div className="flex min-h-dvh flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-app)]/80 px-4 py-3 backdrop-blur">
            <button
              onClick={() => setDrawer(true)}
              className="tap grid size-10 place-items-center rounded-xl bg-[var(--color-surface-2)] lg:hidden"
              aria-label="Meniu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold lg:text-xl">{current}</h1>
            <div className="ml-auto flex items-center gap-2">
              <VoiceButton />
              <ThemeToggle />
            </div>
          </header>

          {demo && (
            <div className="border-b border-amber-300/40 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">
              Mod demo — date de exemplu. Conectează o bază de date ca să salvezi.
            </div>
          )}
          <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      <Fab />

      {/* Bottom nav mobil */}
      <BottomNav />
    </QuickAddProvider>
  );
}

function BottomNav() {
  const path = usePathname();
  const items = NAV.slice(0, 5);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-[var(--color-line)] bg-[var(--color-surface)] lg:hidden">
      {items.map((item) => {
        const active = path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "text-brand" : "text-ink-soft"
            }`}
          >
            <span className="grid size-5 place-items-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="grid size-9 place-items-center rounded-xl bg-brand text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
      </div>
      <span className="text-base font-bold">Programări</span>
    </div>
  );
}

function Account({ userName }: { userName: string }) {
  return (
    <div className="mt-3 border-t border-[var(--color-line)] pt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <span className="truncate text-sm font-medium">{userName}</span>
      </div>
      <form action={logout}>
        <button className="tap w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-[var(--color-surface-2)]">
          Deconectare
        </button>
      </form>
    </div>
  );
}

/* ---- iconuri inline ---- */
function gridIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
}
function listIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
}
function calIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>;
}
function kanbanIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 3v18M12 3v12M19 3v8"/></svg>;
}
function usersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6M18.5 20a5 5 0 0 0-2.5-4"/></svg>;
}
function sendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3 11 13M22 3l-7 18-4-8-8-4 19-6Z"/></svg>;
}
function gearIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 13.4H4a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 5 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z"/></svg>;
}

export { useQuickAdd };
