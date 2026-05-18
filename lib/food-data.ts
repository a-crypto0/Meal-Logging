// Seed food catalog. Step 5에서 OpenAI/DB로 확장.
export type FoodCategory =
  | "rice"
  | "soup"
  | "side"
  | "protein"
  | "fruit"
  | "snack"
  | "drink";

export type Food = {
  id: string;
  name: string;
  emoji: string;
  category: FoodCategory;
};

export const FOOD_CATALOG: Food[] = [
  { id: "rice-white", name: "흰쌀밥", emoji: "🍚", category: "rice" },
  { id: "rice-mixed", name: "잡곡밥", emoji: "🍚", category: "rice" },
  { id: "curry-rice", name: "카레라이스", emoji: "🍛", category: "rice" },
  { id: "kimbap", name: "김밥", emoji: "🍙", category: "rice" },
  { id: "ramen", name: "라면", emoji: "🍜", category: "soup" },
  { id: "miso-soup", name: "된장국", emoji: "🥣", category: "soup" },
  { id: "kimchi-stew", name: "김치찌개", emoji: "🍲", category: "soup" },
  { id: "egg-roll", name: "계란말이", emoji: "🍳", category: "protein" },
  { id: "egg-steam", name: "계란찜", emoji: "🥚", category: "protein" },
  { id: "tofu-pan", name: "두부부침", emoji: "🍱", category: "protein" },
  { id: "chicken", name: "닭가슴살", emoji: "🍗", category: "protein" },
  { id: "fish-grill", name: "고등어구이", emoji: "🐟", category: "protein" },
  { id: "kimchi", name: "김치", emoji: "🥬", category: "side" },
  { id: "spinach", name: "시금치나물", emoji: "🥬", category: "side" },
  { id: "salad", name: "샐러드", emoji: "🥗", category: "side" },
  { id: "apple", name: "사과", emoji: "🍎", category: "fruit" },
  { id: "banana", name: "바나나", emoji: "🍌", category: "fruit" },
  { id: "orange", name: "오렌지", emoji: "🍊", category: "fruit" },
  { id: "yogurt", name: "요거트", emoji: "🥛", category: "snack" },
  { id: "milk", name: "우유", emoji: "🥛", category: "drink" },
  { id: "bread", name: "식빵", emoji: "🍞", category: "snack" },
  { id: "cookie", name: "쿠키", emoji: "🍪", category: "snack" },
];

const UNITS_BY_CATEGORY: Record<FoodCategory, { unit: string; step: number }> = {
  rice: { unit: "공기", step: 0.5 },
  soup: { unit: "그릇", step: 0.5 },
  side: { unit: "접시", step: 0.5 },
  protein: { unit: "인분", step: 0.5 },
  fruit: { unit: "개", step: 1 },
  snack: { unit: "개", step: 1 },
  drink: { unit: "컵", step: 0.5 },
};

export function unitFor(category: FoodCategory): { unit: string; step: number } {
  return UNITS_BY_CATEGORY[category];
}

export function unitForId(foodId: string): { unit: string; step: number } {
  const f = FOOD_CATALOG.find((x) => x.id === foodId);
  return f ? unitFor(f.category) : { unit: "개", step: 1 };
}

export function searchFoods(query: string, limit = 8): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FOOD_CATALOG.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
}

export function findFood(id: string): Food | undefined {
  return FOOD_CATALOG.find((f) => f.id === id);
}
