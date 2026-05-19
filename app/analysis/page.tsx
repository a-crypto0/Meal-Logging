"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMealStore, todayKey, type MealEntry } from "@/lib/store";
import { FOOD_CATALOG, type Food, type Nutrition } from "@/lib/food-data";
import { MEAL_SLOTS } from "@/lib/utils";
import { useSettingsStore } from "@/lib/settings-store";

// ---- 목표치 (일반 성인 기준) ----
type NutritionTotals = Nutrition & { kcal: number };

const TARGETS: NutritionTotals = {
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

function overallFace(totals: NutritionTotals): string {
  const macros = ["carbs", "protein", "fat"] as const;
  const goods = macros.filter((k) => getSignal(totals[k], TARGETS[k]) === "good").length;
  if (goods === 3) return "😊";
  if (goods >= 2) return "🙂";
  if (goods >= 1) return "😐";
  return "😟";
}

// ---- OFD nutrition cache (per session) ----
type NutritionSource = "ofd" | "local";
type FoodNutrition = NutritionTotals & { source: NutritionSource };
type NutritionCache = Record<string, FoodNutrition>; // foodId → nutrition per 1 unit

async function fetchOfdNutrition(food: Food): Promise<FoodNutrition | null> {
  try {
    const res = await fetch(
      `/api/nutrition?q=${encodeURIComponent(food.name)}&cat=${food.category}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.found) return null;
    return { ...data.perServing, source: "ofd" as const };
  } catch {
    return null;
  }
}

function localNutrition(food: Food): FoodNutrition {
  return { ...food.nutrition, source: "local" as const };
}

type SlotBreakdown = {
  slot: (typeof MEAL_SLOTS)[number];
  entries: MealEntry[];
  total: NutritionTotals;
};

const MACROS = [
  { key: "kcal"    as const, label: "열량",    unit: "kcal" },
  { key: "carbs"   as const, label: "탄수화물", unit: "g"   },
  { key: "protein" as const, label: "단백질",   unit: "g"   },
  { key: "fat"     as const, label: "지방",     unit: "g"   },
  { key: "fiber"   as const, label: "식이섬유", unit: "g"   },
];

export default function AnalysisPage() {
  const today = todayKey();
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const logs = useMealStore((s) => s.logs);
  const { openAiKey } = useSettingsStore();

  // ---- OFD fetch state ----
  const [nutritionCache, setNutritionCache] = useState<NutritionCache>({});
  const [fetchingOfd, setFetchingOfd] = useState(true);

  // ---- AI insight state ----
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Collect unique foods from today's logs
  const todayFoods = useMemo(() => {
    const seen = new Set<string>();
    const foods: Food[] = [];
    for (const slot of MEAL_SLOTS) {
      for (const entry of logs[`${today}:${slot.id}`] ?? []) {
        if (seen.has(entry.foodId)) continue;
        seen.add(entry.foodId);
        const food = FOOD_CATALOG.find((f) => f.id === entry.foodId);
        if (food) foods.push(food);
      }
    }
    return foods;
  }, [logs, today]);

  // Fetch OFD nutrition for all unique foods in parallel
  useEffect(() => {
    if (todayFoods.length === 0) {
      setFetchingOfd(false);
      return;
    }
    setFetchingOfd(true);
    Promise.all(
      todayFoods.map(async (food) => {
        const ofd = await fetchOfdNutrition(food);
        return { foodId: food.id, nutrition: ofd ?? localNutrition(food) };
      })
    ).then((results) => {
      const cache: NutritionCache = {};
      for (const { foodId, nutrition } of results) cache[foodId] = nutrition;
      setNutritionCache(cache);
    }).finally(() => setFetchingOfd(false));
  }, [todayFoods]);

  // Compute slot breakdowns and totals using cache
  const { totals, slotBreakdowns } = useMemo(() => {
    const acc: NutritionTotals = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

    const slotBreakdowns: SlotBreakdown[] = MEAL_SLOTS.map((slot) => {
      const entries: MealEntry[] = logs[`${today}:${slot.id}`] ?? [];
      const slotTotal: NutritionTotals = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

      for (const entry of entries) {
        const food = FOOD_CATALOG.find((f) => f.id === entry.foodId);
        if (!food) continue;
        const n = nutritionCache[entry.foodId] ?? localNutrition(food);
        const q = entry.quantity;
        slotTotal.kcal    += n.kcal    * q;
        slotTotal.carbs   += n.carbs   * q;
        slotTotal.protein += n.protein * q;
        slotTotal.fat     += n.fat     * q;
        slotTotal.fiber   += n.fiber   * q;
      }

      acc.kcal    += slotTotal.kcal;
      acc.carbs   += slotTotal.carbs;
      acc.protein += slotTotal.protein;
      acc.fat     += slotTotal.fat;
      acc.fiber   += slotTotal.fiber;

      return { slot, entries, total: slotTotal };
    });

    return { totals: acc, slotBreakdowns };
  }, [logs, today, nutritionCache]);

  const hasAnyEntry = slotBreakdowns.some((bd) => bd.entries.length > 0);
  const ofdCount = (Object.values(nutritionCache) as FoodNutrition[]).filter((n) => n.source === "ofd").length;

  async function handleInsight() {
    if (!openAiKey) return;
    setLoadingInsight(true);
    setInsightError(null);
    setInsight(null);

    const mealSummary = slotBreakdowns
      .filter((bd) => bd.entries.length > 0)
      .map((bd) => {
        const foods = bd.entries.map((e) => `${e.foodName} ${e.quantity}${e.unit}`).join(", ");
        return `${bd.slot.label}: ${foods}`;
      })
      .join(" / ");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: openAiKey, nutrition: totals, mealSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류");
      setInsight(data.insight);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setLoadingInsight(false);
    }
  }

  return (
    <div className="space-y-5 px-4 pb-8 pt-6">
      <header>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-extrabold">영양 분석</h1>
          {fetchingOfd && hasAnyEntry && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel} · 오늘 식단 기준</p>
        {!fetchingOfd && hasAnyEntry && (
          <p className="mt-1 text-xs text-muted-foreground">
            영양 데이터:{" "}
            {ofdCount > 0
              ? `${ofdCount}개 Open Food Facts · ${todayFoods.length - ofdCount}개 추정값`
              : "자체 추정값 사용"}
          </p>
        )}
      </header>

      {!hasAnyEntry ? (
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
          {/* 종합 평가 */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="text-6xl" aria-hidden>{overallFace(totals)}</div>
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
              {MACROS.map(({ key, label, unit }) => {
                const value = totals[key];
                const target = TARGETS[key];
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
                        <span className={`text-xs font-bold ${SIGNAL_TEXT[signal]}`}>
                          {SIGNAL_LABEL[signal]}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${SIGNAL_BAR[signal]}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(value)}
                        aria-valuemin={0}
                        aria-valuemax={target}
                        aria-label={`${label} ${Math.round(value)}${unit}`}
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

          {/* AI 인사이트 */}
          {openAiKey && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-bold">AI 영양 인사이트</h2>
                </div>
                {!insight && !loadingInsight && !insightError && (
                  <Button onClick={handleInsight} variant="outline" className="w-full">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    AI 조언 받기
                  </Button>
                )}
                {loadingInsight && (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    분석 중…
                  </div>
                )}
                {insightError && (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">{insightError}</p>
                    <Button onClick={handleInsight} variant="outline" size="sm">
                      다시 시도
                    </Button>
                  </div>
                )}
                {insight && (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{insight}</p>
                    <button
                      type="button"
                      onClick={handleInsight}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      다시 분석하기
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 끼니별 상세 */}
          <section aria-labelledby="slot-breakdown">
            <h2 id="slot-breakdown" className="mb-2 font-bold">끼니별 상세</h2>
            <div className="space-y-2">
              {slotBreakdowns.map((bd) => {
                const { slot, entries, total } = bd;
                return (
                  <Card key={slot.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden>{slot.emoji}</span>
                        <span className="font-bold">{slot.label}</span>
                        {entries.length === 0 ? (
                          <span className="ml-auto text-xs text-muted-foreground">기록 없음</span>
                        ) : (
                          <span className="ml-auto text-sm font-semibold tabular-nums text-muted-foreground">
                            {Math.round(total.kcal)} kcal
                          </span>
                        )}
                      </div>
                      {entries.length > 0 && (
                        <>
                          <ul className="mt-2 space-y-1">
                            {entries.map((e) => {
                              const src = nutritionCache[e.foodId]?.source;
                              return (
                                <li key={e.id} className="flex items-center gap-2 text-sm">
                                  <span aria-hidden>{e.emoji}</span>
                                  <span className="flex-1">{e.foodName}</span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {e.quantity}{e.unit}
                                  </span>
                                  {src && (
                                    <span className={`text-[10px] font-bold ${src === "ofd" ? "text-green-600" : "text-muted-foreground"}`}>
                                      {src === "ofd" ? "OFD" : "추정"}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">{e.mealTime}</span>
                                </li>
                              );
                            })}
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
                );
              })}
            </div>
          </section>

          {!openAiKey && (
            <p className="rounded-2xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              ✨{" "}
              <Link href="/settings" className="font-semibold text-primary underline-offset-2 hover:underline">
                설정에서 OpenAI 키 등록
              </Link>
              하면 AI 맞춤 조언도 받을 수 있어요
            </p>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/log">음식 더 추가하기</Link>
          </Button>
        </>
      )}
    </div>
  );
}
