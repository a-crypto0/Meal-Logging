"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TopFood } from "./use-history";

export type MonthlyReportDay = {
  date: string;
  mealCount: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  slots: string[];
  topFoods: string[];
};

export type MonthlyReportData = {
  recipientName: string;
  year: number;
  month: number;
  days: MonthlyReportDay[];
  topFoods: TopFood[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysWithRecord: number;
};

export function useMonthlyReport(
  recipientId: string | null,
  recipientName: string,
  year: number,
  month: number
) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return useQuery({
    queryKey: ["monthly-report", recipientId, year, month],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async (): Promise<MonthlyReportData> => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, date, slot")
        .eq("recipient_id", recipientId!)
        .gte("date", from)
        .lte("date", to);

      if (!logs || logs.length === 0) {
        return {
          recipientName,
          year,
          month,
          days: [],
          topFoods: [],
          avgCalories: 0,
          avgProtein: 0,
          avgCarbs: 0,
          avgFat: 0,
          daysWithRecord: 0,
        };
      }

      const logIds = logs.map((l) => l.id);

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select("log_id, food_id, food_name, emoji, quantity, food_items(calories_per_unit, protein_g, carbs_g, fat_g, fiber_g)")
        .in("log_id", logIds);

      // Build per-day nutrition
      const logById = new Map(logs.map((l) => [l.id, l]));
      const byDate = new Map<
        string,
        {
          slots: Set<string>;
          foods: string[];
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          count: number;
        }
      >();

      const foodFreq = new Map<string, { food_id: string; food_name: string; emoji: string; count: number }>();

      for (const e of entries ?? []) {
        const log = logById.get(e.log_id);
        if (!log) continue;

        if (!byDate.has(log.date)) {
          byDate.set(log.date, {
            slots: new Set(),
            foods: [],
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
            count: 0,
          });
        }
        const day = byDate.get(log.date)!;
        day.slots.add(log.slot);
        day.foods.push(`${e.emoji} ${e.food_name}`);
        day.count++;

        const fi = e.food_items as {
          calories_per_unit: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
        } | null;

        if (fi) {
          day.calories += (fi.calories_per_unit ?? 0) * e.quantity;
          day.protein_g += (fi.protein_g ?? 0) * e.quantity;
          day.carbs_g += (fi.carbs_g ?? 0) * e.quantity;
          day.fat_g += (fi.fat_g ?? 0) * e.quantity;
          day.fiber_g += (fi.fiber_g ?? 0) * e.quantity;
        }

        if (e.food_id) {
          const prev = foodFreq.get(e.food_id);
          if (prev) prev.count++;
          else foodFreq.set(e.food_id, { food_id: e.food_id, food_name: e.food_name, emoji: e.emoji, count: 1 });
        }
      }

      const days: MonthlyReportDay[] = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          date,
          mealCount: d.count,
          calories: d.calories,
          protein_g: d.protein_g,
          carbs_g: d.carbs_g,
          fat_g: d.fat_g,
          fiber_g: d.fiber_g,
          slots: [...d.slots],
          topFoods: [...new Set(d.foods)].slice(0, 5),
        }));

      const topFoods: TopFood[] = [...foodFreq.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((f) => ({ food_id: f.food_id, food_name: f.food_name, emoji: f.emoji, count: f.count }));

      const daysWithRecord = days.length;
      const avgCalories = daysWithRecord > 0 ? days.reduce((s, d) => s + d.calories, 0) / daysWithRecord : 0;
      const avgProtein = daysWithRecord > 0 ? days.reduce((s, d) => s + d.protein_g, 0) / daysWithRecord : 0;
      const avgCarbs = daysWithRecord > 0 ? days.reduce((s, d) => s + d.carbs_g, 0) / daysWithRecord : 0;
      const avgFat = daysWithRecord > 0 ? days.reduce((s, d) => s + d.fat_g, 0) / daysWithRecord : 0;

      return { recipientName, year, month, days, topFoods, avgCalories, avgProtein, avgCarbs, avgFat, daysWithRecord };
    },
  });
}
