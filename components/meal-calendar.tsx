"use client";

import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/lib/hooks/use-history";
import { useUserMode } from "@/lib/user-mode";

const DOT_COLORS = [
  "",                // 0 slots
  "bg-amber-400",   // 1
  "bg-amber-400",   // 2
  "bg-signal-good", // 3
  "bg-signal-good", // 4
];

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

type Props = {
  year: number;
  month: number; // 1-indexed
  days: CalendarDay[];
  selectedDate: string | null;
  today: string;
  onSelect: (date: string) => void;
};

export function MealCalendar({ year, month, days, selectedDate, today, onSelect }: Props) {
  const isSelf = useUserMode((s) => s.mode) === "self";
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=일
  // 월요일 시작 → 일요일=6, 월요일=0 ...
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const lastDay = new Date(year, month, 0).getDate();

  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  // 7의 배수로 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className={cn("text-center font-bold text-muted-foreground py-1", isSelf ? "text-sm" : "text-xs")}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const dayNum = parseInt(date.split("-")[2]);
          const data = dayMap.get(date);
          const slotCount = data?.slotCount ?? 0;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const isFuture = date > today;

          return (
            <button
              key={date}
              onClick={() => !isFuture && onSelect(date)}
              disabled={isFuture}
              aria-label={`${month}월 ${dayNum}일${data ? ` 기록 ${slotCount}개` : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-bold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-primary/15 text-primary"
                    : isFuture
                      ? "text-muted-foreground/40 cursor-default"
                      : "hover:bg-accent"
              )}
            >
              {dayNum}
              {slotCount > 0 && !isSelected && (
                <span
                  className={cn(
                    "mt-0.5 h-1.5 w-1.5 rounded-full",
                    DOT_COLORS[slotCount] || "bg-signal-good"
                  )}
                  aria-hidden
                />
              )}
              {slotCount > 0 && isSelected && (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground/60" aria-hidden />
              )}
              {slotCount === 0 && <span className="mt-0.5 h-1.5 w-1.5" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className={cn("mt-3 flex items-center gap-4 text-muted-foreground", isSelf ? "text-sm" : "text-[11px]")}>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-signal-good" />
          3~4 식사
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          1~2 식사
        </span>
      </div>
    </div>
  );
}
