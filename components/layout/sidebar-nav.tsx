"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV, SECONDARY_NAV, isActivePath, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

/** 데스크톱(lg+) 좌측 고정 사이드바 메뉴 */
export function SidebarNav() {
  const pathname = usePathname();
  const { status, isAnonymous } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 px-6 text-lg font-bold">
        <span aria-hidden>🍽️</span>
        <span>오늘의 식판</span>
      </div>

      <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
        </ul>
        <hr className="my-3 border-border" />
        <ul className="flex flex-col gap-1">
          {SECONDARY_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground" aria-live="polite">
        {status === "loading"
          ? "세션 준비 중…"
          : isAnonymous
            ? "게스트 세션으로 이용 중"
            : "로그인됨"}
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
