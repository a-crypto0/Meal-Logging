"use client";

import { useState } from "react";
import { AlertTriangle, Settings, Check, X } from "lucide-react";
import {
  useRepetitiveFoods,
  useRepeatThreshold,
  useUpdateRepeatThreshold,
} from "@/lib/hooks/use-nutrition";
import { useUserMode } from "@/lib/user-mode";

export function RepeatedMealWarning({ recipientId }: { recipientId: string }) {
  const mode = useUserMode((s) => s.mode);
  const { data: threshold } = useRepeatThreshold(recipientId);
  const days = threshold?.days ?? 7;
  const count = threshold?.count ?? 3;

  const { data: repeated = [] } = useRepetitiveFoods(recipientId, days, count);
  const update = useUpdateRepeatThreshold(recipientId);

  const [dismissed, setDismissed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftDays, setDraftDays] = useState(days);
  const [draftCount, setDraftCount] = useState(count);

  if (repeated.length === 0 || dismissed) return null;

  function openEdit() {
    setDraftDays(days);
    setDraftCount(count);
    setEditing(true);
  }

  async function save() {
    await update.mutateAsync({ days: draftDays, count: draftCount });
    setEditing(false);
  }

  return (
    <div className="mx-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-amber-800">반복 식단 주의</p>
            {mode === "supporter" && !editing && (
              <button
                onClick={openEdit}
                aria-label="경고 임계값 설정"
                className="rounded-lg p-0.5 hover:bg-amber-200 text-amber-600"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-800">
                <span>최근</span>
                <input
                  type="number"
                  value={draftDays}
                  onChange={(e) =>
                    setDraftDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))
                  }
                  className="w-12 rounded-lg border border-amber-300 bg-white px-2 py-1 text-center font-bold"
                  min={1}
                  max={30}
                />
                <span>일 중</span>
                <input
                  type="number"
                  value={draftCount}
                  onChange={(e) =>
                    setDraftCount(Math.max(1, Math.min(14, parseInt(e.target.value) || 3)))
                  }
                  className="w-12 rounded-lg border border-amber-300 bg-white px-2 py-1 text-center font-bold"
                  min={1}
                  max={14}
                />
                <span>일 이상 반복 시 경고</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={update.isPending}
                  className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  저장
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-amber-700">
              최근 {days}일 내 같은 음식이 {count}일 이상 등장했어요.
            </p>
          )}

          {!editing && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {repeated.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
                >
                  {f.emoji} {f.name}
                  <span className="text-amber-600">{f.days}일</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="경고 닫기"
          className="shrink-0 rounded-full p-1 hover:bg-amber-200"
        >
          <X className="h-4 w-4 text-amber-600" />
        </button>
      </div>
    </div>
  );
}
