import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MealSummary } from "@/components/meal-summary";
import { MEAL_SLOTS } from "@/lib/utils";

export default function HomePage() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-6 px-4 pb-6 pt-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">오늘의 식판</h1>
        <p className="text-base text-muted-foreground">
          오늘 무엇을 드셨나요? 가볍게 기록해 보세요.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-5">
          {MEAL_SLOTS.map((slot) => (
            <Link
              key={slot.id}
              href={`/log?slot=${slot.id}`}
              className="flex items-center gap-4 rounded-2xl border-2 border-border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                aria-hidden
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-${slot.color}/15 text-3xl`}
              >
                {slot.emoji}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{slot.label}</p>
                <MealSummary slotId={slot.id} />
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Button asChild size="xl" className="w-full">
        <Link href="/log">
          <UtensilsCrossed className="h-6 w-6" aria-hidden />
          식사 기록하기
        </Link>
      </Button>
    </div>
  );
}
