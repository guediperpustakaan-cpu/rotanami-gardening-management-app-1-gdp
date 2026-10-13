"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Grid3x3,
  Leaf,
  LogOut,
  RefreshCw,
  Settings,
  House,
} from "lucide-react";
import { cn, Spinner } from "./ui";
import { useMe } from "@/lib/hooks";
import { apiFetch } from "@/lib/client";

const NAV_ITEMS = [
  { href: "/", label: "Beranda", Icon: House },
  { href: "/petak", label: "Petak", Icon: Grid3x3 },
  { href: "/tanaman", label: "Katalog", Icon: Leaf },
  { href: "/perencana", label: "Rotasi", Icon: RefreshCw },
  { href: "/kalender", label: "Kalender", Icon: CalendarDays },
];

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#425a27" />
      <path
        d="M16 25V14"
        stroke="#fcfbf5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 16c0-4.5-3.2-7-7.5-7C8.5 13.5 11.6 16 16 16Z"
        fill="#aac07c"
      />
      <path
        d="M16 13.5c0-3.8 2.7-6 6.4-6 .1 3.9-2.6 6-6.4 6Z"
        fill="#fcfbf5"
      />
      <path d="M9 25h14" stroke="#fcfbf5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="h-8 w-8 shrink-0" />
      {!compact ? (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          Rotanami
        </span>
      ) : null}
    </span>
  );
}

export function AppShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const meQuery = useMe();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-cream md:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/" aria-label="Rotanami — Beranda">
            <Logo />
          </Link>
          <p className="mt-1 text-xs text-ink-faint">Catatan kebun & rotasi tanaman</p>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                isActive(href)
                  ? "bg-moss-100 text-moss-800"
                  : "text-ink-soft hover:bg-paper hover:text-ink",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
              {label}
            </Link>
          ))}
          <Link
            href="/pengaturan"
            aria-current={isActive("/pengaturan") ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
              isActive("/pengaturan")
                ? "bg-moss-100 text-moss-800"
                : "text-ink-soft hover:bg-paper hover:text-ink",
            )}
          >
            <Settings aria-hidden className="h-5 w-5" />
            Pengaturan
          </Link>
        </nav>
        <div className="border-t border-line px-4 py-4">
          <p className="truncate text-sm font-semibold text-ink">{userName}</p>
          <p className="truncate text-xs text-ink-faint">{userEmail}</p>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-clay-600 hover:bg-clay-100"
          >
            {loggingOut ? <Spinner aria-hidden /> : <LogOut aria-hidden className="h-4 w-4" />}
            Keluar
          </button>
        </div>
      </aside>

      {/* Topbar ponsel */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-cream/95 px-4 backdrop-blur md:hidden">
        <Link href="/" aria-label="Rotanami — Beranda">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/pengaturan"
            aria-label="Pengaturan"
            className={cn(
              "rounded-lg p-2.5",
              isActive("/pengaturan") ? "bg-moss-100 text-moss-800" : "text-ink-soft hover:bg-paper",
            )}
          >
            <Settings aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Konten */}
      <main className="px-4 pt-5 pb-28 md:pl-[16.5rem] md:pt-8 md:pb-10">
        <div className="mx-auto w-full max-w-5xl">
          {meQuery.data?.activeFarm ? (
            <p className="mb-3 hidden text-xs font-semibold tracking-wide text-ink-faint uppercase md:block">
              Kebun aktif: {meQuery.data.activeFarm.name}
            </p>
          ) : null}
          {children}
        </div>
      </main>

      {/* Navigasi bawah ponsel */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-semibold",
                  isActive(href) ? "text-moss-800" : "text-ink-faint",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full",
                    isActive(href) && "bg-moss-100",
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
