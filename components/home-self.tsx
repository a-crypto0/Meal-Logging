"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMealStore, todayKey } from "@/lib/store";
import { useUserMode } from "@/lib/user-mode";
import { cn, MEAL_SLOTS } from "@/lib/utils";

export function HomeSelf() {
  const today = todayKey();
  const logs = useMealStore((s) => s.logs);
  const setMode = useUserMode((s) => s.setMode);

  const slots = MEAL_SLOTS.map((slot) => ({
    ...slot,
    entries: logs[`${today}:${slot.id}`] ?? [],
  }));

  const completed = slots.filter((s) => s.entries.length > 0).length;
  const faceEmoji =
    completed >= 4 ? "🥳" : completed >= 2 ? "😊" : completed >= 1 ? "🙂" : "🍽️";
  const cheer =
    completed >= 4
      ? "참 잘했어요!"
      : completed >= 2
        ? "잘 드시고 있어요!"
        : completed >= 1
          ? "좋은 시작이에요"
          : "오늘은 무엇을 드실까요?";

  return (
    <div className="space-y-6 px-4 pb-6 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-base text-muted-foreground">안녕하세요!</p>
          <h1 className="text-3xl font-extrabold tracking-tight">오늘의 식판</h1>
        </div>
        <button
          type="button"
          onClick={() => setMode(null)}
          aria-label="모드 변경"
          className="inline-flex items-center gap-1 rounded-full border-2 border-border px-3 py-2 text-xs font-bold hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          모드 변경
        </button>
      </header>

      <div className="flex flex-col items-center gap-2 rounded-3xl bg-primary/10 p-6 text-center">
        <div className="text-7xl" aria-hidden>
          {faceEmoji}
        </div>
        <p className="text-xl font-extrabold">
          오늘 <span className="text-primary">{completed}끼</span> 드셨어요
        </p>
        <p className="text-sm text-muted-foreground">{cheer}</p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          const count = slot.entries.length;
          const done = count > 0;
          return (
            <li key={slot.id}>
              <Link
                href={`/log?slot=${slot.id}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl border-2 p-4 text-center transition-colors",
                  done
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <div className="text-5xl" aria-hidden>
                  {slot.emoji}
                </div>
                <div className="text-xl font-extrabold">{slot.label}</div>
                {done ? (
                  <div className="text-sm font-bold text-primary">
                    ✓ {count}개 기록
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    눌러서 기록
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-muted-foreground">
        🍎 간식은 시간대마다 여러 번 추가할 수 있어요
      </p>

      <Button asChild size="xl" className="w-full">
        <Link href="/log">
          <Plus className="h-7 w-7" aria-hidden />
          음식 추가하기
        </Link>
      </Button>
    </div>
  );
}
