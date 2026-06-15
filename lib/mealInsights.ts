// lib/mealInsights.ts
//
// 식사 데이터 기반 "돌봄 신호" 추출 — 순수 알고리즘(AI 미사용).
// 동일 입력 → 동일 출력(결정론적)이라 '기록 신뢰성'을 보장하며 테스트가 쉽다.
// 모든 함수는 부수효과가 없고, 시각 의존부는 `now` 주입으로 통제한다.
//
// 입력 모델은 Supabase `meal_records` 한 행에 대응한다(카멜케이스 도메인 타입).

import {
  FOOD_CATALOG,
  findFood,
  type FoodCategory,
} from "@/lib/food-data";

/* ============================== 도메인 타입 ============================== */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type IntakeStatus = "all_eaten" | "partial" | "refused" | "skipped";

/** `meal_records.foods` 배열의 한 원소. {name, quantity, unit} + 선택적 참조 */
export type LoggedFood = {
  name: string;
  quantity?: number;
  unit?: string;
  /** FOOD_CATALOG 참조 id (있으면 카테고리 자동 해석) */
  foodId?: string;
  /** 명시 카테고리 (있으면 최우선) */
  category?: FoodCategory;
};

/** Supabase `meal_records` 한 행에 대응하는 도메인 모델 */
export type MealRecord = {
  id?: string;
  recipientId?: string;
  date: string; // "YYYY-MM-DD"
  mealType: MealType;
  foods: LoggedFood[];
  intakeStatus: IntakeStatus;
  responseTags?: string[];
  fluidMl?: number | null;
  memo?: string | null;
};

/* =============================== 신호 타입 =============================== */

export type SignalSeverity = "info" | "warn" | "alert";

export type SignalKind =
  | "repeated_food"
  | "low_diversity"
  | "category_skew"
  | "low_fluid"
  | "high_refusal"
  | "high_snack";

/** UI에서 바로 렌더할 수 있는 돌봄 신호(배너/카드) */
export type CareSignal = {
  id: string;
  kind: SignalKind;
  severity: SignalSeverity;
  title: string;
  detail: string;
  data?: Record<string, unknown>;
};

/* ============================== 카테고리 메타 ============================== */

export const ALL_CATEGORIES: FoodCategory[] = [
  "rice", "soup", "side", "protein", "fruit", "snack", "drink",
];

/** 한글 식품군 라벨(메시지·대안 제안용) */
export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  rice: "곡류·주식",
  soup: "국·탕",
  side: "채소·나물",
  protein: "단백질",
  fruit: "과일",
  snack: "간식",
  drink: "음료",
};

/** 균형식 핵심 식품군 — 이 군들이 고루 나와야 다양성 양호 */
export const DEFAULT_CORE_CATEGORIES: FoodCategory[] = ["rice", "protein", "side", "fruit"];

/* ============================== 날짜 유틸 ============================== */

function parseISODate(iso: string): number {
  const parts = iso.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
}

