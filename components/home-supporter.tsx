"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  RefreshCw,
  Settings,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayKey } from "@/lib/utils";
import { useUserMode } from "@/lib/user-mode";
import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useAllMealEntries } from "@/lib/hooks/use-meal-db";
import { RecipientSelector } from "@/components/recipient-selector";
import { RepeatedMealWarning } from "@/components/repeated-meal-warning";
import { MEAL_SLOTS } from "@/lib/utils";

export function HomeSupporter() {
  const router = useRouter();
  const today = todayKey();
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const setMode = useUserMode((s) => s.setMode);
  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const recipientId = selectedRecipient?.id ?? null;

  const { data: allEntries = {} } = useAllMealEntries(recipientId, today);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div className="text-5xl">🔒</div>
        <p className="text-lg font-bold">로그인이 필요해요</p>
        <Button onClick={() => router.push("/auth")} className="w-full max-w-xs h-12">
          로그인 / 회원가입
        </Button>
      </div>
    );
  }

  const slots = MEAL_SLOTS.map((slot) => ({
    ...slot,
    entries: allEntries[slot.id] ?? [],
  }));

  const totalEntries = slots.reduce((sum, s) => sum + s.entries.length, 0);
  const completedSlots = slots.filter((s) => s.entries.length > 0).length;
  const lastLogAt = slots
    .flatMap((s) => s.entries.map((e) => e.logged_at))
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="space-y-4 pb-6">
      <RecipientSelector />

      <div className="space-y-4 px-4 pt-2">
        {selectedRecipient && <RepeatedMealWarning recipientId={selectedRecipient.id} />}

        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
            <h1 className="truncate text-2xl font-extrabold">오늘의 식판</h1>
            {selectedRecipient && (
              <Badge variant="secondary" className="mt-1">
                {selectedRecipient.name}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/settings"
              aria-label="설정"
              className="inline-flex items-center justify-center rounded-full border-2 border-border p-2 hover:bg-accent"
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setMode(null)}
              aria-label="모드 변경"
              className="inline-flex items-center gap-1 rounded-full border-2 border-border px-3 py-2 text-xs font-bold hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              모드 변경
            </button>
          </div>
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
                {lastLogAt
                  ? new Date(lastLogAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {!selectedRecipient ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              위에서 케어 수급자를 선택하거나 추가해주세요
            </CardContent>
          </Card>
        ) : (
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
                    </div>
                    {slot.entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">아직 기록 없음</p>
                    ) : (
                      <p className="line-clamp-1 text-xs text-foreground">
                        {slot.entries
                          .map((e) => `${e.emoji} ${e.food_name} ${e.quantity}${e.unit}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}
