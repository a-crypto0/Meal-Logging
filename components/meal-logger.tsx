"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Clock, History, Plus, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMealStore, todayKey } from "@/lib/store";
import { searchFoods, type Food } from "@/lib/food-data";
import { cn, MEAL_SLOTS, type MealSlotId } from "@/lib/utils";

type Tab = "search" | "recent" | "frequent";

export function MealLogger() {
  const router = useRouter();
  const params = useSearchParams();
  const initialSlot = (params.get("slot") as MealSlotId | null) ?? "breakfast";

  const [slot, setSlot] = useState<MealSlotId>(initialSlot);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const date = todayKey();
  const entries = useMealStore((s) => s.logs[`${date}:${slot}`] ?? []);
  const addEntry = useMealStore((s) => s.addEntry);
  const removeEntry = useMealStore((s) => s.removeEntry);
  const recent = useMealStore((s) => s.getRecentFoods(8));
  const frequent = useMealStore((s) => s.getFrequentFoods(8));

  const suggestions = useMemo(() => searchFoods(query), [query]);
  const isSearching = query.trim().length > 0;
  const slotMeta = MEAL_SLOTS.find((s) => s.id === slot)!;

  function handleAdd(food: Food) {
    addEntry(date, slot, food);
    setJustAdded(food.id);
    setQuery("");
    window.setTimeout(() => setJustAdded(null), 1200);
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-6">
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
          <h1 className="text-2xl font-extrabold">무엇을 드셨나요?</h1>
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
                "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              <span className="text-2xl" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-sm font-bold">{m.label}</span>
            </button>
          );
        })}
      </div>

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
                        <span className="flex-1 text-base font-semibold">{f.name}</span>
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

      {/* 빠른 선택 탭: 자주/최근 */}
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
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
              >
                <span className="text-2xl" aria-hidden>
                  {e.emoji}
                </span>
                <span className="flex-1 text-base font-semibold">{e.foodName}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {new Date(e.loggedAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(date, slot, e.id)}
                  aria-label={`${e.foodName} 삭제`}
                  className="rounded-full p-2 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
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

function QuickGrid({
  foods,
  onPick,
  emptyLabel,
  justAdded,
}: {
  foods: Food[];
  onPick: (f: Food) => void;
  emptyLabel: string;
  justAdded: string | null;
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
                "flex w-full items-center gap-2 rounded-2xl border-2 p-3 text-left transition-colors",
                flash
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <span className="text-2xl" aria-hidden>
                {f.emoji}
              </span>
              <span className="flex-1 text-sm font-bold">{f.name}</span>
              {flash ? (
                <Check className="h-5 w-5 text-primary" aria-hidden />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground" aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
