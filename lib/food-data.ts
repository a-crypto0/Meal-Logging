// Seed food catalog. Step 5에서 OpenAI/DB로 확장.
export type FoodCategory =
  | "rice"
  | "soup"
  | "side"
  | "protein"
  | "fruit"
  | "snack"
  | "drink";

export type Nutrition = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
};

export type Food = {
  id: string;
  name: string;
  emoji: string;
  category: FoodCategory;
  nutrition: Nutrition; // per 1 standard unit/serving
};

export const FOOD_CATALOG: Food[] = [
  // rice (per 공기 ≈ 200g)
  { id: "rice-white",  name: "흰쌀밥",   emoji: "🍚", category: "rice",    nutrition: { kcal: 312, carbs: 74, protein: 3,    fat: 0.5, fiber: 0.4 } },
  { id: "rice-mixed",  name: "잡곡밥",   emoji: "🍚", category: "rice",    nutrition: { kcal: 308, carbs: 70, protein: 4,    fat: 1,   fiber: 2   } },
  { id: "curry-rice",  name: "카레라이스", emoji: "🍛", category: "rice",    nutrition: { kcal: 325, carbs: 65, protein: 5,    fat: 5,   fiber: 1.5 } },
  { id: "kimbap",      name: "김밥",     emoji: "🍙", category: "rice",    nutrition: { kcal: 319, carbs: 55, protein: 8,    fat: 7,   fiber: 1.5 } },
  // soup (per 그릇 ≈ 300ml)
  { id: "ramen",       name: "라면",     emoji: "🍜", category: "soup",    nutrition: { kcal: 418, carbs: 62, protein: 10,   fat: 14,  fiber: 1   } },
  { id: "miso-soup",   name: "된장국",   emoji: "🥣", category: "soup",    nutrition: { kcal: 53,  carbs: 5,  protein: 4,    fat: 2,   fiber: 1.5 } },
  { id: "kimchi-stew", name: "김치찌개", emoji: "🍲", category: "soup",    nutrition: { kcal: 117, carbs: 10, protein: 8,    fat: 5,   fiber: 2   } },
  // protein (per 인분)
  { id: "egg-roll",    name: "계란말이", emoji: "🍳", category: "protein", nutrition: { kcal: 146, carbs: 2,  protein: 12,   fat: 10,  fiber: 0   } },
  { id: "egg-steam",   name: "계란찜",   emoji: "🥚", category: "protein", nutrition: { kcal: 132, carbs: 2,  protein: 13,   fat: 8,   fiber: 0   } },
  { id: "tofu-pan",    name: "두부부침", emoji: "🍱", category: "protein", nutrition: { kcal: 136, carbs: 5,  protein: 11,   fat: 8,   fiber: 0.5 } },
  { id: "chicken",     name: "닭가슴살", emoji: "🍗", category: "protein", nutrition: { kcal: 160, carbs: 0,  protein: 31,   fat: 4,   fiber: 0   } },
  { id: "fish-grill",  name: "고등어구이", emoji: "🐟", category: "protein", nutrition: { kcal: 230, carbs: 0,  protein: 26,   fat: 14,  fiber: 0   } },
  // side (per 접시)
  { id: "kimchi",      name: "김치",     emoji: "🥬", category: "side",    nutrition: { kcal: 37,  carbs: 6,  protein: 2,    fat: 0.5, fiber: 2.5 } },
  { id: "spinach",     name: "시금치나물", emoji: "🥬", category: "side",    nutrition: { kcal: 25,  carbs: 3,  protein: 2,    fat: 0.5, fiber: 2   } },
  { id: "salad",       name: "샐러드",   emoji: "🥗", category: "side",    nutrition: { kcal: 35,  carbs: 5,  protein: 1.5,  fat: 1,   fiber: 2   } },
  // fruit (per 개)
  { id: "apple",       name: "사과",     emoji: "🍎", category: "fruit",   nutrition: { kcal: 89,  carbs: 21, protein: 0.5,  fat: 0.3, fiber: 2.5 } },
  { id: "banana",      name: "바나나",   emoji: "🍌", category: "fruit",   nutrition: { kcal: 97,  carbs: 23, protein: 1,    fat: 0.3, fiber: 2.5 } },
  { id: "orange",      name: "오렌지",   emoji: "🍊", category: "fruit",   nutrition: { kcal: 66,  carbs: 15, protein: 1,    fat: 0.2, fiber: 2   } },
  // snack/drink (per 개/컵)
  { id: "yogurt",      name: "요거트",   emoji: "🥛", category: "snack",   nutrition: { kcal: 95,  carbs: 11, protein: 5,    fat: 3.5, fiber: 0   } },
  { id: "milk",        name: "우유",     emoji: "🥛", category: "drink",   nutrition: { kcal: 148, carbs: 12, protein: 8,    fat: 8,   fiber: 0   } },
  { id: "bread",       name: "식빵",     emoji: "🍞", category: "snack",   nutrition: { kcal: 110, carbs: 20, protein: 3,    fat: 2,   fiber: 1   } },
  { id: "cookie",      name: "쿠키",     emoji: "🍪", category: "snack",   nutrition: { kcal: 176, carbs: 24, protein: 2,    fat: 8,   fiber: 0.5 } },
];

const UNITS_BY_CATEGORY: Record<FoodCategory, { unit: string; step: number }> = {
  rice:    { unit: "공기", step: 0.5 },
  soup:    { unit: "그릇", step: 0.5 },
  side:    { unit: "접시", step: 0.5 },
  protein: { unit: "인분", step: 0.5 },
  fruit:   { unit: "개",   step: 1   },
  snack:   { unit: "개",   step: 1   },
  drink:   { unit: "컵",   step: 0.5 },
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
