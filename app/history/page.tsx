"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useUserMode } from "@/lib/user-mode";
import {
  useCalendarData,
  useWeeklyNutrition,
  useTopFoods,
  downloadCsv,
  getWeekStart,
} from "@/lib/hooks/use-history";
import { useNutritionAnalysis } from "@/lib/hooks/use-nutrition";
import { MealCalendar } from "@/components/meal-calendar";
import {
  WeeklyCaloriesChart,
  WeeklyMacroChart,
  TopFoodsChart,
} from "@/components/history-charts";
import { RecipientSelector } from "@/components/recipient-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayKey } from "@/lib/utils";

function offsetMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const MONTH_LABELS = [
  "", "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default function HistoryPage() {
  const router = useRouter();
  const today = todayKey();
  const now = new Date();

  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const mode = useUserMode((s) => s.mode);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [downloading, setDownloading] = useState(false);

  const recipientId = selectedRecipient?.id ?? null;
  const weekStart = getWeekStart();
  const { from: monthFrom, to: monthTo } = getMonthRange(year, month);

  const { data: calDays = [] } = useCalendarData(recipientId, year, month);
  const { data: weeklyData = [] } = useWeeklyNutrition(recipientId, weekStart);
  const { data: topFoods = [] } = useTopFoods(recipientId, monthFrom, monthTo);
  const { data: dayNutrition } = useNutritionAnalysis(
    recipientId,
    selectedDate ?? today
  );

  async function handleDownload() {
    if (!recipientId || !selectedRecipient) return;
    setDownloading(true);
    await downloadCsv(
      recipientId,
      selectedRecipient.name,
      monthFrom,
      monthTo
    );
    setDownloading(false);
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

  return (
    <div className="space-y-4 pb-8">
      {mode === "supporter" && <RecipientSelector />}

      <div className="px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">히스토리</h1>
          {selectedRecipient && (
            <span className="text-sm text-muted-foreground">{selectedRecipient.name}</span>
          )}
        </div>

        {/* 달력 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const next = offsetMonth(year, month, -1);
                  setYear(next.year);
                  setMonth(next.month);
                }}
                className="rounded-full p-2 hover:bg-accent"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-extrabold">
                {year}년 {MONTH_LABELS[month]}
              </span>
              <button
                onClick={() => {
                  const next = offsetMonth(year, month, 1);
                  if (
                    next.year > now.getFullYear() ||
                    (next.year === now.getFullYear() &&
                      next.month > now.getMonth() + 1)
                  )
                    return;
                  setYear(next.year);
                  setMonth(next.month);
                }}
                disabled={year === now.getFullYear() && month === now.getMonth() + 1}
                className="rounded-full p-2 hover:bg-accent disabled:opacity-30"
                aria-label="다음 달"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <MealCalendar
              year={year}
              month={month}
              days={calDays}
              selectedDate={selectedDate}
              today={today}
              onSelect={setSelectedDate}
            />
          </CardContent>
        </Card>

        {/* 선택 날짜 상세 */}
        {selectedDate && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-bold text-sm">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}{" "}
                영양 요약
              </p>
              {!dayNutrition || dayNutrition.mealCount === 0 ? (
                <p className="text-sm text-muted-foreground">이 날의 기록이 없어요</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">칼로리</p>
                    <p className="font-extrabold">{Math.round(dayNutrition.calories)} kcal</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">메뉴 수</p>
                    <p className="font-extrabold">{dayNutrition.mealCount}개</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">단백질</p>
                    <p className="font-extrabold">{Math.round(dayNutrition.protein_g)}g</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">탄수화물</p>
                    <p className="font-extrabold">{Math.round(dayNutrition.carbs_g)}g</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 이번 주 칼로리 차트 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-bold">이번 주 칼로리</p>
            <WeeklyCaloriesChart data={weeklyData} />
            <p className="text-xs text-muted-foreground text-right">
              목표 {new Intl.NumberFormat("ko-KR").format(2000)} kcal/일
            </p>
          </CardContent>
        </Card>

        {/* 주간 탄단지 비율 차트 */}
        {weeklyData.some((d) => d.carbs_g > 0) && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-bold">이번 주 영양소 (kcal)</p>
              <WeeklyMacroChart data={weeklyData} />
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />탄수화물
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-signal-good" />단백질
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />지방
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 이번 달 Top 5 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-bold">
              {MONTH_LABELS[month]} 가장 많이 먹은 음식 Top 5
            </p>
            <TopFoodsChart foods={topFoods} />
          </CardContent>
        </Card>

        {/* CSV 다운로드 */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="font-bold text-sm">데이터 내보내기</p>
            <p className="text-xs text-muted-foreground">
              {MONTH_LABELS[month]} 식단 기록을 CSV 파일로 다운로드합니다.
              복지센터·의료기관 제출용으로 활용하세요.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-4 w-4" />
              {downloading
                ? "준비 중..."
                : `${MONTH_LABELS[month]} CSV 다운로드`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
