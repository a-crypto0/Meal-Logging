"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-offline-sync";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-md"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      오프라인 · 기록은 온라인 복구 시 자동 동기화돼요
    </div>
  );
}
