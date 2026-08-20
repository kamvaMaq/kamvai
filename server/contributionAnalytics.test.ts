import { describe, expect, it } from "vitest";
import { calculateWeeklyGoalProgress, calculateWeeklyGoalStreak, contributionAnalyticsStart, summarizeContributionAnalytics } from "./contributionAnalytics";

describe("contribution analytics", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("reports weekly and monthly totals from the user’s real period records", () => {
    const summary = summarizeContributionAnalytics([
      { kind: "code", createdAt: "2026-08-17T09:00:00.000Z" },
      { kind: "code", createdAt: "2026-08-19T09:00:00.000Z" },
      { kind: "image", createdAt: "2026-08-02T09:00:00.000Z" },
      { kind: "blog", createdAt: "2026-07-31T09:00:00.000Z" },
    ], now);
    expect(summary.weekTotal).toBe(2);
    expect(summary.monthTotal).toBe(3);
    expect(summary.activeDaysMonth).toBe(3);
    expect(summary.mostUsedKind).toBe("code");
    expect(summary.weekTrend.find(day => day.key === "2026-08-19")?.count).toBe(1);
  });

  it("returns safe zero values when no generation records exist", () => {
    const summary = summarizeContributionAnalytics([], now);
    expect(summary).toMatchObject({ weekTotal: 0, monthTotal: 0, activeDaysMonth: 0, mostUsedKind: null });
    expect(summary.weekTrend).toHaveLength(7);
  });

  it("includes the overlapping weekly period when a month starts midweek", () => {
    expect(contributionAnalyticsStart(new Date("2026-08-02T12:00:00.000Z")).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("bounds a weekly goal and calculates progress without exceeding 100 percent", () => {
    expect(calculateWeeklyGoalProgress(3, 5)).toEqual({ goal: 5, completed: 3, percent: 60, reached: false });
    expect(calculateWeeklyGoalProgress(11, 5)).toEqual({ goal: 5, completed: 11, percent: 100, reached: true });
    expect(calculateWeeklyGoalProgress(0, 0).goal).toBe(1);
  });

  it("counts consecutive completed weeks including the current week", () => {
    const streak = calculateWeeklyGoalStreak([
      { kind: "blog", createdAt: "2026-08-17T09:00:00.000Z" }, { kind: "email", createdAt: "2026-08-18T09:00:00.000Z" },
      { kind: "code", createdAt: "2026-08-10T09:00:00.000Z" }, { kind: "image", createdAt: "2026-08-11T09:00:00.000Z" },
      { kind: "blog", createdAt: "2026-08-03T09:00:00.000Z" }, { kind: "email", createdAt: "2026-08-04T09:00:00.000Z" },
    ], now, 2);
    expect(streak).toMatchObject({ weeks: 3, goal: 2, currentWeekCompleted: true });
  });

  it("breaks the streak when the current or an earlier week does not meet the goal", () => {
    const currentIncomplete = calculateWeeklyGoalStreak([{ kind: "blog", createdAt: "2026-08-17T09:00:00.000Z" }], now, 2);
    expect(currentIncomplete.weeks).toBe(0);
    const brokenHistory = calculateWeeklyGoalStreak([
      { kind: "blog", createdAt: "2026-08-17T09:00:00.000Z" }, { kind: "email", createdAt: "2026-08-18T09:00:00.000Z" },
      { kind: "code", createdAt: "2026-08-10T09:00:00.000Z" },
      { kind: "image", createdAt: "2026-08-03T09:00:00.000Z" }, { kind: "blog", createdAt: "2026-08-04T09:00:00.000Z" },
    ], now, 2);
    expect(brokenHistory.weeks).toBe(1);
  });
});