function startOfDayUTC(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** record.date 가 기준일(now)로부터 며칠 전인지. 0=오늘, 양수=과거, 음수=미래 */
export function daysAgo(iso: string, now: Date = new Date()): number {
  return Math.floor((startOfDayUTC(now) - parseISODate(iso)) / 86_400_000);
}

/** 최근 windowDays 일(오늘 포함, 미래일 제외) 이내 레코드만 반환 */
export function withinWindow<T extends { date: string }>(
  records: T[],
  windowDays: number,
  now: Date = new Date(),
): T[] {
  return records.filter((r) => {
    const diff = daysAgo(r.date, now);
    return diff >= 0 && diff < windowDays;
  });
}

/* ============================ 카테고리 해석 ============================ */

/** LoggedFood → FoodCategory. category > foodId 조회 > 이름 매칭 순으로 해석 */
export function resolveCategory(food: LoggedFood): FoodCategory | null {
  if (food.category) return food.category;
  if (food.foodId) {
    const f = findFood(food.foodId);
    if (f) return f.category;
  }
  const byName = FOOD_CATALOG.find((f) => f.name === food.name.trim());
  return byName ? byName.category : null;
}

/** 반복 집계용 음식 식별키. foodId 우선, 없으면 정규화된 이름 */
function foodKey(food: LoggedFood): string {
  return food.foodId ?? food.name.trim().toLowerCase();
}

/* ============================ 1) 반복 음식 감지 ============================ */

export type RepeatDetectionOptions = {
  /** 관찰 창(일). 기본 7 */
  windowDays?: number;
  /** 반복으로 간주할 최소 횟수. 기본 3 */
  threshold?: number;
  now?: Date;
};

export type RepeatedFood = {
  key: string;
  name: string;
  foodId?: string;
  category: FoodCategory | null;
  count: number;
  windowDays: number;
  occurrences: { date: string; mealType: MealType }[];
};

/**
 * 최근 windowDays 일 이내 동일 음식을 threshold 회 이상 제공했는지 감지.
 * 한 끼니(레코드) 안의 동일 음식은 1회로 dedupe 하여 과대계상을 막는다.
 */
export function detectRepeatedFoods(
  records: MealRecord[],
  options: RepeatDetectionOptions = {},
): RepeatedFood[] {
  const windowDays = options.windowDays ?? 7;
  const threshold = options.threshold ?? 3;
  const now = options.now ?? new Date();

  const scoped = withinWindow(records, windowDays, now);
  const map = new Map<string, RepeatedFood>();

  for (const rec of scoped) {
    const seenInRecord = new Set<string>();
    for (const food of rec.foods ?? []) {
      const key = foodKey(food);
      if (seenInRecord.has(key)) continue;
      seenInRecord.add(key);

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.occurrences.push({ date: rec.date, mealType: rec.mealType });
      } else {
        map.set(key, {
          key,
          name: food.name.trim(),
          foodId: food.foodId,
          category: resolveCategory(food),
          count: 1,
          windowDays,
          occurrences: [{ date: rec.date, mealType: rec.mealType }],
        });
      }
    }
  }

  return [...map.values()]
    .filter((f) => f.count >= threshold)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ============================ 2) 다양성 분석 ============================ */

export type DiversityOptions = {
  /** 관찰 창(일). 기본 7 */
  windowDays?: number;
  now?: Date;
  /** 특정 군 점유율이 이 값 초과면 '치우침'. 기본 0.5 */
  dominantShareThreshold?: number;
  /** 핵심 군 점유율이 이 값 미만이면 '부족'. 기본 0.12 */
  lowShareThreshold?: number;
  /** 정규화 다양성 점수가 이 값 미만이면 '다양성 부족'. 기본 0.5 */
  lowDiversityScore?: number;
  /** 균형 평가 대상 핵심 군. 기본 [rice, protein, side, fruit] */
  coreCategories?: FoodCategory[];
};

export type DiversityReport = {
  windowDays: number;
  totalFoods: number;
  categoryCounts: Record<FoodCategory, number>;
  categoryShares: Record<FoodCategory, number>;
  distinctCategories: number;
  /** 0(한 군 집중) ~ 1(고른 분포). 정규화 Shannon 지수 */
  diversityScore: number;
  dominantCategory: { category: FoodCategory; share: number } | null;
  lackingCategories: FoodCategory[];
  isLowDiversity: boolean;
};

function zeroCategoryRecord(): Record<FoodCategory, number> {
  return { rice: 0, soup: 0, side: 0, protein: 0, fruit: 0, snack: 0, drink: 0 };
}

/** 정규화 Shannon 다양성 지수 (0~1). counts.length 군 기준 */
function normalizedShannon(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  const maxH = Math.log(counts.length);
  return maxH === 0 ? 0 : h / maxH;
}

/**
 * 최근 windowDays 일 식단의 카테고리 분포를 집계하고, 특정 군 치우침과
 * 핵심 군 부족(예: 채소·과일 부족)을 판정한다.
 */
