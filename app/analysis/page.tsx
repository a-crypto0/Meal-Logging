"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMealStore, todayKey, type MealEntry } from "@/lib/store";
import { FOOD_CATALOG, type Nutrition } from "@/lib/food-data";
import { MEAL_SLOTS } from "@/lib/utils";

type NutritionTotals = Nutrition & { kcal: number };
type SlotBreakdown = {
  slot: (typeof MEAL_SLOTS)[number];
  entries: MealEntry[];
  total: NutritionTotals;
};

// ---- 목표치 (일반 성인 기준) ----
const TARGETS: Nutrition & { kcal: number } = {
  kcal:    2000,
  carbs:   300,
  protein: 55,
  fat:     55,
  fiber:   25,
};

type Signal = "good" | "warn" | "bad";

function getSignal(value: number, target: number): Signal {
  const r = value / target;
  if (r >= 0.7 && r <= 1.2) return "good";
  if (r >= 0.4 && r <= 1.5) return "warn";
  return "bad";
}

const SIGNAL_BAR: Record<Signal, string> = {
  good: "bg-green-500",
  warn: "bg-yellow-400",
  bad:  "bg-red-500",
};

const SIGNAL_TEXT: Record<Signal, string> = {
  good: "text-green-600",
  warn: "text-yellow-600",
  bad:  "text-red-600",
};

const SIGNAL_LABEL: Record<Signal, string> = {
  good: "적정",
  warn: "주의",
  bad:  "부족/과다",
};

function overallFace(totals: Nutrition & { kcal: number }): string {
  const macros = ["carbs", "protein", "fat"] as const;
  const goods = macros.filter(
    (k) => getSignal(totals[k], TARGETS[k]) === "good"
  ).length;
  if (goods === 3) return "😊";
  if (goods >= 2) return "🙂";
  if (goods >= 1) return "😐";
  return "😟";
}

export default function AnalysisPage() {
  const today = todayKey();
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const logs = useMealStore((s) => s.logs);

  // 오늘 슬롯별 항목 + 영양 합산
  const { totals, slotBreakdowns } = useMemo(() => {
    const acc: NutritionTotals = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

    const slotBreakdowns: SlotBreakdown[] = MEAL_SLOTS.map((slot) => {
      const entries: MealEntry[] = logs[`${today}:${slot.id}`] ?? [];
      const slotTotal: NutritionTotals = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

      for (const entry of entries) {
        const food = FOOD_CATALOG.find((f) => f.id === entry.foodId);
        if (!food) continue;
        const q = entry.quantity;
        slotTotal.kcal    += food.nutrition.kcal    * q;
        slotTotal.carbs   += food.nutrition.carbs   * q;
        slotTotal.protein += food.nutrition.protein * q;
        slotTotal.fat     += food.nutrition.fat     * q;
        slotTotal.fiber   += food.nutrition.fiber   * q;
      }

      acc.kcal    += slotTotal.kcal;
      acc.carbs   += slotTotal.carbs;
      acc.protein += slotTotal.protein;
      acc.fat     += slotTotal.fat;
      acc.fiber   += slotTotal.fiber;

      return { slot, entries, total: slotTotal };
    });

    return { totals: acc, slotBreakdowns };
  }, [logs, today]);

  const hasAnyEntry = slotBreakdowns.some((bd) => bd.entries.length > 0);
  const face = overallFace(totals);

  const macros = [
    { key: "kcal"    as const, label: "열량",   unit: "kcal", target: TARGETS.kcal    },
    { key: "carbs"   as const, label: "탄수화물", unit: "g",   target: TARGETS.carbs   },
    { key: "protein" as const, label: "단백질",  unit: "g",   target: TARGETS.protein },
    { key: "fat"     as const, label: "지방",    unit: "g",   target: TARGETS.fat     },
    { key: "fiber"   as const, label: "식이섬유", unit: "g",   target: TARGETS.fiber   },
  ];

  return (
    <div className="space-y-5 px-4 pb-8 pt-6">
      {/* 헤더 */}
      <header>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-extrabold">영양 분석</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel} · 오늘 식단 기준</p>
      </header>

      {!hasAnyEntry ? (
        /* 기록 없음 */
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border py-12 text-center">
          <div className="text-6xl">🍽️</div>
          <div>
            <p className="font-bold">아직 오늘 식단이 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              음식을 기록하면 영양 분석을 볼 수 있어요
            </p>
          </div>
          <Button asChild>
            <Link href="/log">음식 기록하기</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* 종합 평가 카드 */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="text-6xl" aria-hidden>{face}</div>
              <div>
                <p className="text-lg font-extrabold">
                  오늘 섭취 {Math.round(totals.kcal)} kcal
                </p>
                <p className="text-sm text-muted-foreground">
                  목표 {TARGETS.kcal} kcal 대비{" "}
                  <span className={SIGNAL_TEXT[getSignal(totals.kcal, TARGETS.kcal)]}>
                    {Math.round((totals.kcal / TARGETS.kcal) * 100)}%
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  * 일반 성인 권장 기준 (개인차 있음)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 영양소 진행 바 */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-bold">영양소 현황</h2>
              </div>
              {macros.map(({ key, label, unit, target }) => {
                const value = totals[key];
                const signal = getSignal(value, target);
                const pct = Math.min(Math.round((value / target) * 100), 150);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {Math.round(value * 10) / 10}
                          <span className="text-xs"> / {target}{unit}</span>
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${SIGNAL_TEXT[signal]}`}
                          style={{ backgroundColor: "transparent" }}
                        >
                          {SIGNAL_LABEL[signal]}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${SIGNAL_BAR[signal]}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(value)}
                        aria-valuemin={0}
                        aria-valuemax={target}
                        aria-label={`${label} ${Math.round(value)}${unit} / ${target}${unit}`}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 신호등 범례 */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            {(["good", "warn", "bad"] as Signal[]).map((s) => (
              <div key={s} className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${SIGNAL_BAR[s]}`} />
                {SIGNAL_LABEL[s]}
              </div>
            ))}
          </div>

          {/* 끼니별 상세 */}
          <section aria-labelledby="slot-breakdown">
            <h2 id="slot-breakdown" className="mb-2 font-bold">끼니별 상세</h2>
            <div className="space-y-2">
              {slotBreakdowns.map((bd) => { const { slot, entries, total } = bd; return (
                <Card key={slot.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden>{slot.emoji}</span>
                      <span className="font-bold">{slot.label}</span>
                      {entries.length === 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">기록 없음</span>
                      )}
                      {entries.length > 0 && (
                        <span className="ml-auto text-sm font-semibold tabular-nums text-muted-foreground">
                          {Math.round(total.kcal)} kcal
                        </span>
                      )}
                    </div>
                    {entries.length > 0 && (
                      <>
                        <ul className="mt-2 space-y-1">
                          {entries.map((e) => (
                            <li key={e.id} className="flex items-center gap-2 text-sm">
                              <span aria-hidden>{e.emoji}</span>
                              <span className="flex-1">{e.foodName}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {e.quantity}{e.unit}
                              </span>
                              <span className="text-xs text-muted-foreground">{e.mealTime}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex gap-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                          <span>탄 {Math.round(total.carbs)}g</span>
                          <span>단 {Math.round(total.protein)}g</span>
                          <span>지 {Math.round(total.fat)}g</span>
                          <span>섬유 {Math.round(total.fiber * 10) / 10}g</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ); })}
            </div>
          </section>

          <Button asChild variant="outline" className="w-full">
            <Link href="/log">
              음식 더 추가하기
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
