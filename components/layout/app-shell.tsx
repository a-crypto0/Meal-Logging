"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { SidebarNav } from "@/components/layout/sidebar-nav";

// 네비 없이 전체화면으로 보여줄 경로: 진입 스플래시(/) · 모드 선택(/welcome)
const BARE_ROUTES = new Set<string>(["/", "/welcome"]);

/**
 * 반응형 앱 셸.
 * - 모바일: 상단 바 + 콘텐츠 + 하단 탭 바
 * - 데스크톱(lg+): 좌측 고정 사이드바 + 콘텐츠
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.has(pathname)) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="flex-1 pb-20 lg:pb-10">
          <div className="mx-auto w-full max-w-md lg:max-w-2xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
