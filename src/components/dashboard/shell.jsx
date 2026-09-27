"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, LayoutGrid, Settings } from "lucide-react";
import { AccountMark, AccountSheet } from "@/components/account/account-sheet";
import { Logo } from "@/components/logo";
import { useCachedGet } from "@/lib/use-cached-get";
import { cn } from "@/lib/utils";

function depth(path) {
  return path.split("/").filter(Boolean).length;
}

function navLinks({ demo, workspaceId }) {
  if (demo) {
    return [
      {
        href: "/demo",
        label: "Sites",
        icon: LayoutGrid,
        match: (path) => path === "/demo" || path.startsWith("/demo/sites"),
      },
    ];
  }
  if (!workspaceId) return [];
  const base = `/d/${workspaceId}`;
  return [
    {
      href: base,
      label: "Sites",
      icon: LayoutGrid,
      match: (path) => path === base || path.startsWith(`${base}/sites`),
    },
    {
      href: `${base}/settings`,
      label: "Settings",
      icon: Settings,
      match: (path) => path.startsWith(`${base}/settings`),
    },
  ];
}

function backTarget(pathname, { demo, workspaceId }) {
  if (demo) {
    if (pathname.startsWith("/demo/sites/")) return { href: "/demo", label: "Sites" };
    return null;
  }
  if (!workspaceId) return null;
  const base = `/d/${workspaceId}`;
  if (
    pathname === base || pathname === `${base}/settings`
  ) {
    return null;
  }
  const nested = pathname.match(/^\/d\/[^/]+\/sites\/([^/]+)\/(settings|uptime)$/);
  if (nested) return { href: `${base}/sites/${nested[1]}`, label: "Site" };
  if (pathname.startsWith(`${base}/sites/`)) return { href: base, label: "Sites" };
  return null;
}

function NavItems({ links, pathname, compact }) {
  const reduce = useReducedMotion();
  return links.map((item) => {
    const Icon = item.icon;
    const active = item.match(pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={(event) => {
          if (!active) return;
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        }}
        className={cn(
          "ios-press",
          compact
            ? cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-white" : "text-zinc-500",
              )
            : cn(
                "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px]",
                active ? "bg-white/10 text-white" : "text-zinc-400",
              ),
        )}
      >
        <Icon className={compact ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]"} strokeWidth={active ? 2.25 : 1.75} />
        {item.label}
      </Link>
    );
  });
}

export function DashboardShell({ workspaceId, children, demo = false }) {
  const pathname = usePathname() || "/";
  const reduce = useReducedMotion();
  const { data: user } = useCachedGet(demo ? null : "/api/account");
  const [accountOpen, setAccountOpen] = useState(false);
  const links = navLinks({ demo, workspaceId });
  const back = backTarget(pathname, { demo, workspaceId });
  const showTabs = links.length > 0 && !back;
  const [dir, setDir] = useState(1);
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setDir(depth(pathname) >= depth(prevPath) ? 1 : -1);
  }

  function account(compact) {
    if (demo) {
      return (
        <Link
          href="/sign-up"
          className={cn(
            "ios-press inline-flex min-h-11 items-center font-semibold",
            compact
              ? "px-2 text-[17px] text-white"
              : "rounded-full bg-white px-4 text-[15px] text-black",
          )}
        >
          Create account
        </Link>
      );
    }
    return (
      <AccountMark
        name={user?.name}
        email={user?.email}
        showEmail={!compact}
        onClick={() => setAccountOpen(true)}
      />
    );
  }

  return (
    <div className="dash min-h-dvh bg-black text-white">
      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-white/10 px-3 py-4 lg:flex">
          <Link href={demo ? "/" : "/d"} className="ios-press mb-6 inline-flex px-3">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Sections">
            <NavItems links={links} pathname={pathname} />
          </nav>
          <div className="px-1 pt-3">{account(false)}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl lg:hidden">
            <div className="pt-[env(safe-area-inset-top)]" />
            <div className="flex h-11 items-center justify-between gap-2 px-2">
              {back ? (
                <Link
                  href={back.href}
                  className="ios-press -ml-1 inline-flex min-h-11 min-w-0 items-center gap-0.5 pr-2 text-[17px]"
                >
                  <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2.25} />
                  <span className="truncate">{back.label}</span>
                </Link>
              ) : (
                <Link
                  href={demo ? "/" : "/d"}
                  className="ios-press inline-flex min-h-11 items-center px-2"
                >
                  <Logo />
                </Link>
              )}
              <div className="pr-1">{account(true)}</div>
            </div>
          </header>
          <main
            className={cn(
              "overflow-x-clip px-4 pt-4 lg:px-8 lg:py-8",
              showTabs
                ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-10"
                : "pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: reduce ? 0.01 : 0.36 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      {showTabs ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/75 backdrop-blur-2xl lg:hidden"
          aria-label="Sections"
        >
          <div
            className="grid h-[52px]"
            style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
          >
            <NavItems links={links} pathname={pathname} compact />
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      ) : null}
      {demo ? null : <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
