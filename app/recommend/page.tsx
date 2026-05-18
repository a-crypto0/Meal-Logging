"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";

import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useUserMode } from "@/lib/user-mode";
import { useNutritionAnalysis, useRepetitiveFoods, DAILY_TARGETS } from "@/lib/hooks/use-nutrition";
import { RecipientSelector } from "@/components/recipient-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

type NutritionGap = {
  nutrient: string;
  actual: number;
  target: number;
  unit: string;
  pct: number;
};

const NUTRIENT_LABELS: Record<string, { label: string; unit: string }> = {
  calories: { label: "칼로리", unit: "kcal" },
  carbs_g: { label: "탄수화물", unit: "g" },
  protein_g: { label: "단백질", unit: "g" },
  fat_g: { label: "지방", unit: "g" },
  fiber_g: { label: "식이섬유", unit: "g" },
};

export default function RecommendPage() {
  const router = useRouter();
  const today = todayKey();

  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const mode = useUserMode((s) => s.mode);
  const recipientId = selectedRecipient?.id ?? null;

  const { data: nutrition } = useNutritionAnalysis(recipientId, today);
  const { data: repeatedFoods = [] } = useRepetitiveFoods(recipientId);

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const buildGaps = useCallback((): NutritionGap[] => {
    if (!nutrition) return [];
    return (Object.keys(DAILY_TARGETS) as (keyof typeof DAILY_TARGETS)[]).map(
      (key) => ({
        nutrient: NUTRIENT_LABELS[key]?.label ?? key,
        actual: nutrition[key],
        target: DAILY_TARGETS[key],
        unit: NUTRIENT_LABELS[key]?.unit ?? "",
        pct: nutrition[key] / DAILY_TARGETS[key],
      })
    );
  }, [nutrition]);

  async function handleRecommend() {
    setStatus("loading");
    setResult("");

    const gaps = buildGaps();
    const recentFoods = repeatedFoods.map((f) => ({
      name: f.name,
      emoji: f.emoji,
      days: f.days,
    }));

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nutritionGaps: gaps,
          recentFoods,
          mealCount: nutrition?.mealCount ?? 0,
          recipientName: selectedRecipient?.name,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        setResult(text || "추천을 불러오지 못했어요.");
        setStatus("error");
        return;
      }

      setStatus("done");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResult(accumulated);
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : "네트워크 오류가 발생했어요.");
      setStatus("error");
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <p className="text-5xl">🔒</p>
        <p className="text-lg font-bold">로그인이 필요해요</p>
        <Button onClick={() => router.push("/auth")} className="w-full max-w-xs h-12">
          로그인 / 회원가입
        </Button>
      </div>
    );
  }

  if (!recipientId) {
    return (
      <div>
        {mode === "supporter" && <RecipientSelector />}
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <p className="text-5xl">👤</p>
          <p className="text-lg font-bold">케어 수급자를 선택해주세요</p>
        </div>
      </div>
    );
  }

  const mealCount = nutrition?.mealCount ?? 0;
  const gaps = buildGaps();
  const shortfalls = gaps.filter((g) => g.pct < 0.7);

  return (
    <div className="space-y-4 pb-8">
      {mode === "supporter" && <RecipientSelector />}

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">메뉴 추천</h1>
          {selectedRecipient && (
            <span className="text-sm text-muted-foreground">{selectedRecipient.name}</span>
          )}
        </div>

        {/* 오늘 현황 요약 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-bold text-muted-foreground">오늘 현황</p>
            {mealCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 오늘 식사 기록이 없어요. 기록 후 추천을 받으면 더 정확해요.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  총 <span className="font-bold">{mealCount}개</span> 메뉴 ·{" "}
                  <span className="font-bold">{Math.round(nutrition!.calories)} kcal</span>
                </p>
                {shortfalls.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shortfalls.map((g) => (
                      <span
                        key={g.nutrient}
                        className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                      >
                        {g.nutrient} 부족
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-signal-good font-semibold">영양 균형이 좋아요 🎉</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 반복 식단 알림 */}
        {repeatedFoods.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-amber-800 mb-1.5">반복되는 음식</p>
              <div className="flex flex-wrap gap-1.5">
                {repeatedFoods.slice(0, 5).map((f) => (
                  <span
                    key={f.id}
                    className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
                  >
                    {f.emoji} {f.name}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-amber-700">이 음식들은 피해서 추천해 드릴게요</p>
            </CardContent>
          </Card>
        )}

        {/* 추천 버튼 */}
        <Button
          onClick={handleRecommend}
          disabled={status === "loading"}
          className="w-full h-14 text-base gap-2"
        >
          {status === "loading" ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              추천 받는 중...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {status === "idle" ? "AI 메뉴 추천 받기" : "다시 추천 받기"}
            </>
          )}
        </Button>

        {/* 스트리밍 결과 */}
        {(status === "loading" || status === "done" || status === "error") && (
          <Card className={cn(status === "error" && "border-destructive")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl" aria-hidden>🤖</span>
                <p className="font-bold text-sm">AI 영양사 추천</p>
              </div>

              {status === "loading" && result === "" ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-4 rounded bg-muted animate-pulse"
                      style={{ width: `${70 + i * 10}%` }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  ref={resultRef}
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                >
                  {result}
                  {status === "loading" && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 안내 문구 */}
        <p className="text-center text-xs text-muted-foreground">
          AI 추천은 참고용입니다. 의료적 판단은 전문가에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
