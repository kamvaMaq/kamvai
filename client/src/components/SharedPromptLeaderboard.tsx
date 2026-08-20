import React from "react";
import { BarChart3, Eye, Link2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function SharedPromptLeaderboard() {
  const leaderboardQuery = trpc.promptLibrary.sharedLeaderboard.useQuery(undefined);
  const prompts = leaderboardQuery.data ?? [];

  if (leaderboardQuery.isLoading) {
    return <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[0_22px_70px_rgba(46,41,30,.06)] sm:p-6"><div className="h-5 w-40 animate-pulse rounded bg-muted" /><div className="mt-5 space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div></section>;
  }

  if (leaderboardQuery.isError) {
    return <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#E9C7BD] bg-[#FFF8F5] p-5 text-center shadow-[0_22px_70px_rgba(46,41,30,.06)] dark:border-[#633F36] dark:bg-[#2E211E] sm:p-6"><div className="mx-auto grid size-10 place-items-center rounded-2xl bg-[#FBEDE6] text-[#B6503A] dark:bg-[#4A2A22]"><BarChart3 size={19} /></div><h2 className="mt-3 font-display text-xl">Your shared prompt reach is unavailable</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Your templates and links are safe. Please try loading their reach again.</p><Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => leaderboardQuery.refetch()}><BarChart3 size={14} />Try again</Button></section>;
  }

  if (!prompts.length) {
    return <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#C7D7CF] bg-[#F1F7F2] p-5 text-center shadow-[0_22px_70px_rgba(46,41,30,.06)] dark:border-[#426357] dark:bg-[#20382F] sm:p-6"><div className="mx-auto grid size-10 place-items-center rounded-2xl bg-[#DDECE1] text-[#244F49] dark:bg-[#315345] dark:text-[#D4F5E0]"><Eye size={19} /></div><h2 className="mt-3 font-display text-xl">Your shared prompt reach will appear here</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a share link from My Prompts to begin seeing anonymous views for your popular templates.</p></section>;
  }

  const maximumViews = Math.max(...prompts.map(prompt => prompt.views), 1);
  return <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#C7D7CF] bg-[#F1F7F2] shadow-[0_22px_70px_rgba(46,41,30,.06)] dark:border-[#426357] dark:bg-[#20382F]">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D7E4DB] px-5 py-5 dark:border-[#426357] sm:px-6">
      <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Shared prompt reach</p><h2 className="mt-1 font-display text-2xl tracking-tight">Your popular templates</h2><p className="mt-1 text-sm text-muted-foreground">Anonymous views across your active public prompt links.</p></div>
      <div className="grid size-10 place-items-center rounded-2xl bg-[#DDECE1] text-[#244F49] dark:bg-[#315345] dark:text-[#D4F5E0]"><BarChart3 size={20} /></div>
    </div>
    <ol className="divide-y divide-[#D7E4DB] px-5 dark:divide-[#426357] sm:px-6">{prompts.map((prompt, index) => <li key={prompt.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 py-4">
      <div className={`grid size-9 place-items-center rounded-xl text-sm font-bold ${index === 0 ? "bg-[#E8C77A] text-[#684905]" : "bg-background text-muted-foreground"}`}>{index === 0 ? <Trophy size={16} /> : index + 1}</div>
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-semibold">{prompt.title}</p><span className="hidden rounded-full bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground sm:inline">{prompt.kind}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DDEAE0] dark:bg-[#315345]"><div className="h-full rounded-full bg-[#59857A]" style={{ width: `${Math.max((prompt.views / maximumViews) * 100, 5)}%` }} /></div></div>
      <div className="text-right"><p className="flex items-center justify-end gap-1 text-sm font-bold text-[#244F49] dark:text-[#D4F5E0]"><Eye size={14} />{prompt.views}</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground"><Link2 size={12} />views</p></div>
    </li>)}</ol>
  </section>;
}
