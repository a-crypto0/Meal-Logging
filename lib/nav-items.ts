import {
  BarChart3,
  Calendar,
  Home,
  Settings,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** 모바일 하단 탭 · 데스크톱 사이드바 공통 1차 메뉴 (요구사항 5종) */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/log", label: "기록", icon: UtensilsCrossed },
  { href: "/analysis", label: "영양", icon: BarChart3 },
  { href: "/recommend", label: "추천", icon: Sparkles },
  { href: "/history", label: "히스토리", icon: Calendar },
];

/** 2차 메뉴(설정 등) — 데스크톱 사이드바 하단 · 모바일 상단바 */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "설정", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  // 홈은 진입 리다이렉트(/) 와 /dashboard 모두 활성으로 본다
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
