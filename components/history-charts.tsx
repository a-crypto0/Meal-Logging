"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { DailyNutrition, TopFood } from "@/lib/hooks/use-history";
import { DAILY_TARGETS } from "@/lib/hooks/use-nutrition";

// 주간 칼로리 바 차트
export function WeeklyCaloriesChart({ data }: { data: DailyNutrition[] }) {
  if (data.every((d) => d.calories === 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        이번 주 기록이 없어요
      </p>
    );
  }

  const target = DAILY_TARGETS.calories;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickCount={4}
        />
        <Tooltip
          formatter={(value) => [`${Math.round(Number(value))} kcal`, "칼로리"]}
          labelFormatter={(label) => `${label}요일`}
          contentStyle={{
            borderRadius: "0.75rem",
            fontSize: "0.8rem",
            border: "2px solid hsl(var(--border))",
          }}
        />
        <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => {
            const pct = entry.calories / target;
            const color =
              pct === 0
                ? "hsl(var(--muted))"
                : pct >= 0.7 && pct <= 1.2
                  ? "hsl(142 71% 45%)"
                  : pct >= 0.4 && pct <= 1.5
                    ? "hsl(38 92% 50%)"
                    : "hsl(0 84% 60%)";
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 주간 탄단지 적층 바 차트
export function WeeklyMacroChart({ data }: { data: DailyNutrition[] }) {
  if (data.every((d) => d.carbs_g === 0)) return null;

  // kcal로 환산
  const chartData = data.map((d) => ({
    label: d.label,
    탄수화물: Math.round(d.carbs_g * 4),
    단백질: Math.round(d.protein_g * 4),
    지방: Math.round(d.fat_g * 9),
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickCount={3} />
        <Tooltip
          formatter={(value, name) => [`${value} kcal`, String(name)]}
          contentStyle={{
            borderRadius: "0.75rem",
            fontSize: "0.8rem",
            border: "2px solid hsl(var(--border))",
          }}
        />
        <Bar dataKey="탄수화물" stackId="a" fill="hsl(38 90% 55%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="단백질" stackId="a" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="지방" stackId="a" fill="hsl(210 80% 60%)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Top 5 음식 수평 바
export function TopFoodsChart({ foods }: { foods: TopFood[] }) {
  if (foods.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        기록이 없어요
      </p>
    );
  }

  const max = foods[0].count;

  return (
    <ul className="space-y-2.5">
      {foods.map((f, i) => {
        const pct = (f.count / max) * 100;
        const colors = [
          "bg-primary",
          "bg-signal-good",
          "bg-amber-400",
          "bg-blue-400",
          "bg-purple-400",
        ];
        return (
          <li key={f.food_id} className="flex items-center gap-2">
            <span className="w-5 text-center text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-lg" aria-hidden>
              {f.emoji}
            </span>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">{f.food_name}</span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {f.count}회
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", colors[i])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
