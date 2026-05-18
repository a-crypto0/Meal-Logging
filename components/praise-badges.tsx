"use client";

const CATEGORY_META: Record<string, string> = {
  rice: "🍚 주식",
  soup: "🥣 국/찌개",
  side: "🥬 반찬",
  protein: "🍗 단백질",
  fruit: "🍎 과일",
  snack: "🍪 간식",
  drink: "🥛 음료",
};

const BADGES = [
  {
    id: "all-groups",
    emoji: "🏆",
    label: "오늘의 식판 완성",
    desc: "4가지 이상 식품군 섭취",
    minCategories: 4,
  },
  {
    id: "balanced",
    emoji: "⭐",
    label: "균형 잡힌 식사",
    desc: "3가지 식품군 섭취",
    minCategories: 3,
  },
  {
    id: "protein-hero",
    emoji: "💪",
    label: "단백질 챔피언",
    desc: "단백질 식품군 포함",
    minCategories: 1,
    requiredCategory: "protein",
  },
  {
    id: "veggie",
    emoji: "🥦",
    label: "채소 먹기",
    desc: "채소/반찬 포함",
    minCategories: 1,
    requiredCategory: "side",
  },
] as const;

export function PraiseBadges({ categories }: { categories: string[] }) {
  const catSet = new Set(categories);

  const earned = BADGES.filter((b) => {
    const req = "requiredCategory" in b ? b.requiredCategory : undefined;
    if (req && !catSet.has(req)) return false;
    if (!req && catSet.size < b.minCategories) return false;
    return true;
  });

  if (earned.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-muted-foreground">오늘의 배지</p>
      <div className="flex flex-wrap gap-2">
        {earned.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/10 px-3 py-2"
          >
            <span className="text-xl" aria-hidden>
              {b.emoji}
            </span>
            <div>
              <p className="text-xs font-extrabold leading-tight">{b.label}</p>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {[...catSet].map((cat) => (
          <span
            key={cat}
            className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
          >
            {CATEGORY_META[cat] ?? cat}
          </span>
        ))}
      </div>
    </div>
  );
}
