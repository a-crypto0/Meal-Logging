"use client";

import { RefreshCw } from "lucide-react";
import { useUserMode } from "@/lib/user-mode";

export function ModeChangeButton() {
  const setMode = useUserMode((s) => s.setMode);
  return (
    <button
      type="button"
      onClick={() => setMode(null)}
      aria-label="모드 변경"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-border px-3 py-2 text-xs font-bold hover:bg-accent"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      모드 변경
    </button>
  );
}
