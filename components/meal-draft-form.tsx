"use client";

import { useEffect, useState } from "react";
import { Check, Droplets, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DraftRecoveryDialog } from "@/components/draft-recovery-dialog";
import { useDraftAutosave, useDraftRecovery } from "@/lib/use-draft";
import { formatRelativeTime } from "@/lib/draft";
import { cn, MEAL_SLOTS } from "@/lib/utils";
import type { IntakeStatus, MealType } from "@/lib/mealInsights";

const DRAFT_KEY = "meal-note:draft";

/** 임시저장되는 입력 폼 데이터(= meal_records 상세 필드) */
export type MealDraft = {
  mealType: MealType;
  intakeStatus: IntakeStatus | null;
  responseTags: string[];
  fluidMl: number | null;
  memo: string;
};

const EMPTY: MealDraft = {
  mealType: "lunch",
  intakeStatus: null,
  responseTags: [],
  fluidMl: null,
  memo: "",
};

const INTAKE_OPTIONS: { value: IntakeStatus; label: string; emoji: string }[] = [
  { value: "all_eaten", label: "다 먹음", emoji: "😋" },
  { value: "partial", label: "일부", emoji: "🍽️" },
  { value: "refused", label: "거부", emoji: "🙅" },
  { value: "skipped", label: "건너뜀", emoji: "⏭️" },
];

// 반응 태그 8종
const RESPONSE_TAGS = [
  "잘 먹음",
  "즐거워함",
  "집중함",
  "거부",
  "사레들림",
  "남김",
  "도움 필요",
  "천천히",
];

const FLUID_QUICK = [100, 200, 300];

function isEmptyDraft(d: MealDraft): boolean {
  return (
    d.intakeStatus === null &&
    d.responseTags.length === 0 &&
    (d.fluidMl == null || d.fluidMl === 0) &&
    d.memo.trim() === ""
  );
}

export function MealDraftForm() {
  const [draft, setDraft] = useState<MealDraft>(EMPTY);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const { candidate, recover, discard, dismiss } = useDraftRecovery<MealDraft>(DRAFT_KEY);

  // 복구 후보가 잡히면 다이얼로그 오픈
  useEffect(() => {
    if (candidate) setRecoveryOpen(true);
  }, [candidate]);

  // 복구 다이얼로그가 떠 있는 동안엔 자동저장 중지(복구 전 덮어쓰기 방지)
  const { status, savedAt, clear } = useDraftAutosave<MealDraft>(DRAFT_KEY, draft, {
    debounceMs: 250,
    enabled: !recoveryOpen,
    isEmpty: isEmptyDraft,
  });

  function toggleTag(tag: string) {
    setDraft((d) => ({
      ...d,
      responseTags: d.responseTags.includes(tag)
        ? d.responseTags.filter((t) => t !== tag)
        : [...d.responseTags, tag].slice(0, 8),
    }));
  }

  function addFluid(delta: number) {
    setDraft((d) => ({ ...d, fluidMl: Math.max(0, (d.fluidMl ?? 0) + delta) }));
  }

  function onRecover() {
    const env = recover();
    if (env) setDraft({ ...EMPTY, ...env.data });
    setRecoveryOpen(false);
  }

  function onDiscard() {
    discard();
    setRecoveryOpen(false);
  }

  function onSubmit() {
    // TODO(Step 2 연동): save_meal_record RPC 호출. 현재는 임시저장만 정리.
    clear();
    setDraft(EMPTY);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  const autosaveLabel =
    status === "saving"
      ? "저장 중…"
      : status === "saved" && savedAt
        ? `임시저장됨 · ${formatRelativeTime(savedAt)}`
        : "자동 저장";

  return (
    <section className="space-y-5 px-4 pb-8 pt-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">지원인력 입력</p>
          <h2 className="text-xl font-extrabold">식사 상세 · 반응 기록</h2>
        </div>
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {status === "saved" && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
          {autosaveLabel}
        </span>
      </div>

      {/* 끼니 */}
      <Field label="끼니">
        <div className="grid grid-cols-4 gap-2">
          {MEAL_SLOTS.map((m) => {
            const active = draft.mealType === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setDraft((d) => ({ ...d, mealType: m.id }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-accent",
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
      </Field>

      {/* 섭취 상태 */}
      <Field label="섭취 상태">
        <div className="grid grid-cols-4 gap-2">
          {INTAKE_OPTIONS.map((opt) => {
            const active = draft.intakeStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    intakeStatus: d.intakeStatus === opt.value ? null : opt.value,
                  }))
                }
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {opt.emoji}
                </span>
                <span className="text-xs font-bold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* 반응 태그 */}
      <Field label="반응 태그">
        <div className="flex flex-wrap gap-2">
          {RESPONSE_TAGS.map((tag) => {
            const active = draft.responseTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </Field>

      {/* 수분 */}
      <Field label="수분 섭취 (ml)">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="50ml 빼기"
            onClick={() => addFluid(-50)}
          >
            <Minus className="h-5 w-5" aria-hidden />
          </Button>
          <div className="relative">
            <Droplets
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={draft.fluidMl ?? ""}
              placeholder="0"
              aria-label="수분 섭취량 ml"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  fluidMl: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                }))
              }
              className="w-28 pl-10 text-center"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="50ml 더하기"
            onClick={() => addFluid(50)}
          >
            <Plus className="h-5 w-5" aria-hidden />
          </Button>
          {FLUID_QUICK.map((v) => (
            <Button key={v} type="button" variant="secondary" size="sm" onClick={() => addFluid(v)}>
              +{v}
            </Button>
          ))}
        </div>
      </Field>

      {/* 메모 */}
      <Field label="메모">
        <Textarea
          value={draft.memo}
          placeholder="특이사항·컨디션 등을 자유롭게 적어주세요"
          aria-label="메모"
          onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
        />
      </Field>

      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            입력은 250ms마다 자동 임시저장됩니다(30일 보관). 네트워크가 끊겨도 안전합니다.
          </p>
          <Button type="button" onClick={onSubmit} disabled={isEmptyDraft(draft)}>
            {savedFlash ? "저장됨!" : "기록 저장"}
          </Button>
        </CardContent>
      </Card>

      <DraftRecoveryDialog
        open={recoveryOpen}
        savedAt={candidate?.savedAt ?? null}
        onRecover={onRecover}
        onDiscard={onDiscard}
        onOpenChange={(open) => {
          if (!open) {
            setRecoveryOpen(false);
            dismiss();
          }
        }}
      />
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground">{label}</label>
      {children}
    </div>
  );
}
