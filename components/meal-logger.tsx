"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  History,
  Minus,
  Plus,
  Star,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMealStore, todayKey } from "@/lib/store";
import { searchFoods, unitForId, type Food } from "@/lib/food-data";
import { useUserMode } from "@/lib/user-mode";
import { cn, MEAL_SLOTS, SLOT_DEFAULT_TIMES, type MealSlotId } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

type Tab = "recent" | "frequent";

export function MealLogger() {
  const router = useRouter();
  const params = useSearchParams();
  const initialSlot = (params.get("slot") as MealSlotId | null) ?? "breakfast";

  const hydrated = useHydrated();
  const mode = useUserMode((s) => s.mode);
  const isSelf = mode === "self";

  const [slot, setSlot] = useState<MealSlotId>(initialSlot);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [slotTimes, setSlotTimes] = useState<Record<MealSlotId, string>>(
    { ...SLOT_DEFAULT_TIMES }
  );

  const date = todayKey();
  const entries = useMealStore((s) => s.logs[`${date}:${slot}`] ?? []);
  const addEntry = useMealStore((s) => s.addEntry);
  const removeEntry = useMealStore((s) => s.removeEntry);
  const setQuantity = useMealStore((s) => s.setQuantity);
  const recent = useMealStore((s) => s.getRecentFoods(8));
  const frequent = useMealStore((s) => s.getFrequentFoods(8));

  const suggestions = useMemo(() => searchFoods(query), [query]);
  const isSearching = query.trim().length > 0;
  const slotMeta = MEAL_SLOTS.find((s) => s.id === slot)!;
  const currentTime = slotTimes[slot];

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  function handleAdd(food: Food) {
    addEntry(date, slot, food, currentTime);
    setJustAdded(food.id);
    setQuery("");
    window.setTimeout(() => setJustAdded(null), 1200);
  }

  function handleTimeChange(time: string) {
    setSlotTimes((prev) => ({ ...prev, [slot]: time }));
  }

  return (
    <div className={cn("space-y-6 px-4 pb-8 pt-6", isSelf && "space-y-7")}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">식사 기록</p>
          <h1 className={cn("font-extrabold", isSelf ? "text-3xl" : "text-2xl")}>
            무엇을 드셨나요?
          </h1>
        </div>
      </div>

      {/* 시간대 선택 */}
      <div role="tablist" aria-label="식사 시간대" className="grid grid-cols-4 gap-2">
        {MEAL_SLOTS.map((m) => {
          const active = m.id === slot;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSlot(m.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 transition-colors",
                isSelf ? "p-4" : "p-3",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              <span className={cn(isSelf ? "text-3xl" : "text-2xl")} aria-hidden>
                {m.emoji}
              </span>
              <span className={cn("font-bold", isSelf ? "text-base" : "text-sm")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 식사 시간 설정 */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3">
        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex-1">
          <p className={cn("font-bold", isSelf ? "text-base" : "text-sm")}>
            {slotMeta.label} 식사 시간
          </p>
          <p className="text-xs text-muted-foreground">
            실제 드신 시간을 설정해 주세요
          </p>
        </div>
        <input
          type="time"
          value={currentTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          aria-label={`${slotMeta.label} 식사 시간 설정`}
          className={cn(
            "rounded-xl border-2 border-border bg-background px-3 font-extrabold tabular-nums text-foreground focus:border-primary focus:outline-none",
            isSelf ? "py-2 text-xl" : "py-1.5 text-base"
          )}
        />
      </div>

      {slot === "snack" && (
        <p className="rounded-xl bg-meal-snack/10 px-3 py-2 text-sm text-foreground">
          🍎 간식은 시간대마다 여러 번 추가할 수 있어요.
        </p>
      )}

      {/* 검색창 */}
      <div className="space-y-2">
        <label htmlFor="food-search" className="text-base font-semibold">
          {slotMeta.label} 메뉴 입력
        </label>
        <div className="relative">
          <Input
            id="food-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 김치찌개, 계란말이…"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="입력 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {isSearching && (
          <Card>
            <CardContent className="p-2">
              {suggestions.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  일치하는 음식이 없어요. 직접 추가해 보세요.
                </p>
              ) : (
                <ul>
                  {suggestions.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => handleAdd(f)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent"
                      >
                        <span className="text-2xl" aria-hidden>
                          {f.emoji}
                        </span>
                        <span className="flex-1 text-base font-semibold">
                          {f.name}
                        </span>
                        <Plus className="h-5 w-5 text-primary" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 빠른 선택 탭: 최근/자주 */}
      {!isSearching && (
        <div>
          <div role="tablist" aria-label="빠른 선택" className="mb-3 flex gap-2">
            <QuickTab active={tab === "recent"} onClick={() => setTab("recent")}>
              <History className="h-4 w-4" aria-hidden />
              최근
            </QuickTab>
            <QuickTab active={tab === "frequent"} onClick={() => setTab("frequent")}>
              <Star className="h-4 w-4" aria-hidden />
              자주
            </QuickTab>
          </div>
          <QuickGrid
            foods={tab === "recent" ? recent : frequent}
            onPick={handleAdd}
            justAdded={justAdded}
            isSelf={isSelf}
            emptyLabel={
              tab === "recent"
                ? "최근 기록이 아직 없어요."
                : "자주 먹은 음식이 아직 없어요."
            }
          />
        </div>
      )}

      {/* 현재 기록 */}
      <section aria-labelledby="current-entries">
        <h2 id="current-entries" className="mb-2 text-base font-bold">
          {slotMeta.label} 기록 ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            아직 추가된 메뉴가 없어요
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const step = unitForId(e.foodId).step;
              return (
                <li
                  key={e.id}
                  className="rounded-2xl border-2 border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(isSelf ? "text-3xl" : "text-2xl")} aria-hidden>
                      {e.emoji}
                    </span>
                    <span className="flex-1 text-base font-semibold">
                      {e.foodName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {e.mealTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEntry(date, slot, e.id)}
                      aria-label={`${e.foodName} 삭제`}
                      className="rounded-full p-2 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-secondary/60 p-1.5">
                    <QtyButton
                      onClick={() => setQuantity(date, slot, e.id, e.quantity - step)}
                      ariaLabel={`${e.foodName} 양 줄이기`}
                      disabled={e.quantity <= step}
                      isSelf={isSelf}
                    >
                      <Minus className={cn(isSelf ? "h-6 w-6" : "h-5 w-5")} />
                    </QtyButton>
                    <span
                      className={cn(
                        "min-w-[5rem] text-center font-extrabold tabular-nums",
                        isSelf ? "text-2xl" : "text-lg"
                      )}
                    >
                      {formatQty(e.quantity)} {e.unit}
                    </span>
                    <QtyButton
                      onClick={() => setQuantity(date, slot, e.id, e.quantity + step)}
                      ariaLabel={`${e.foodName} 양 늘리기`}
                      isSelf={isSelf}
                    >
                      <Plus className={cn(isSelf ? "h-6 w-6" : "h-5 w-5")} />
                    </QtyButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}

function QuickTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 px-4 py-2 text-sm font-bold",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function QtyButton({
  onClick,
  ariaLabel,
  disabled,
  isSelf,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  isSelf: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-xl bg-background font-bold transition-colors hover:bg-accent disabled:opacity-40",
        isSelf ? "h-14 w-14" : "h-11 w-11"
      )}
    >
      {children}
    </button>
  );
}

function QuickGrid({
  foods,
  onPick,
  emptyLabel,
  justAdded,
  isSelf,
}: {
  foods: Food[];
  onPick: (f: Food) => void;
  emptyLabel: string;
  justAdded: string | null;
  isSelf: boolean;
}) {
  if (foods.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-2">
      {foods.map((f) => {
        const flash = justAdded === f.id;
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl border-2 text-left transition-colors",
                isSelf ? "p-4" : "p-3",
                flash
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <span className={cn(isSelf ? "text-3xl" : "text-2xl")} aria-hidden>
                {f.emoji}
              </span>
              <span className={cn("flex-1 font-bold", isSelf ? "text-base" : "text-sm")}>
                {f.name}
              </span>
              {flash ? (
                <Check className={cn(isSelf ? "h-6 w-6" : "h-5 w-5", "text-primary")} aria-hidden />
              ) : (
                <Plus className={cn(isSelf ? "h-6 w-6" : "h-5 w-5", "text-muted-foreground")} aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
