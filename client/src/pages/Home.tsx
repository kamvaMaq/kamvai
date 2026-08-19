import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronRight, Copy, Download, ImageIcon, Link2, Loader2, LockKeyhole, Mail, Mic, Moon, PanelLeft, Plus, Share2, Sparkles, Sun, WandSparkles, X } from "lucide-react";
import { languageOptions } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";

type ContentKind = "blog" | "email" | "code" | "image";
type SpeechRecognitionConstructor = new () => SpeechRecognition;
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; } }
interface SpeechRecognition extends EventTarget { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: ((event: Event) => void) | null; onend: (() => void) | null; }
interface SpeechRecognitionEvent extends Event { results: { [index: number]: { [index: number]: { transcript: string } }; length: number }; }

const kindOptions: { value: ContentKind; label: string; description: string; icon: typeof Mail }[] = [
  { value: "blog", label: "Blog post", description: "Structured, publish-ready writing", icon: PanelLeft },
  { value: "email", label: "Email", description: "Clear messages for real people", icon: Mail },
  { value: "code", label: "Code", description: "Practical implementation help", icon: WandSparkles },
  { value: "image", label: "Image", description: "Original visual directions", icon: ImageIcon },
];

const shareLinks = (url: string) => ({
  WhatsApp: `https://wa.me/?text=${encodeURIComponent(url)}`,
  Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  X: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
});

