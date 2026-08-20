import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Check, Code2, Image, Mail, PenLine, Sparkles, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const kindVisual = {
  blog: { label: "Blog", icon: PenLine, tone: "bg-[#E8F1EE] text-[#244F49]" },
  email: { label: "Email", icon: Mail, tone: "bg-[#F8EEDD] text-[#9A5D28]" },
  code: { label: "Code", icon: Code2, tone: "bg-[#E9EDF7] text-[#415B8A]" },
  image: { label: "Image", icon: Image, tone: "bg-[#F3E9F4] text-[#85528C]" },
} as const;

export function ContributionAnalytics() {
  const analyticsQuery = trpc.analytics.summary.useQuery();
  const utils = trpc.useUtils();
  const [goalValue, setGoalValue] = useState("5");
  const saveGoal = trpc.preferences.save.useMutation({
    onSuccess: () => { utils.analytics.summary.invalidate(); toast.success("Your weekly goal has been updated."); },
    onError: error => toast.error(error.message || "We could not update your weekly goal. Please try again."),
  });
  const data = analyticsQuery.data;
  useEffect(() => { if (data) setGoalValue(String(data.weeklyGoal)); }, [data?.weeklyGoal]);
  if (analyticsQuery.isLoading) return <div className="mt-7 h-52 animate-pulse rounded-[1.5rem] bg-muted/50" />;
  if (analyticsQuery.isError || !data) return <div className="mt-7 rounded-[1.5rem] border border-[#D9C98D] bg-[#FEF8DD] p-5 text-sm text-[#7D5825] dark:bg-[#39331A] dark:text-[#F4D995]">Your contribution analytics are temporarily unavailable. Your drafts and generation history remain unchanged.</div>;

  const peak = Math.max(...data.weekTrend.map(day => day.count), 1);
  const mixTotal = Math.max(data.monthTotal, 1);
  const targetGoal = Number(goalValue);
  const canSaveGoal = Number.isInteger(targetGoal) && targetGoal >= 1 && targetGoal <= 100 && targetGoal !== data.weeklyGoal;

  return <section className="mt-7 rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[0_22px_70px_rgba(46,41,30,.05)] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Your contribution</p><h2 className="mt-1 font-display text-2xl tracking-tight">Your creative rhythm</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A private view of the content you have generated. No activity is shared with other users.</p></div><div className="flex items-center gap-2 rounded-full bg-[#EAF3EE] px-3 py-2 text-xs font-semibold text-[#244F49] dark:bg-[#1E3E39] dark:text-[#C7F0DD]"><BarChart3 size={15} />Personal analytics</div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#F1F7F2] p-4 dark:bg-[#20382F]"><div className="flex items-center gap-2 text-[#244F49] dark:text-[#C7F0DD]"><Sparkles size={16} /><p className="text-xs font-bold uppercase tracking-[.12em]">This week</p></div><p className="mt-3 font-display text-3xl">{data.weekTotal}</p><p className="mt-1 text-xs text-muted-foreground">generations since Monday</p></div><div className="rounded-2xl bg-[#FBF5E7] p-4 dark:bg-[#3C3422]"><div className="flex items-center gap-2 text-[#9A5D28] dark:text-[#F2CC91]"><CalendarDays size={16} /><p className="text-xs font-bold uppercase tracking-[.12em]">This month</p></div><p className="mt-3 font-display text-3xl">{data.monthTotal}</p><p className="mt-1 text-xs text-muted-foreground">across {data.activeDaysMonth} active day{data.activeDaysMonth === 1 ? "" : "s"}</p></div><div className="rounded-2xl bg-muted/65 p-4"><div className="flex items-center gap-2 text-muted-foreground"><BarChart3 size={16} /><p className="text-xs font-bold uppercase tracking-[.12em]">Top format</p></div><p className="mt-3 font-display text-3xl capitalize">{data.mostUsedKind ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">your most-used format this month</p></div></div>
    <div className={`mt-5 rounded-2xl border p-4 ${data.goalProgress.reached ? "border-[#8AB5A5] bg-[#EDF7F1] dark:border-[#426F5F] dark:bg-[#1F3A30]" : "border-[#D8D0BA] bg-[#FCF8EE] dark:border-[#4A5D54] dark:bg-[#27362F]"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#244F49] text-white"><Target size={18} /></span><div><p className="text-sm font-semibold">Weekly generation goal</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{data.goalProgress.reached ? "Goal reached — keep your creative momentum going." : `${data.goalProgress.completed} of ${data.goalProgress.goal} generations complete this week.`}</p></div></div><div className="flex items-center gap-2"><Input aria-label="Weekly generation goal" type="number" min="1" max="100" value={goalValue} onChange={event => setGoalValue(event.target.value)} className="h-9 w-20 bg-background text-center" /><Button size="sm" variant="outline" disabled={!canSaveGoal || saveGoal.isPending} onClick={() => saveGoal.mutate({ weeklyGenerationGoal: targetGoal })}>{saveGoal.isPending ? "Saving" : "Set goal"}</Button></div></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#D9E6DE] dark:bg-[#405B50]"><div className={`h-full rounded-full transition-all ${data.goalProgress.reached ? "bg-[#3C8A68]" : "bg-[#C58A3A]"}`} style={{ width: `${data.goalProgress.percent}%` }} /></div><div className="mt-2 flex items-center justify-between text-xs"><span className="font-semibold">{data.goalProgress.percent}% complete</span><span className="text-muted-foreground">{data.goalProgress.reached && <Check className="mr-1 inline" size={13} />}Goal: {data.goalProgress.goal}</span></div></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.85fr]"><div><div className="flex items-center justify-between"><p className="text-sm font-semibold">Weekly activity</p><span className="text-xs text-muted-foreground">Mon–Sun</span></div><div className="mt-4 flex h-28 items-end gap-2">{data.weekTrend.map(day => <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="flex h-20 w-full items-end rounded-lg bg-muted/70"><div className="w-full rounded-lg bg-[#5E8D80] transition-all" style={{ height: `${Math.max((day.count / peak) * 100, day.count ? 10 : 2)}%` }} title={`${day.label}: ${day.count} generation${day.count === 1 ? "" : "s"}`} /></div><span className="text-[10px] font-medium text-muted-foreground">{day.label}</span></div>)}</div></div><div><p className="text-sm font-semibold">Monthly content mix</p><div className="mt-4 space-y-3">{data.contentMix.map(item => { const visual = kindVisual[item.kind]; const Icon = visual.icon; return <div key={item.kind}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><span className={`grid size-5 place-items-center rounded-md ${visual.tone}`}><Icon size={12} /></span>{visual.label}</span><span className="text-muted-foreground">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#5E8D80]" style={{ width: `${(item.count / mixTotal) * 100}%` }} /></div></div>; })}</div></div></div>
  </section>;
}
