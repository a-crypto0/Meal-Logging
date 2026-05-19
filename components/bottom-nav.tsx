"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, Home, Settings, Sparkles, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/",         label: "홈",      icon: Home           },
  { href: "/log",      label: "기록",    icon: UtensilsCrossed },
  { href: "/analysis", label: "영양",    icon: BarChart3       },
  { href: "/recommend",label: "추천",    icon: Sparkles        },
  { href: "/history",  label: "히스토리", icon: Calendar        },
  { href: "/settings", label: "설정",    icon: Settings        },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/welcome") return null;

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 backdrop-blur"
    >
      <ul className="grid grid-cols-6">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn("h-6 w-6", active && "stroke-[2.5]")}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
