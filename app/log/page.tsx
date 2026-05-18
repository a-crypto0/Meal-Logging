import { Suspense } from "react";

import { MealLogger } from "@/components/meal-logger";

export default function LogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">불러오는 중…</div>}>
      <MealLogger />
    </Suspense>
  );
}
