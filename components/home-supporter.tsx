"use client";

import Link from "next/link";
import { BarChart3, ChevronRight, Sparkles, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeChangeButton } from "@/components/mode-change-button";
import { useMealStore, todayKey } from "@/lib/store";
import { MEAL_SLOTS } from "@/lib/utils";

export function HomeSupporter() {
  const today = todayKey();
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const logs = useMealStore((s) => s.logs);

  const slots = MEAL_SLOTS.map((slot) => ({
    ...slot,
    entries: logs[`${today}:${slot.id}`] ?? [],
  }));

  const totalEntries = slots.reduce((sum, s) => sum + s.entries.length, 0);
  const completedSlots = slots.filter((s) => s.entries.length > 0).length;
  const lastLog = slots
    .flatMap((s) => s.entries.map((e) => e.loggedAt))
    .sort((a, b) => b - a)[0];

  return (
    <div className="space-y-4 px-4 pb-6 pt-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
          <h1 className="truncate text-2xl font-extrabold">오늘의 식판</h1>
          <Badge variant="secondary" className="mt-1">
            지원인력 모드
          </Badge>
        </div>
        <ModeChangeButton />
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">기록 시간대</p>
            <p className="text-xl font-extrabold leading-tight">
              {completedSlots}
              <span className="text-sm text-muted-foreground">/4</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">전체 메뉴</p>
            <p className="text-xl font-extrabold leading-tight">
              {totalEntries}
              <span className="text-sm text-muted-foreground">개</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">최근 입력</p>
            <p className="text-xl font-extrabold leading-tight">
              {lastLog
                ? new Date(lastLog).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-2 p-3">
          {slots.map((slot) => (
            <Link
              key={slot.id}
              href={`/log?slot=${slot.id}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="text-2xl" aria-hidden>
                {slot.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{slot.label}</p>
                  {slot.entries.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {slot.entries.length}
                    </Badge>
                  )}
                  {slot.id === "snack" && (
                    <span className="text-[10px] text-muted-foreground">
                      여러 번 가능
                    </span>
                  )}
                </div>
                {slot.entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">아직 기록 없음</p>
                ) : (
                  <p className="line-clamp-1 text-xs text-foreground">
                    {slot.entries
                      .map((e) => `${e.emoji} ${e.foodName} ${e.quantity}${e.unit}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="lg" variant="outline">
          <Link href="/analysis">
            <BarChart3 className="h-5 w-5" aria-hidden />
            영양 분석
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/recommend">
            <Sparkles className="h-5 w-5" aria-hidden />
            메뉴 추천
          </Link>
        </Button>
      </div>

      <Button asChild size="xl" className="w-full">
        <Link href="/log">
          <UtensilsCrossed className="h-6 w-6" aria-hidden />
          빠른 입력
        </Link>
      </Button>
    </div>
  );
}
