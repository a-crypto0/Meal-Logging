"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";

// 루트(/): 별도 로그인 없이 익명 게스트 세션을 자동 시작하고 /dashboard 로 이동.
export default function RootRedirectPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated" || status === "guest") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl" aria-hidden>
        🍽️
      </div>
      <h1 className="text-2xl font-extrabold">오늘의 식판</h1>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {status === "error"
          ? "오프라인 게스트로 시작합니다…"
          : "게스트 세션을 준비하는 중…"}
      </p>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
