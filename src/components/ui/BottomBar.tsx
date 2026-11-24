"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  MoreHorizontal,
  Settings as SettingsIcon,
  Sun,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";
import { Sheet } from "./Sheet";

const tabs = [
  { href: "/", key: "today", Icon: Sun },
  { href: "/schedule", key: "schedule", Icon: CalendarDays },
  { href: "/students", key: "students", Icon: Users },
  { href: "/stats", key: "stats", Icon: BarChart3 },
] as const;

export function BottomBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreLinks = [
    { href: "/groups", label: t.nav.groups, Icon: FolderOpen },
    { href: "/dues", label: t.nav.dues, Icon: Wallet },
    { href: "/settings", label: t.nav.settings, Icon: SettingsIcon },
    ...(process.env.NODE_ENV !== "production"
      ? [{ href: "/dev", label: t.nav.dev, Icon: Wrench }]
      : []),
  ];

  return (
    <>
      <nav
        aria-label={t.nav.more}
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-white/60 bg-white/70 backdrop-blur-[18px]"
      >
        <ul className="grid grid-cols-5">
          {tabs.map(({ href, key, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {t.nav[key]}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="press flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-muted"
            >
              <MoreHorizontal size={20} aria-hidden />
              {t.nav.more}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t.nav.more}
      >
        <ul className="flex flex-col gap-1">
          {moreLinks.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMoreOpen(false)}
                className="press flex min-h-12 items-center gap-3 rounded-btn px-3 text-[15px] hover:bg-white/50"
              >
                <Icon size={20} className="text-primary" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
