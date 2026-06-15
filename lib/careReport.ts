// lib/careReport.ts
//
// 식사 데이터 통계·리포트 집계 — 순수 알고리즘(AI 미사용, 결정론적).
// 복지센터·의료기관 제출이나 지원인력 대시보드에 쓸 객관 지표를 산출한다.
// 도메인 타입은 mealInsights 의 모델을 재사용한다.

import {
  withinWindow,
  type CareSignal,
  type IntakeStatus,
  type MealRecord,
  type MealType,
} from "@/lib/mealInsights";

/* ============================ 1) 섭취 상태 집계 ============================ */

export type IntakeStatusReport = {
  total: number;
  counts: Record<IntakeStatus, number>;
  ratios: Record<IntakeStatus, number>; // 각 0~1
  /** '다 먹음 / 일부 / 거부·건너뜀' 3분류 묶음 */
  grouped: { ateAll: number; partial: number; refusedOrSkipped: number };
  groupedRatios: { ateAll: number; partial: number; refusedOrSkipped: number };
};

function zeroIntakeRecord(): Record<IntakeStatus, number> {
  return { all_eaten: 0, partial: 0, refused: 0, skipped: 0 };
}

/** '다 먹음/일부/거부/건너뜀' 분포와 비율 계산 */
export function aggregateIntakeStatus(records: MealRecord[]): IntakeStatusReport {
  const counts = zeroIntakeRecord();
  for (const r of records) counts[r.intakeStatus] += 1;

  const total = records.length;
  const ratio = (n: number) => (total > 0 ? n / total : 0);

  const ratios: Record<IntakeStatus, number> = {
    all_eaten: ratio(counts.all_eaten),
    partial: ratio(counts.partial),
    refused: ratio(counts.refused),
    skipped: ratio(counts.skipped),
  };

  const grouped = {
    ateAll: counts.all_eaten,
    partial: counts.partial,
    refusedOrSkipped: counts.refused + counts.skipped,
  };
  const groupedRatios = {
    ateAll: ratio(grouped.ateAll),
    partial: ratio(grouped.partial),
    refusedOrSkipped: ratio(grouped.refusedOrSkipped),
  };

  return { total, counts, ratios, grouped, groupedRatios };
}

/* ============================ 2) 수분 섭취량 ============================ */

export type FluidReport = {
  /** 기록이 있는 날(활동일) 수 — 일평균의 분모 */
  daysTracked: number;
  totalMl: number;
  dailyAverageMl: number;
  targetMl: number;
  belowTarget: boolean;
  /** 기준 미달분(ml). 충족 시 0 */
  deficitMl: number;
  perDay: { date: string; ml: number }[];
};

/**
 * 날짜별 수분(ml)을 합산해 일평균을 낸다.
 * 분모는 '기록이 존재하는 날' 수(활동일)이며, 수분 미기록 끼니는 0ml로 본다.
 * 일평균이 targetMl 미만이면 belowTarget 경고 신호를 켠다.
 */
export function averageFluidIntake(
  records: MealRecord[],
  options: { targetMl?: number } = {},
): FluidReport {
  const targetMl = options.targetMl ?? 1000;

  const byDate = new Map<string, number>();
  for (const r of records) {
    const ml = typeof r.fluidMl === "number" && r.fluidMl > 0 ? r.fluidMl : 0;
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + ml);
  }

  const perDay = [...byDate.entries()]
    .map(([date, ml]) => ({ date, ml }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const daysTracked = perDay.length;
  const totalMl = perDay.reduce((s, d) => s + d.ml, 0);
  const dailyAverageMl = daysTracked > 0 ? Math.round(totalMl / daysTracked) : 0;
  const belowTarget = daysTracked > 0 && dailyAverageMl < targetMl;
  const deficitMl = belowTarget ? targetMl - dailyAverageMl : 0;

  return { daysTracked, totalMl, dailyAverageMl, targetMl, belowTarget, deficitMl, perDay };
}

/* ============================ 3) 간식 비율 ============================ */

export type SnackRatioReport = {
  totalMeals: number;
  snackCount: number;
  ratio: number; // 0~1
  byType: Record<MealType, number>;
};

function zeroMealTypeRecord(): Record<MealType, number> {
  return { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
}

/** 전체 끼니 중 '간식'이 차지하는 비율(체중 증가 원인 분석용) */
export function snackRatio(records: MealRecord[]): SnackRatioReport {
  const byType = zeroMealTypeRecord();
  for (const r of records) byType[r.mealType] += 1;

  const totalMeals = records.length;
  const snackCount = byType.snack;
  const ratio = totalMeals > 0 ? snackCount / totalMeals : 0;

  return { totalMeals, snackCount, ratio, byType };
}

/* ============================ 4) 상위 반응 태그 ============================ */

export type TagFrequency = {
  tag: string;
  count: number;
  /** 태그가 달린 레코드 대비 출현 비율 0~1 */
  share: number;
};

/**
 * 반응 태그 빈도를 집계해 상위 N개를 반환.
 * 한 레코드 내 중복 태그는 1회로 dedupe 한다.
 */
export function topResponseTags(
  records: MealRecord[],
  options: { topN?: number } = {},
): TagFrequency[] {
  const topN = options.topN ?? 5;

  const counts = new Map<string, number>();
  let recordsWithTags = 0;

  for (const r of records) {
    const tags = r.responseTags ?? [];
    let hasTag = false;
    const seen = new Set<string>();
    for (const raw of tags) {
      const tag = raw.trim();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
      hasTag = true;
    }
    if (hasTag) recordsWithTags += 1;
  }

  const denom = recordsWithTags > 0 ? recordsWithTags : 1;

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count, share: count / denom }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, topN);
}

