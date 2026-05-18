import { supabase } from "@/lib/supabase";
import { MEAL_SLOTS } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SlotEntry = {
  emoji: string;
  food_name: string;
  quantity: number;
  unit: string;
};

type DayMeal = {
  date: string;
  slot: string;
  note: string | null;
  entries: SlotEntry[];
};

type ShareData = {
  recipient_name: string;
  meals: DayMeal[];
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const { data, error } = await supabase.rpc("get_share_view", { p_token: params.token });

  const errData = data as { error?: string } | null;
  if (error || !data || errData?.error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-extrabold">링크를 찾을 수 없어요</h1>
        <p className="text-muted-foreground">만료되었거나 올바르지 않은 공유 링크예요.</p>
      </div>
    );
  }

  const shareData = data as ShareData;
  const meals = shareData.meals ?? [];

  const grouped: Record<string, DayMeal[]> = {};
  for (const meal of meals) {
    if (!grouped[meal.date]) grouped[meal.date] = [];
    grouped[meal.date].push(meal);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-4 pb-12">
      <header className="pt-6 text-center">
        <div className="text-4xl">🍽️</div>
        <h1 className="mt-2 text-2xl font-extrabold">{shareData.recipient_name}님의 식단</h1>
        <p className="text-sm text-muted-foreground">최근 14일 식사 기록</p>
      </header>

      {Object.keys(grouped).length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">기록된 식사가 없어요</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayMeals]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground">
                {new Date(date).toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </h2>
              {dayMeals.map((meal) => {
                const slotMeta = MEAL_SLOTS.find((s) => s.id === meal.slot);
                return (
                  <div key={meal.slot} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {slotMeta?.emoji ?? "🍽️"}
                      </span>
                      <span className="font-bold">{slotMeta?.label ?? meal.slot}</span>
                    </div>
                    {meal.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">기록 없음</p>
                    ) : (
                      <ul className="space-y-1">
                        {meal.entries.map((e, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span aria-hidden>{e.emoji}</span>
                            <span className="flex-1">{e.food_name}</span>
                            <span className="text-muted-foreground">
                              {e.quantity}
                              {e.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {meal.note && (
                      <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                        📝 {meal.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          ))
      )}

      <footer className="pt-4 text-center text-xs text-muted-foreground">
        오늘의 식판으로 기록된 식단입니다
      </footer>
    </div>
  );
}
