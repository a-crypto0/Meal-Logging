"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { todayKey } from "@/lib/utils";
import { DAILY_TARGETS } from "@/lib/hooks/use-nutrition";

export type CalendarDay = {
  date: string;
  slotCount: number;    // 0–4 시간대 기록 수
  totalEntries: number;
};

export type DailyNutrition = {
  date: string;
  label: string;         // "월", "화" 등
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

export type TopFood = {
  food_id: string;
  food_name: string;
  emoji: string;
  count: number;
};

// 월간 달력 데이터
export function useCalendarData(
  recipientId: string | null,
  year: number,
  month: number // 1-indexed
) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return useQuery({
    queryKey: ["calendar", recipientId, year, month],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async (): Promise<CalendarDay[]> => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, date, slot")
        .eq("recipient_id", recipientId!)
        .gte("date", from)
        .lte("date", to);

      if (!logs || logs.length === 0) return [];

      const logIds = logs.map((l) => l.id);

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select("log_id")
        .in("log_id", logIds);

      const entriesPerLog = new Map<string, number>();
      for (const e of entries ?? []) {
        entriesPerLog.set(e.log_id, (entriesPerLog.get(e.log_id) ?? 0) + 1);
      }

      const byDate = new Map<string, { slots: Set<string>; entries: number }>();
      for (const log of logs) {
        if (!byDate.has(log.date)) {
          byDate.set(log.date, { slots: new Set(), entries: 0 });
        }
        const day = byDate.get(log.date)!;
        day.slots.add(log.slot);
        day.entries += entriesPerLog.get(log.id) ?? 0;
      }

      return [...byDate.entries()].map(([date, v]) => ({
        date,
        slotCount: v.slots.size,
        totalEntries: v.entries,
      }));
    },
  });
}

// 주간 일별 영양 집계
export function useWeeklyNutrition(
  recipientId: string | null,
  weekStart: string   // YYYY-MM-DD (월요일 기준)
) {
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return todayKey(d);
  });

  return useQuery({
    queryKey: ["weekly-nutrition", recipientId, weekStart],
    enabled: !!recipientId,
    staleTime: 120_000,
    queryFn: async (): Promise<DailyNutrition[]> => {
      const from = weekDates[0];
      const to = weekDates[6];

      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, date")
        .eq("recipient_id", recipientId!)
        .gte("date", from)
        .lte("date", to);

      const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

      const empty: DailyNutrition[] = weekDates.map((date) => ({
        date,
        label: dayLabels[new Date(date + "T00:00:00").getDay()],
        calories: 0,
        carbs_g: 0,
        protein_g: 0,
        fat_g: 0,
      }));

      if (!logs || logs.length === 0) return empty;

      const logIds = logs.map((l) => l.id);
      const dateByLogId = Object.fromEntries(logs.map((l) => [l.id, l.date]));

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select(
          "log_id, quantity, food_items(calories_per_unit, carbs_g, protein_g, fat_g)"
        )
        .in("log_id", logIds);

      if (!entries) return empty;

      const totals = new Map<string, Omit<DailyNutrition, "date" | "label">>();
      for (const date of weekDates) {
        totals.set(date, { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 });
      }

      for (const e of entries) {
        const date = dateByLogId[e.log_id];
        if (!date) continue;
        const fi = e.food_items as {
          calories_per_unit: number | null;
          carbs_g: number | null;
          protein_g: number | null;
          fat_g: number | null;
        } | null;
        if (!fi) continue;
        const t = totals.get(date)!;
        const q = e.quantity;
        t.calories += (fi.calories_per_unit ?? 0) * q;
        t.carbs_g += (fi.carbs_g ?? 0) * q;
        t.protein_g += (fi.protein_g ?? 0) * q;
        t.fat_g += (fi.fat_g ?? 0) * q;
      }

      return empty.map((day) => ({ ...day, ...totals.get(day.date) }));
    },
  });
}

// 주간/월간 Top 5 음식
export function useTopFoods(
  recipientId: string | null,
  from: string,
  to: string
) {
  return useQuery({
    queryKey: ["top-foods", recipientId, from, to],
    enabled: !!recipientId,
    staleTime: 120_000,
    queryFn: async (): Promise<TopFood[]> => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id")
        .eq("recipient_id", recipientId!)
        .gte("date", from)
        .lte("date", to);

      if (!logs || logs.length === 0) return [];

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select("food_id, food_name, emoji")
        .in("log_id", logs.map((l) => l.id))
        .not("food_id", "is", null);

      if (!entries) return [];

      const counts = new Map<
        string,
        { food_name: string; emoji: string; count: number }
      >();
      for (const e of entries) {
        if (!e.food_id) continue;
        const prev = counts.get(e.food_id);
        if (prev) {
          prev.count++;
        } else {
          counts.set(e.food_id, {
            food_name: e.food_name,
            emoji: e.emoji,
            count: 1,
          });
        }
      }

      return [...counts.entries()]
        .map(([food_id, v]) => ({ food_id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });
}

// CSV 생성 및 다운로드
export async function downloadCsv(
  recipientId: string,
  recipientName: string,
  from: string,
  to: string
) {
  const { data: logs } = await supabase
    .from("meal_logs")
    .select("id, date, slot")
    .eq("recipient_id", recipientId)
    .gte("date", from)
    .lte("date", to)
    .order("date");

  if (!logs || logs.length === 0) return false;

  const logIds = logs.map((l) => l.id);
  const metaByLogId = Object.fromEntries(
    logs.map((l) => [l.id, { date: l.date, slot: l.slot }])
  );

  const { data: entries } = await supabase
    .from("meal_log_entries")
    .select(
      "log_id, food_name, emoji, quantity, unit, logged_at, food_items(calories_per_unit, carbs_g, protein_g, fat_g)"
    )
    .in("log_id", logIds)
    .order("logged_at");

  if (!entries) return false;

  const SLOT_LABELS: Record<string, string> = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
    snack: "간식",
  };

  const header =
    "날짜,식사시간,음식명,수량,단위,칼로리(kcal),탄수화물(g),단백질(g),지방(g)";
  const rows = entries.map((e) => {
    const meta = metaByLogId[e.log_id];
    const fi = e.food_items as {
      calories_per_unit: number | null;
      carbs_g: number | null;
      protein_g: number | null;
      fat_g: number | null;
    } | null;
    const kcal = fi ? Math.round((fi.calories_per_unit ?? 0) * e.quantity) : "";
    const carbs = fi ? Math.round((fi.carbs_g ?? 0) * e.quantity * 10) / 10 : "";
    const prot = fi ? Math.round((fi.protein_g ?? 0) * e.quantity * 10) / 10 : "";
    const fat = fi ? Math.round((fi.fat_g ?? 0) * e.quantity * 10) / 10 : "";
    return [
      meta?.date ?? "",
      SLOT_LABELS[meta?.slot ?? ""] ?? "",
      e.food_name,
      e.quantity,
      e.unit,
      kcal,
      carbs,
      prot,
      fat,
    ].join(",");
  });

  const bom = "﻿";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `식단기록_${recipientName}_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

// 이번 주 월요일 구하기
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=일
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return todayKey(d);
}

export { DAILY_TARGETS };
