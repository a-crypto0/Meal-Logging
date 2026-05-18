"use client";

import { useMealStore, todayKey } from "@/lib/store";
import type { MealSlotId } from "@/lib/utils";

export function MealSummary({ slotId }: { slotId: MealSlotId }) {
  const entries = useMealStore((s) => s.logs[`${todayKey()}:${slotId}`] ?? []);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">아직 기록되지 않았어요</p>
    );
  }

  return (
    <p className="line-clamp-1 text-sm text-foreground">
      {entries.map((e) => `${e.emoji} ${e.foodName}`).join(" · ")}
    </p>
  );
}
