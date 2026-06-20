"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/choose-music", label: "Choose music" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-void/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/main" className="flex items-center gap-2.5 font-display text-lg tracking-tight text-ink">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-beat">
            <span className="h-2.5 w-2.5 rounded-sm bg-void" />
          </span>
          Signify
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-panel text-ink"
                    : "text-mute hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/choose-music"
          className="rounded-full bg-beat px-5 py-2 text-sm font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Play now
        </Link>
      </div>

      {/* mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line/70 px-4 py-2 md:hidden">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-panel text-ink" : "text-mute"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