export function analyzeDiversity(
  records: MealRecord[],
  options: DiversityOptions = {},
): DiversityReport {
  const windowDays = options.windowDays ?? 7;
  const now = options.now ?? new Date();
  const dominantShareThreshold = options.dominantShareThreshold ?? 0.5;
  const lowShareThreshold = options.lowShareThreshold ?? 0.12;
  const lowDiversityScore = options.lowDiversityScore ?? 0.5;
  const core = options.coreCategories ?? DEFAULT_CORE_CATEGORIES;

  const scoped = withinWindow(records, windowDays, now);
  const counts = zeroCategoryRecord();
  let totalFoods = 0;

  for (const rec of scoped) {
    for (const food of rec.foods ?? []) {
      const cat = resolveCategory(food);
      if (!cat) continue;
      counts[cat] += 1;
      totalFoods += 1;
    }
  }

  const shares = zeroCategoryRecord();
  for (const cat of ALL_CATEGORIES) {
    shares[cat] = totalFoods > 0 ? counts[cat] / totalFoods : 0;
  }

  const distinctCategories = ALL_CATEGORIES.filter((c) => counts[c] > 0).length;
  const diversityScore = normalizedShannon(ALL_CATEGORIES.map((c) => counts[c]));

  let dominantCategory: { category: FoodCategory; share: number } | null = null;
  for (const cat of ALL_CATEGORIES) {
    if (shares[cat] > dominantShareThreshold) {
      if (!dominantCategory || shares[cat] > dominantCategory.share) {
        dominantCategory = { category: cat, share: shares[cat] };
      }
    }
  }

  const lackingCategories = core.filter((c) => shares[c] < lowShareThreshold);

  const isLowDiversity =
    totalFoods > 0 &&
    (diversityScore < lowDiversityScore ||
      dominantCategory !== null ||
      lackingCategories.length > 0);

  return {
    windowDays,
    totalFoods,
    categoryCounts: counts,
    categoryShares: shares,
    distinctCategories,
    diversityScore,
    dominantCategory,
    lackingCategories,
    isLowDiversity,
  };
}

/* ============================ 3) 메뉴 대안 제안 ============================ */

export type AlternativeSuggestion = {
  category: FoodCategory;
  label: string;
  reason: string;
  ideas: { foodId: string; name: string; emoji: string }[];
};

/**
 * 부족한 카테고리별로 FOOD_CATALOG에서 대체 음식 아이디어를 반환.
 * 이미 과도하게 반복 중인 음식은 제외해 '진짜 변화'를 유도한다.
 */
export function suggestAlternatives(
  lackingCategories: FoodCategory[],
  options: {
    perCategory?: number;
    excludeFoodIds?: string[];
    excludeNames?: string[];
  } = {},
): AlternativeSuggestion[] {
  const perCategory = options.perCategory ?? 3;
  const excludeIds = new Set(options.excludeFoodIds ?? []);
  const excludeNames = new Set(
    (options.excludeNames ?? []).map((n) => n.trim().toLowerCase()),
  );

  return lackingCategories.map((category) => {
    const ideas = FOOD_CATALOG
      .filter((f) => f.category === category)
      .filter((f) => !excludeIds.has(f.id) && !excludeNames.has(f.name.toLowerCase()))
      .slice(0, perCategory)
      .map((f) => ({ foodId: f.id, name: f.name, emoji: f.emoji }));

    return {
      category,
      label: CATEGORY_LABEL[category],
      reason: `${CATEGORY_LABEL[category]} 섭취가 부족합니다. 아래 메뉴로 다양성을 보완해 보세요.`,
      ideas,
    };
  });
}

/* ============================ 통합 인사이트 ============================ */

export type MealInsightsOptions = {
  now?: Date;
  /** 단기 창(일). 기본 7 */
  shortWindowDays?: number;
  /** 장기 창(일). 기본 28 */
  longWindowDays?: number;
  /** 반복 임계 횟수. 기본 3 */
  repeatThreshold?: number;
  /** 다양성 분석 옵션(창 미지정 시 shortWindowDays 사용) */
  diversity?: DiversityOptions;
};

export type MealInsights = {
  generatedAt: string;
  shortWindowDays: number;
  longWindowDays: number;
  repeatedShort: RepeatedFood[];
  repeatedLong: RepeatedFood[];
  diversity: DiversityReport;
  alternatives: AlternativeSuggestion[];
  signals: CareSignal[];
};

