"use client";

import { useEffect, useState } from "react";
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
import { MealCamera } from "@/components/meal-camera";
import { unitForId, type FoodCategory, type Food } from "@/lib/food-data";
import { useUserMode } from "@/lib/user-mode";
import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import {
  useMealEntries,
  useMealLog,
  useUpdateMealNote,
  useRecentFoods,
  useAddMealEntry,
  useRemoveMealEntry,
  useUpdateMealQuantity,
  useFoodSearch,
  useAddCustomFood,
} from "@/lib/hooks/use-meal-db";
import { todayKey } from "@/lib/utils";
import { cn, MEAL_SLOTS, type MealSlotId } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

type Tab = "recent" | "frequent";
type MealEntry = Tables<"meal_log_entries">;

export function MealLogger() {
  const router = useRouter();
  const params = useSearchParams();
  const initialSlot = (params.get("slot") as MealSlotId | null) ?? "breakfast";

  const mode = useUserMode((s) => s.mode);
  const isSelf = mode === "self";

  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const recipientId = selectedRecipient?.id ?? null;

  const [slot, setSlot] = useState<MealSlotId>(initialSlot);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const t = window.setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const date = todayKey();

  const { data: entries = [], isLoading } = useMealEntries(recipientId, date, slot);
  const { data: recentFoods = [] } = useRecentFoods(recipientId);
  const addEntry = useAddMealEntry(recipientId);
  const removeEntry = useRemoveMealEntry(recipientId);
  const updateQuantity = useUpdateMealQuantity(recipientId);
  const addCustomFood = useAddCustomFood(user?.id ?? null);

  const { data: suggestions = [], isLoading: isSearchLoading } = useFoodSearch(query);
  const isSearching = query.trim().length > 0;
  const slotMeta = MEAL_SLOTS.find((s) => s.id === slot)!;

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

  if (!recipientId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div className="text-5xl">👤</div>
        <p className="text-lg font-bold">
          {isSelf ? "설정이 필요해요" : "케어 수급자를 선택해주세요"}
        </p>
        <Button onClick={() => router.push("/onboarding")} className="w-full max-w-xs h-12">
          설정하기
        </Button>
      </div>
    );
  }

  function handleAdd(food: Food) {
    addEntry.mutate(
      { date, slot, food },
      {
        onSuccess: () => {
          setJustAdded(food.id);
          setQuery("");
          window.setTimeout(() => setJustAdded(null), 1200);
        },
        onError: () => setErrorMsg("음식 추가에 실패했어요. 다시 시도해 주세요."),
      }
    );
  }

  function handleRemove(entryId: string) {
    removeEntry.mutate(
      { entryId, date, slot },
      { onError: () => setErrorMsg("삭제에 실패했어요. 다시 시도해 주세요.") }
    );
  }

  function handleQty(entryId: string, quantity: number) {
    updateQuantity.mutate(
      { entryId, quantity, date, slot },
      { onError: () => setErrorMsg("수량 변경에 실패했어요. 다시 시도해 주세요.") }
    );
  }

  return (
    <div className={cn("space-y-6 px-4 pb-8 pt-6", isSelf && "space-y-7")}>
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
        >
          ⚠️ {errorMsg}
        </div>
      )}
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

      {slot === "snack" && (
        <p className="rounded-xl bg-meal-snack/10 px-3 py-2 text-sm text-foreground">
          🍎 간식은 시간대마다 여러 번 추가할 수 있어요.
        </p>
      )}

      {/* 사진 인식 */}
      <MealCamera onAdd={handleAdd} isSelf={isSelf} />

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
              {isSearchLoading ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">검색 중...</p>
              ) : suggestions.length === 0 ? (
                <CustomFoodInline
                  initialName={query}
                  onAdd={async (food) => {
                    try {
                      const created = await addCustomFood.mutateAsync(food);
                      handleAdd(created);
                    } catch {
                      setErrorMsg("음식 추가에 실패했어요. 다시 시도해 주세요.");
                    }
                  }}
                  isPending={addCustomFood.isPending}
                />
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

      {/* 빠른 선택 탭 */}
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
            foods={recentFoods}
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

      {/* 케어 메모 (지원인력 전용) */}
      {!isSelf && recipientId && (
        <NoteSection recipientId={recipientId} date={date} slot={slot} />
      )}

      {/* 현재 기록 */}
      <section aria-labelledby="current-entries">
        <h2 id="current-entries" className="mb-2 text-base font-bold">
          {slotMeta.label} 기록 ({entries.length})
        </h2>
        {isLoading ? (
          <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            불러오는 중...
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            아직 추가된 메뉴가 없어요
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e: MealEntry) => {
              const step = unitForId(e.food_id ?? "").step;
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
                      {e.food_name}
                    </span>
                    {e.logged_at && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {new Date(e.logged_at).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(e.id)}
                      aria-label={`${e.food_name} 삭제`}
                      className="rounded-full p-2 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-secondary/60 p-1.5">
                    <QtyButton
                      onClick={() => handleQty(e.id, e.quantity - step)}
                      ariaLabel={`${e.food_name} 양 줄이기`}
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
                      onClick={() => handleQty(e.id, e.quantity + step)}
                      ariaLabel={`${e.food_name} 양 늘리기`}
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

const FOOD_EMOJIS = [
  "🍚","🍜","🥣","🍲","🍳","🥚","🍱","🍗","🐟","🥬",
  "🥗","🍎","🍌","🍊","🥛","🍞","🍕","🥩","🥦","🍪",
];

const CATEGORY_OPTIONS: { value: FoodCategory; label: string }[] = [
  { value: "rice", label: "밥류" },
  { value: "soup", label: "국/찌개" },
  { value: "protein", label: "단백질" },
  { value: "side", label: "반찬" },
  { value: "fruit", label: "과일" },
  { value: "snack", label: "간식" },
  { value: "drink", label: "음료" },
];

function CustomFoodInline({
  initialName,
  onAdd,
  isPending,
}: {
  initialName: string;
  onAdd: (food: Pick<Food, "name" | "emoji" | "category">) => Promise<void>;
  isPending: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState("🍽️");
  const [category, setCategory] = useState<FoodCategory>("side");

  return (
    <div className="space-y-3 p-3">
      <p className="text-sm text-muted-foreground">
        검색 결과가 없어요. 직접 추가해보세요.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="음식 이름"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {FOOD_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={cn(
              "rounded-lg p-1 text-xl leading-none",
              emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-accent"
            )}
            aria-label={e}
          >
            {e}
          </button>
        ))}
      </div>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as FoodCategory)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <Button
        onClick={() => onAdd({ name: name.trim(), emoji, category })}
        disabled={!name.trim() || isPending}
        className="w-full h-10"
        size="sm"
      >
        {isPending ? "추가 중..." : `${emoji} ${name.trim() || "직접 추가"}`}
      </Button>
    </div>
  );
}

function NoteSection({
  recipientId,
  date,
  slot,
}: {
  recipientId: string;
  date: string;
  slot: MealSlotId;
}) {
  const { data: log } = useMealLog(recipientId, date, slot);
  const updateNote = useUpdateMealNote(recipientId);
  const [draft, setDraft] = useState(log?.note ?? "");

  useEffect(() => {
    setDraft(log?.note ?? "");
  }, [log?.note]);

  useEffect(() => {
    if (!log?.id) return;
    const t = window.setTimeout(() => {
      updateNote.mutate({ logId: log.id, note: draft, date, slot });
    }, 800);
    return () => clearTimeout(t);
    // intentionally only re-run on draft change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <section>
      <label htmlFor={`note-${slot}`} className="text-base font-semibold">
        케어 메모
      </label>
      <textarea
        id={`note-${slot}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="특이사항, 선호도 등을 기록해주세요…"
        rows={3}
        className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
    </section>
  );
}

function QuickGrid({
  foods,
  onPick,
  emptyLabel,
  justAdded,
  isSelf,
}: {
  foods: { id: string; name: string; emoji: string }[];
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
              onClick={() =>
                onPick({ id: f.id, name: f.name, emoji: f.emoji, category: "rice" })
              }
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
              <span
                className={cn(
                  "flex-1 font-bold",
                  isSelf ? "text-base" : "text-sm"
                )}
              >
                {f.name}
              </span>
              {flash ? (
                <Check
                  className={cn(isSelf ? "h-6 w-6" : "h-5 w-5", "text-primary")}
                  aria-hidden
                />
              ) : (
                <Plus
                  className={cn(
                    isSelf ? "h-6 w-6" : "h-5 w-5",
                    "text-muted-foreground"
                  )}
                  aria-hidden
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
