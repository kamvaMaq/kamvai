import { normalizeDatabaseTimestamp } from "./db";

export const contributionKinds = ["blog", "email", "code", "image"] as const;
export type ContributionKind = (typeof contributionKinds)[number];
export type ContributionRecord = { kind: ContributionKind; createdAt: Date | string | null };
export const DEFAULT_WEEKLY_GENERATION_GOAL = 5;

export function calculateWeeklyGoalProgress(weekTotal: number, weeklyGoal = DEFAULT_WEEKLY_GENERATION_GOAL) {
  const goal = Math.max(1, Math.min(100, Math.round(weeklyGoal)));
  return { goal, completed: weekTotal, percent: Math.min(100, Math.round((weekTotal / goal) * 100)), reached: weekTotal >= goal };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function keyForDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcWeek(date: Date) {
  const start = startOfUtcDay(date);
  const offset = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

export function contributionAnalyticsStart(now = new Date()) {
  const weekStart = startOfUtcWeek(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return weekStart < monthStart ? weekStart : monthStart;
}

export function summarizeContributionAnalytics(records: ContributionRecord[], now = new Date(), weeklyGoal = DEFAULT_WEEKLY_GENERATION_GOAL) {
  const weekStart = startOfUtcWeek(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const trendStart = new Date(weekStart);
  const byDay = new Map<string, number>();
  const byKind = new Map<ContributionKind, number>(contributionKinds.map(kind => [kind, 0]));
  const validRecords = records.flatMap(record => {
    const createdAt = normalizeDatabaseTimestamp(record.createdAt);
    return createdAt ? [{ ...record, createdAt }] : [];
  });

  validRecords.forEach(record => {
    if (record.createdAt >= weekStart) byDay.set(keyForDate(record.createdAt), (byDay.get(keyForDate(record.createdAt)) ?? 0) + 1);
    if (record.createdAt >= monthStart) byKind.set(record.kind, (byKind.get(record.kind) ?? 0) + 1);
  });

  const weekTotal = validRecords.filter(record => record.createdAt >= weekStart).length;
  const monthlyRecords = validRecords.filter(record => record.createdAt >= monthStart);
  const monthTotal = monthlyRecords.length;
  const activeDaysMonth = new Set(monthlyRecords.map(record => keyForDate(record.createdAt))).size;
  const weekTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(trendStart.getUTCDate() + index);
    return {
      key: keyForDate(date),
      label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date),
      count: byDay.get(keyForDate(date)) ?? 0,
    };
  });
  const contentMix = contributionKinds.map(kind => ({ kind, count: byKind.get(kind) ?? 0 }));
  const mostUsed = contentMix.reduce((best, item) => item.count > best.count ? item : best, contentMix[0]);
  const goalProgress = calculateWeeklyGoalProgress(weekTotal, weeklyGoal);

  return {
    weekTotal,
    monthTotal,
    activeDaysMonth,
    weekTrend,
    contentMix,
    mostUsedKind: mostUsed?.count ? mostUsed.kind : null,
    weeklyGoal: goalProgress.goal,
    goalProgress,
    generatedSince: monthStart,
  };
}