/**
 * 주간(단기)·월간(장기) 반복 음식, 다양성/치우침, 대안 제안을 한 번에 산출하고
 * UI용 돌봄 신호(CareSignal[])로 변환한다.
 */
export function getMealInsights(
  records: MealRecord[],
  options: MealInsightsOptions = {},
): MealInsights {
  const now = options.now ?? new Date();
  const shortWindowDays = options.shortWindowDays ?? 7;
  const longWindowDays = options.longWindowDays ?? 28;
  const repeatThreshold = options.repeatThreshold ?? 3;

  const repeatedShort = detectRepeatedFoods(records, {
    windowDays: shortWindowDays,
    threshold: repeatThreshold,
    now,
  });
  const repeatedLong = detectRepeatedFoods(records, {
    windowDays: longWindowDays,
    threshold: repeatThreshold,
    now,
  });
  const diversity = analyzeDiversity(records, {
    ...options.diversity,
    windowDays: options.diversity?.windowDays ?? shortWindowDays,
    now,
  });

  const alternatives = suggestAlternatives(diversity.lackingCategories, {
    excludeFoodIds: repeatedShort
      .map((r) => r.foodId)
      .filter((x): x is string => !!x),
    excludeNames: repeatedShort.map((r) => r.name),
  });

  const signals: CareSignal[] = [];

  // 반복 음식 — 단기(더 시급)
  for (const f of repeatedShort) {
    signals.push({
      id: `repeated:${f.key}:${shortWindowDays}`,
      kind: "repeated_food",
      severity: f.count >= repeatThreshold + 2 ? "alert" : "warn",
      title: `반복 섭취: ${f.name}`,
      detail: `최근 ${shortWindowDays}일 동안 ${f.name}을(를) ${f.count}회 제공했습니다. 다른 메뉴로 변화를 줄 시점입니다.`,
      data: { foodKey: f.key, count: f.count, windowDays: shortWindowDays, category: f.category },
    });
  }

  // 반복 음식 — 장기(단기에서 이미 잡힌 항목 제외)
  const shortKeys = new Set(repeatedShort.map((r) => r.key));
  for (const f of repeatedLong) {
    if (shortKeys.has(f.key)) continue;
    signals.push({
      id: `repeated:${f.key}:${longWindowDays}`,
      kind: "repeated_food",
      severity: "info",
      title: `반복 패턴: ${f.name}`,
      detail: `최근 ${longWindowDays}일 동안 ${f.name}이(가) ${f.count}회 반복되었습니다.`,
      data: { foodKey: f.key, count: f.count, windowDays: longWindowDays, category: f.category },
    });
  }

  // 식단 치우침
  if (diversity.dominantCategory) {
    const { category, share } = diversity.dominantCategory;
    signals.push({
      id: `skew:${category}`,
      kind: "category_skew",
      severity: "warn",
      title: `식단 치우침: ${CATEGORY_LABEL[category]}`,
      detail: `최근 ${diversity.windowDays}일 식단의 ${Math.round(share * 100)}%가 ${CATEGORY_LABEL[category]}에 집중되어 있습니다.`,
      data: { category, share },
    });
  }

  // 다양성 부족 + 대안 메뉴
  if (diversity.isLowDiversity && diversity.lackingCategories.length > 0) {
    const labels = diversity.lackingCategories.map((c) => CATEGORY_LABEL[c]).join(", ");
    signals.push({
      id: "low_diversity",
      kind: "low_diversity",
      severity: "warn",
      title: `다양성 부족: ${labels}`,
      detail: `${labels} 섭취가 부족합니다. 대체 메뉴를 참고해 균형을 맞춰 보세요.`,
      data: {
        diversityScore: diversity.diversityScore,
        lackingCategories: diversity.lackingCategories,
        alternatives,
      },
    });
  }

  return {
    generatedAt: now.toISOString(),
    shortWindowDays,
    longWindowDays,
    repeatedShort,
    repeatedLong,
    diversity,
    alternatives,
    signals,
  };
}
