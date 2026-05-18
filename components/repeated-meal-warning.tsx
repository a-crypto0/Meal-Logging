"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useRepetitiveFoods } from "@/lib/hooks/use-nutrition";

export function RepeatedMealWarning({ recipientId }: { recipientId: string }) {
  const { data: repeated = [] } = useRepetitiveFoods(recipientId);
  const [dismissed, setDismissed] = useState(false);

  if (repeated.length === 0 || dismissed) return null;

  return (
    <div className="mx-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800">반복 식단 주의</p>
          <p className="mt-0.5 text-xs text-amber-700">
            최근 7일 내 같은 음식이 3일 이상 등장했어요.
          </p>
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
