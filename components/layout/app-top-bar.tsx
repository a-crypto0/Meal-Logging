"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

/** 모바일(lg 미만) 상단 바: 브랜드 + 설정 진입(하단 탭에 없는 2차 메뉴) */
export function AppTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-1.5 font-bold">
        <span aria-hidden>🍽️</span>
        <span>오늘의 식판</span>
      </Link>
      <Link
        href="/settings"
        aria-label="설정"
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </Link>
    </header>
  );
}
