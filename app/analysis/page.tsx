"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";

import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useUserMode } from "@/lib/user-mode";
import {
  useNutritionAnalysis,
  useRecipientTargets,
  useUpdateRecipientTargets,
  DAILY_TARGETS,
  getSignal,
  signalEmoji,
  overallEmoji,
  type NutrientKey,
  type SignalLevel,
  type TargetValues,
} from "@/lib/hooks/use-nutrition";
import { PraiseBadges } from "@/components/praise-badges";
import { RecipientSelector } from "@/components/recipient-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "calories", label: "칼로리", unit: "kcal" },
  { key: "carbs_g", label: "탄수화물", unit: "g" },
  { key: "protein_g", label: "단백질", unit: "g" },
  { key: "fat_g", label: "지방", unit: "g" },
  { key: "fiber_g", label: "식이섬유", unit: "g" },
];

const SIGNAL_COLORS: Record<SignalLevel, string> = {
  good: "bg-signal-good",
  warn: "bg-signal-warn",
  bad: "bg-signal-bad",
  empty: "bg-muted",
};

function offsetDate(base: string, delta: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return todayKey(d);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function AnalysisPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const mode = useUserMode((s) => s.mode);
  const [date, setDate] = useState(todayKey());

  const [editingTargets, setEditingTargets] = useState(false);

  const recipientId = selectedRecipient?.id ?? null;
  const { data: totals, isLoading } = useNutritionAnalysis(recipientId, date);
  const { data: recipientTargets } = useRecipientTargets(recipientId);
  const updateTargets = useUpdateRecipientTargets(recipientId);

  const effectiveTargets = recipientTargets ?? DAILY_TARGETS;

  const today = todayKey();
  const isToday = date === today;

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

  const mealCount = totals?.mealCount ?? 0;
  const categories = totals?.categories ?? [];

  return (
    <div className="space-y-4 pb-8">
      {mode === "supporter" && <RecipientSelector />}

      <div className="px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">영양 분석</h1>
          <div className="flex items-center gap-2">
            {selectedRecipient && (
              <span className="text-sm text-muted-foreground">{selectedRecipient.name}</span>
            )}
            <button
              onClick={() => setEditingTargets((v) => !v)}
              className="rounded-full p-2 hover:bg-accent"
              aria-label="영양 목표 설정"
              aria-pressed={editingTargets}
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {editingTargets && (
          <TargetEditCard
            initial={effectiveTargets}
            onSave={(t) =>
              updateTargets.mutate(t, { onSuccess: () => setEditingTargets(false) })
            }
            onCancel={() => setEditingTargets(false)}
            isPending={updateTargets.isPending}
          />
        )}

        {/* Date navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setDate(offsetDate(date, -1))}
            className="rounded-full p-2 hover:bg-accent"
            aria-label="이전 날"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center font-bold">{formatDate(date)}</span>
          <button
            onClick={() => setDate(offsetDate(date, 1))}
            disabled={isToday}
            className="rounded-full p-2 hover:bg-accent disabled:opacity-30"
            aria-label="다음 날"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : mealCount === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-4xl">🍽️</p>
              <p className="text-base font-bold">이 날의 기록이 없어요</p>
              <p className="text-sm text-muted-foreground">식사를 기록하면 영양 분석이 나타나요</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall summary */}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-5xl" aria-hidden>
                  {overallEmoji(totals!, effectiveTargets)}
                </span>
                <div>
                  <p className="text-lg font-extrabold">
                    {Math.round(totals!.calories).toLocaleString()} kcal
                  </p>
                  <p className="text-sm text-muted-foreground">
                    목표 {effectiveTargets.calories.toLocaleString()} kcal 중{" "}
                    {Math.round((totals!.calories / effectiveTargets.calories) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    총 {mealCount}개 메뉴 기록됨
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nutrient bars */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="font-bold">영양소별 현황</p>
                {NUTRIENTS.filter((n) => n.key !== "calories").map(({ key, label, unit }) => {
                  const actual = totals![key];
                  const target = effectiveTargets[key];
                  const pct = Math.min((actual / target) * 100, 150);
                  const signal = getSignal(actual, target);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">
                          {signalEmoji(signal)} {label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {Math.round(actual)}{unit} / {target}{unit}
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            SIGNAL_COLORS[signal]
                          )}
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={Math.round(actual)}
                          aria-valuemin={0}
                          aria-valuemax={target}
                          aria-label={label}
                        />
                      </div>
                      <SignalNote signal={signal} pct={actual / target} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Macros pie-like summary */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-bold">3대 영양소 비율</p>
                <MacroRatio
                  carbs={totals!.carbs_g}
                  protein={totals!.protein_g}
                  fat={totals!.fat_g}
                />
              </CardContent>
            </Card>

            {/* Praise badges */}
            {categories.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <PraiseBadges categories={categories} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TargetEditCard({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial: TargetValues;
  onSave: (t: TargetValues) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [vals, setVals] = useState<TargetValues>({ ...initial });

  const set = (key: keyof TargetValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVals((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-bold text-sm">개인 영양 목표 설정</p>
        {NUTRIENTS.map(({ key, label, unit }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-sm font-semibold">{label}</label>
            <input
              type="number"
              min={0}
              value={vals[key]}
              onChange={set(key)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="w-8 shrink-0 text-xs text-muted-foreground">{unit}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            취소
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(vals)}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalNote({ signal, pct }: { signal: SignalLevel; pct: number }) {
  if (signal === "empty" || signal === "good") return null;
  const msg =
    pct < 0.4
      ? "많이 부족해요"
      : pct < 0.7
        ? "조금 부족해요"
        : pct > 1.5
          ? "너무 많아요"
          : "조금 많아요";
  return (
    <p
      className={cn(
        "text-[11px]",
        signal === "warn" ? "text-amber-600" : "text-red-500"
      )}
    >
      {msg}
    </p>
  );
}

function MacroRatio({
  carbs,
  protein,
  fat,
}: {
  carbs: number;
  protein: number;
  fat: number;
}) {
  const carbsKcal = carbs * 4;
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const total = carbsKcal + proteinKcal + fatKcal;

  if (total === 0)
    return <p className="text-sm text-muted-foreground">기록 없음</p>;

  const pctCarbs = (carbsKcal / total) * 100;
  const pctProtein = (proteinKcal / total) * 100;
  const pctFat = (fatKcal / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        <div
          className="bg-amber-400 transition-all"
          style={{ width: `${pctCarbs}%` }}
          title="탄수화물"
        />
        <div
          className="bg-signal-good transition-all"
          style={{ width: `${pctProtein}%` }}
          title="단백질"
        />
        <div
          className="bg-blue-400 transition-all"
          style={{ width: `${pctFat}%` }}
          title="지방"
        />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          탄수화물 {Math.round(pctCarbs)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-signal-good" />
          단백질 {Math.round(pctProtein)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
          지방 {Math.round(pctFat)}%
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        권장 비율: 탄수화물 55~65% · 단백질 10~15% · 지방 20~30%
      </p>
    </div>
  );
}
