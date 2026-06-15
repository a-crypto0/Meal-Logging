"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV, isActivePath } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

/** 모바일(lg 미만) 하단 탭 바. 데스크톱에서는 사이드바가 대신한다. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