/* ============================ 통합 리포트 ============================ */

export type CareReportOptions = {
  now?: Date;
  /** 지정 시 최근 N일로 한정. 미지정 시 전체 records 사용 */
  windowDays?: number;
  /** 수분 일일 목표(ml). 기본 1000 */
  targetFluidMl?: number;
  /** 상위 태그 개수. 기본 5 */
  topTags?: number;
  /** 거부·건너뜀 비율 경고 임계. 기본 0.3 */
  refusalAlertRatio?: number;
  /** 간식 비율 경고 임계. 기본 0.35 */
  snackAlertRatio?: number;
};

export type CareReport = {
  generatedAt: string;
  period: { from: string | null; to: string | null; days: number | null; records: number };
  intake: IntakeStatusReport;
  fluid: FluidReport;
  snack: SnackRatioReport;
  topTags: TagFrequency[];
  signals: CareSignal[];
};

/**
 * 섭취 상태·수분·간식 비율·상위 태그를 한 번에 집계하고,
 * 임계 초과 항목을 돌봄 신호(CareSignal[])로 변환한다.
 */
export function buildCareReport(
  records: MealRecord[],
  options: CareReportOptions = {},
): CareReport {
  const now = options.now ?? new Date();
  const targetFluidMl = options.targetFluidMl ?? 1000;
  const topN = options.topTags ?? 5;
  const refusalAlertRatio = options.refusalAlertRatio ?? 0.3;
  const snackAlertRatio = options.snackAlertRatio ?? 0.35;

  const scoped = options.windowDays
    ? withinWindow(records, options.windowDays, now)
    : records;

  const intake = aggregateIntakeStatus(scoped);
  const fluid = averageFluidIntake(scoped, { targetMl: targetFluidMl });
  const snack = snackRatio(scoped);
  const topTags = topResponseTags(scoped, { topN });

  const dates = scoped.map((r) => r.date).sort();
  const from = dates[0] ?? null;
  const to = dates[dates.length - 1] ?? null;

  const signals: CareSignal[] = [];

  // 수분 부족
  if (fluid.belowTarget) {
    signals.push({
      id: "low_fluid",
      kind: "low_fluid",
      severity: fluid.dailyAverageMl < targetFluidMl * 0.6 ? "alert" : "warn",
      title: "수분 섭취 부족",
      detail: `일평균 수분 ${fluid.dailyAverageMl}ml 로 기준치 ${targetFluidMl}ml 보다 ${fluid.deficitMl}ml 부족합니다.`,
      data: { dailyAverageMl: fluid.dailyAverageMl, targetMl: targetFluidMl, deficitMl: fluid.deficitMl },
    });
  }

  // 거부·건너뜀 비율 높음
  if (intake.total > 0 && intake.groupedRatios.refusedOrSkipped >= refusalAlertRatio) {
    const pct = Math.round(intake.groupedRatios.refusedOrSkipped * 100);
    signals.push({
      id: "high_refusal",
      kind: "high_refusal",
      severity: intake.groupedRatios.refusedOrSkipped >= 0.5 ? "alert" : "warn",
      title: "거부·건너뜀 비율 높음",
      detail: `전체 끼니 중 ${pct}%가 거부 또는 건너뜀입니다. 식사 환경·메뉴 점검이 필요합니다.`,
      data: {
        ratio: intake.groupedRatios.refusedOrSkipped,
        count: intake.grouped.refusedOrSkipped,
        total: intake.total,
      },
    });
  }

  // 간식 비중 높음
  if (snack.totalMeals > 0 && snack.ratio >= snackAlertRatio) {
    signals.push({
      id: "high_snack",
      kind: "high_snack",
      severity: "warn",
      title: "간식 비중 높음",
      detail: `전체 끼니 중 간식이 ${Math.round(snack.ratio * 100)}%를 차지합니다. 체중 관리에 유의하세요.`,
      data: { ratio: snack.ratio, snackCount: snack.snackCount, totalMeals: snack.totalMeals },
    });
  }

  return {
    generatedAt: now.toISOString(),
    period: { from, to, days: options.windowDays ?? null, records: scoped.length },
    intake,
    fluid,
    snack,
    topTags,
    signals,
  };
}