export default function Home() {
  const { t, i18n } = useTranslation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, preference, setThemePreference, toggleTheme } = useTheme();
  const [kind, setKind] = useState<ContentKind>("blog");
  const [brief, setBrief] = useState("");
  const [refinement, setRefinement] = useState("");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherBrand, setVoucherBrand] = useState<"kazang" | "oneforyou" | "blue" | "ott">("kazang");
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("weekly");
  const recognition = useRef<SpeechRecognition | null>(null);
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const draftsQuery = trpc.drafts.list.useQuery(undefined, { enabled: isAuthenticated });
  const usageQuery = trpc.usage.status.useQuery(undefined, { enabled: isAuthenticated });
  const plansQuery = trpc.payments.plans.useQuery(undefined, { enabled: isAuthenticated });
  const attemptsQuery = trpc.payments.attempts.useQuery(undefined, { enabled: isAuthenticated });
  const preferenceSave = trpc.preferences.save.useMutation({ onSuccess: () => utils.preferences.get.invalidate() });
  const generate = trpc.generation.create.useMutation({
    onSuccess: ({ draft }) => {
      if (draft) setActiveDraftId(draft.id);
      setRefinement("");
      utils.drafts.list.invalidate(); utils.usage.status.invalidate();
      toast.success(kind === "image" ? "Your image is ready." : "Your draft is ready.");
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.drafts.publish.useMutation();
  const redeem = trpc.payments.redeemVoucher.useMutation({
    onSuccess: result => { setVoucherCode(""); toast.message(result.message); setShowVoucher(false); },
    onError: error => toast.error(error.message),
  });
  const activeDraft = useMemo(() => draftsQuery.data?.find(draft => draft.id === activeDraftId) ?? draftsQuery.data?.[0], [activeDraftId, draftsQuery.data]);
  const activeLanguage = languageOptions.find(option => option.code === i18n.language) ?? languageOptions[0];

  useEffect(() => {
    if (preferencesQuery.data?.locale && preferencesQuery.data.locale !== i18n.language) setLanguage(preferencesQuery.data.locale);
    if (preferencesQuery.data?.theme && preferencesQuery.data.theme !== preference) setThemePreference(preferencesQuery.data.theme);
    // Preferences are intentionally applied only after an authenticated profile resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesQuery.data]);

  function setLanguage(language: string) {
    i18n.changeLanguage(language); localStorage.setItem("kamvai-locale", language);
    if (isAuthenticated) preferenceSave.mutate({ locale: language });
  }
  function changeTheme() {
    const next = theme === "dark" ? "light" : "dark";
    toggleTheme();
    if (isAuthenticated) preferenceSave.mutate({ theme: next });
  }
  function ensureAuthenticated() { if (!isAuthenticated) { toast.message(t("signInToCreate")); startLogin(); return false; } return true; }
  function submitGeneration(refine = false) {
    if (!ensureAuthenticated()) return;
    if (!brief.trim()) { toast.error("Add a short brief before generating."); return; }
    if (!preferencesQuery.data?.privacyConsentAt) { toast.message("Please confirm the privacy notice first."); return; }
    generate.mutate({ kind, brief, language: activeLanguage.code, draftId: refine ? activeDraft?.id : undefined, refinement: refine ? refinement : undefined });
  }
  function startVoice() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const languagesWithVerifiedBrowserSupport = new Set(["en", "af"]);
    if (!Constructor || !languagesWithVerifiedBrowserSupport.has(activeLanguage.code)) { toast.error(`Voice input is not available in ${activeLanguage.native} yet — please type your brief.`); return; }
    const voice = new Constructor();
    voice.lang = activeLanguage.speech; voice.continuous = true; voice.interimResults = true;
    voice.onresult = event => { let transcript = ""; for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript; setBrief(transcript); };
    voice.onerror = () => { setVoiceActive(false); toast.error(t("voiceUnavailable")); };
    voice.onend = () => setVoiceActive(false);
    recognition.current = voice; voice.start(); setVoiceActive(true);
  }
  function stopVoice() { recognition.current?.stop(); setVoiceActive(false); }
  async function share(platform?: string) {
    if (!activeDraft) return;
    try {
      const result = await publish.mutateAsync({ id: activeDraft.id });
      const url = `${window.location.origin}/p/${result.slug}`;
      if (!platform) { await navigator.clipboard.writeText(url); toast.success(t("copied")); return; }
      window.open(shareLinks(url)[platform as keyof ReturnType<typeof shareLinks>], "_blank", "noopener,noreferrer");
    } catch { toast.error("We could not prepare your shareable preview."); }
  }

  if (loading) return <div className="min-h-screen bg-background grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(221,167,70,.14),transparent_26rem),radial-gradient(circle_at_0%_25%,rgba(40,141,132,.11),transparent_29rem)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/75 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-18 items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#244F49] text-[#FAF7EE] shadow-sm"><Sparkles size={17} /></div><div><p className="font-display text-xl leading-none tracking-tight">kamvai</p><p className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground sm:block">{t("brandTagline")}</p></div></div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Select value={activeLanguage.code} onValueChange={setLanguage}><SelectTrigger className="h-9 w-[118px] border-transparent bg-muted/70 text-xs"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(option => <SelectItem key={option.code} value={option.code}>{option.native}</SelectItem>)}</SelectContent></Select>
            <Button aria-label={theme === "dark" ? t("lightMode") : t("darkMode")} variant="ghost" size="icon" className="rounded-full" onClick={changeTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</Button>
            {isAuthenticated ? <Button variant="outline" className="hidden rounded-full px-4 text-xs sm:inline-flex" onClick={() => logout()}>{t("signOut")}</Button> : <Button className="rounded-full bg-[#244F49] px-4 text-xs text-white hover:bg-[#173b36]" onClick={() => startLogin()}>{t("signIn")}</Button>}
          </div>
        </div>
      </header>

      <main className="container grid gap-8 py-8 lg:grid-cols-[236px_minmax(0,1fr)_290px] lg:py-10">
        <aside className="hidden lg:block"><div className="sticky top-28"><button className="flex w-full items-center gap-3 rounded-xl bg-[#244F49] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(36,79,73,.18)]"><Plus size={16} /> {t("newDraft")}</button><div className="mt-7"><p className="px-3 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">{t("yourLibrary")}</p><div className="mt-2 space-y-1">{draftsQuery.data?.slice(0, 6).map(draft => <button key={draft.id} onClick={() => setActiveDraftId(draft.id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${activeDraft?.id === draft.id ? "bg-[#E7EFEA] text-[#1B453F] dark:bg-[#254840] dark:text-white" : "text-muted-foreground hover:bg-muted"}`}><span className="block truncate font-medium">{draft.title}</span><span className="mt-1 block text-[11px] capitalize opacity-70">{draft.kind} · {new Date(draft.updatedAt).toLocaleDateString()}</span></button>)}</div></div><div className="mt-8 rounded-2xl border border-[#D8D0BA] bg-[#F6F0E2] p-4 dark:border-[#59635D] dark:bg-[#27332E]"><div className="flex items-center gap-2 text-[#244F49] dark:text-[#CFE7D4]"><LockKeyhole size={15} /><p className="text-xs font-bold">{t("paymentSafe")}</p></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("paymentSafeBody")}</p></div></div></aside>

        <section className="min-w-0">
          <div className="mb-7 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#B36935]">{isAuthenticated ? `Welcome back, ${user?.name?.split(" ")[0] ?? "creator"}` : "KAMVAI STUDIO"}</p><h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl">{t("welcome")}</h1><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{t("welcomeBody")}</p></div>
          {(preferencesQuery.isError || draftsQuery.isError || usageQuery.isError || plansQuery.isError || attemptsQuery.isError) && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#D9C98D] bg-[#FEF8DD] p-4 text-sm dark:border-[#766833] dark:bg-[#39331A]"><AlertCircle className="mt-0.5 shrink-0 text-[#A65B26]" size={18} /><p>Some saved workspace details could not be loaded. You can refresh the page to try again; your unsaved brief remains here.</p></div>}
          {isAuthenticated && !preferencesQuery.data?.privacyConsentAt && <div className="mb-6 rounded-2xl border border-[#D9C98D] bg-[#FEF8DD] p-4 dark:border-[#766833] dark:bg-[#39331A]"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#A65B26]" size={18} /><div><p className="font-semibold">{t("consentTitle")}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("consentBody")}</p><Button size="sm" className="mt-3 bg-[#244F49] text-white hover:bg-[#173b36]" onClick={() => preferenceSave.mutate({ acceptPrivacy: true })}>{t("consentAccept")}</Button></div></div></div>}
          <div className="rounded-[1.5rem] border border-border/80 bg-card p-4 shadow-[0_22px_70px_rgba(46,41,30,.07)] sm:p-6">
            <div className="grid gap-2 sm:grid-cols-4">{kindOptions.map(option => { const Icon = option.icon; const selected = kind === option.value; return <button key={option.value} onClick={() => setKind(option.value)} className={`rounded-2xl border p-3 text-left transition-all ${selected ? "border-[#244F49] bg-[#EAF3EE] shadow-sm dark:bg-[#1E3E39]" : "border-border hover:border-[#AAC3BA] hover:bg-muted/60"}`}><Icon className={selected ? "text-[#244F49] dark:text-[#C7F0DD]" : "text-muted-foreground"} size={18} /><p className="mt-4 text-sm font-semibold">{t(option.value)}</p><p className="mt-1 hidden text-xs leading-4 text-muted-foreground xl:block">{option.description}</p></button>; })}</div>
            <div className="mt-6"><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold" htmlFor="brief">{t("briefLabel")}</label><div className="flex items-center gap-2">{voiceActive && <span className="flex items-center gap-1.5 text-xs font-medium text-[#B6503A]"><span className="size-2 animate-pulse rounded-full bg-[#B6503A]" />{t("listening")}</span>}<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={voiceActive ? stopVoice : startVoice}>{voiceActive ? <X size={14} /> : <Mic size={14} />}{t("voice")}</Button></div></div><div className="relative"><Textarea id="brief" value={brief} onChange={event => setBrief(event.target.value)} placeholder={t("briefPlaceholder")} className="min-h-36 resize-y rounded-2xl border-border bg-muted/30 p-4 pb-14 text-base leading-6 focus-visible:ring-[#59857A]" /><div className="absolute inset-x-3 bottom-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">{brief.length.toLocaleString()} / 6,000</span><Button disabled={generate.isPending || !brief.trim()} onClick={() => submitGeneration()} className="h-9 rounded-full bg-[#244F49] px-4 text-white hover:bg-[#173b36]">{generate.isPending ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}{generate.isPending ? t("generating") : t("generate")}</Button></div></div></div>
          </div>

          <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_22px_70px_rgba(46,41,30,.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{activeDraft?.kind === "image" ? "Generated image" : t("draftStack")}</p><h2 className="mt-1 font-display text-2xl tracking-tight">{activeDraft?.title ?? t("draftNotSelected")}</h2></div>{activeDraft && <div className="flex gap-1"><Button size="icon" variant="ghost" className="rounded-full" onClick={() => share()}><Copy size={16} /></Button><Button size="icon" variant="ghost" className="rounded-full" onClick={() => share("WhatsApp")}><Share2 size={16} /></Button></div>}</div>
            {activeDraft ? <div className="p-5 sm:p-7">{activeDraft.kind === "image" && activeDraft.imageUrl ? <div><img src={activeDraft.imageUrl} alt={activeDraft.prompt} className="max-h-[520px] w-full rounded-2xl object-cover" /><div className="mt-4 flex justify-end"><a href={activeDraft.imageUrl} download className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"><Download size={15} />{t("download")}</a></div></div> : <article className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight"><Streamdown>{activeDraft.body ?? ""}</Streamdown></article>}<div className="mt-7 border-t border-border pt-5"><label className="mb-2 block text-sm font-semibold">{t("refine")}</label><div className="flex flex-col gap-2 sm:flex-row"><Input value={refinement} onChange={event => setRefinement(event.target.value)} placeholder={t("refinePlaceholder")} className="h-11 rounded-xl" /><Button disabled={generate.isPending || !refinement.trim()} onClick={() => submitGeneration(true)} variant="outline" className="h-11 rounded-xl border-[#9CB9AF] text-[#244F49] dark:text-[#C7F0DD]"><ChevronRight size={16} />{t("refine")}</Button></div></div><div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-muted-foreground">{t("share")}:</span>{Object.keys(shareLinks("https://kamvai")).map(platform => <Button key={platform} onClick={() => share(platform)} size="sm" variant="ghost" className="rounded-full text-xs">{platform}</Button>)}<Button onClick={() => share()} size="sm" variant="ghost" className="rounded-full text-xs"><Link2 size={14} />{t("copyLink")}</Button></div></div> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted"><Sparkles size={20} className="text-muted-foreground" /></div><p className="mt-4 font-display text-xl">A calm place to begin.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t("noDrafts")}</p></div></div>}
          </div>
        </section>

        <aside className="space-y-5"><div className="rounded-[1.4rem] border border-border bg-card p-5 shadow-[0_14px_42px_rgba(46,41,30,.05)]"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{t("freeAllowance")}</p><p className="mt-1 font-display text-2xl">{usageQuery.data?.unlimited ? t("unlimited") : isAuthenticated ? `${usageQuery.data?.remaining ?? 0} ${t("remaining")}` : "—"}</p></div><div className="grid size-10 place-items-center rounded-xl bg-[#EAF3EE] text-[#244F49] dark:bg-[#1E3E39] dark:text-[#C7F0DD]"><Sparkles size={17} /></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#5E8D80]" style={{ width: `${usageQuery.data?.unlimited ? 100 : ((usageQuery.data?.used ?? 0) / (usageQuery.data?.limit ?? 5)) * 100}%` }} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{usageQuery.data?.unlimited ? "Your pass is active." : t("reset")}</p></div>
          <div className="rounded-[1.4rem] bg-[#244F49] p-5 text-[#FAF7EE] shadow-[0_14px_42px_rgba(36,79,73,.20)]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#D7B760]">{t("subscription")}</p><p className="mt-2 font-display text-2xl">Keep the momentum.</p><div className="mt-5 space-y-2">{(plansQuery.data ?? [{ id: "weekly", name: "Weekly pass", priceZar: 50, days: 7 }, { id: "monthly", name: "Monthly pass", priceZar: 150, days: 30 }]).map(plan => <button key={plan.id} onClick={() => { if (ensureAuthenticated()) { setSelectedPlan(plan.id as "weekly" | "monthly"); setShowVoucher(true); } }} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/8 p-3 text-left transition hover:bg-white/14"><div><p className="text-sm font-semibold">{t(plan.id)}</p><p className="mt-0.5 text-xs text-[#D5E3D4]">{plan.days} {t("days")}</p></div><span className="font-display text-xl">R{plan.priceZar}</span></button>)}</div><p className="mt-4 text-xs leading-5 text-[#D5E3D4]">{t("paymentSetup")}</p></div>
          <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{t("draftStack")}</p><div className="mt-4 space-y-3">{draftsQuery.data?.slice(0, 3).map(draft => <button key={draft.id} onClick={() => setActiveDraftId(draft.id)} className="block w-full text-left"><p className="truncate text-sm font-medium">{draft.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(draft.updatedAt).toLocaleDateString()} · {draft.kind}</p></button>) ?? <p className="text-sm text-muted-foreground">{t("noDrafts")}</p>}</div></div>
          {isAuthenticated && <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Voucher activity</p><div className="mt-4 space-y-3">{attemptsQuery.data?.length ? attemptsQuery.data.slice(0, 3).map(attempt => <div key={attempt.id} className="flex items-center justify-between gap-3 text-xs"><div><p className="font-semibold capitalize">{attempt.plan} · {attempt.voucherBrand}</p><p className="mt-1 text-muted-foreground">{attempt.maskedVoucherCode}</p></div><span className={`rounded-full px-2 py-1 font-semibold capitalize ${attempt.status === "confirmed" ? "bg-[#EAF3EE] text-[#244F49]" : attempt.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{attempt.status}</span></div>) : <p className="text-sm leading-6 text-muted-foreground">No voucher requests yet. Your code stays masked after submission.</p>}</div></div>}
        </aside>
      </main>

      <Dialog open={showVoucher} onOpenChange={setShowVoucher}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-display text-3xl">{t("voucherTitle")}</DialogTitle><DialogDescription className="leading-6">{t("voucherBody")}</DialogDescription></DialogHeader><div className="space-y-4 pt-2"><div className="grid grid-cols-2 gap-2"><Button variant={selectedPlan === "weekly" ? "default" : "outline"} onClick={() => setSelectedPlan("weekly")} className={selectedPlan === "weekly" ? "bg-[#244F49]" : ""}>Weekly · R50</Button><Button variant={selectedPlan === "monthly" ? "default" : "outline"} onClick={() => setSelectedPlan("monthly")} className={selectedPlan === "monthly" ? "bg-[#244F49]" : ""}>Monthly · R150</Button></div><Select value={voucherBrand} onValueChange={value => setVoucherBrand(value as typeof voucherBrand)}><SelectTrigger><SelectValue placeholder={t("voucherBrand")} /></SelectTrigger><SelectContent><SelectItem value="kazang">Kazang</SelectItem><SelectItem value="oneforyou">1ForYou</SelectItem><SelectItem value="blue">Blue Voucher</SelectItem><SelectItem value="ott">OTT</SelectItem></SelectContent></Select><Input type="password" autoComplete="off" value={voucherCode} onChange={event => setVoucherCode(event.target.value)} placeholder={t("voucherCode")} /><Button disabled={!voucherCode.trim() || redeem.isPending} onClick={() => redeem.mutate({ plan: selectedPlan, voucherBrand, voucherCode })} className="w-full bg-[#244F49] hover:bg-[#173b36]">{redeem.isPending ? <Loader2 className="animate-spin" /> : <Check />}{t("submitVoucher")}</Button></div></DialogContent></Dialog>
    </div>
  );
}
