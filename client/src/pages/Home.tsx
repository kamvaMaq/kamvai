import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { AlertCircle, Archive, BarChart3, Check, ChevronRight, Copy, CreditCard, Download, ImageIcon, Link2, Loader2, LockKeyhole, Mail, MessageCircle, Mic, Moon, PanelLeft, Plus, ShieldCheck, Share2, Sparkles, Sun, Video, WandSparkles, X } from "lucide-react";
import { languageOptions } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { downloadCodeExport } from "../lib/codeZip";
import { ContributionAnalytics } from "../components/ContributionAnalytics";
import { PromptLibrary } from "../components/PromptLibrary";
import { SharedPromptLeaderboard } from "../components/SharedPromptLeaderboard";
import { AttachedDocumentChips, DocumentUploader } from "../components/DocumentUploader";

type ContentKind = "blog" | "email" | "code" | "image" | "chat" | "video";
type WorkspacePanel = "analytics" | "sharing" | "payments" | "privacy" | "admin" | null;
type SpeechRecognitionConstructor = new () => SpeechRecognition;
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; } }
interface SpeechRecognition extends EventTarget { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: ((event: Event) => void) | null; onend: (() => void) | null; }
interface SpeechRecognitionEvent extends Event { results: { [index: number]: { [index: number]: { transcript: string } }; length: number }; }

const kindOptions: { value: ContentKind; label: string; description: string; icon: typeof Mail }[] = [
  { value: "chat", label: "General chat", description: "Ask a question or make any request", icon: MessageCircle },
  { value: "blog", label: "Blog post", description: "Structured, publish-ready writing", icon: PanelLeft },
  { value: "email", label: "Email", description: "Clear messages for real people", icon: Mail },
  { value: "code", label: "Code", description: "Practical implementation help", icon: WandSparkles },
  { value: "image", label: "Image", description: "Original visual directions", icon: ImageIcon },
  { value: "video", label: "Video plan", description: "Script, shots and video-generator prompt", icon: Video },
];

const workspaceCopy: Record<ContentKind, { inputLabel: string; placeholder: string; actionLabel: string; loadingLabel: string; outputLabel: string; refineLabel: string; refinePlaceholder: string }> = {
  chat: { inputLabel: "What can Kamvai help with?", placeholder: "Ask a question, describe a task, or request practical advice…", actionLabel: "Ask Kamvai", loadingLabel: "Thinking", outputLabel: "General chat", refineLabel: "Ask a follow-up", refinePlaceholder: "What would you like to ask next?" },
  blog: { inputLabel: "What would you like to make?", placeholder: "Describe the blog post you need…", actionLabel: "Generate", loadingLabel: "Generating", outputLabel: "Draft stack", refineLabel: "Refine", refinePlaceholder: "What should change?" },
  email: { inputLabel: "What would you like to make?", placeholder: "Describe the email you need…", actionLabel: "Generate", loadingLabel: "Generating", outputLabel: "Draft stack", refineLabel: "Refine", refinePlaceholder: "What should change?" },
  code: { inputLabel: "What would you like to make?", placeholder: "Describe the feature, application, or problem to solve…", actionLabel: "Generate", loadingLabel: "Generating", outputLabel: "Draft stack", refineLabel: "Refine", refinePlaceholder: "What should change?" },
  image: { inputLabel: "What would you like to make?", placeholder: "Describe the original image you want to create…", actionLabel: "Generate", loadingLabel: "Generating", outputLabel: "Generated image", refineLabel: "Refine", refinePlaceholder: "What should change?" },
  video: { inputLabel: "What video would you like to make?", placeholder: "Describe your audience, message, style, platform, and any important scenes…", actionLabel: "Create video plan", loadingLabel: "Planning", outputLabel: "Video plan", refineLabel: "Refine video plan", refinePlaceholder: "What should change in the script or shots?" },
};

const codeStackOptions = [
  { value: "auto", label: "Let Kamvai recommend" },
  { value: "React + TypeScript", label: "React + TypeScript" },
  { value: "Next.js + TypeScript", label: "Next.js + TypeScript" },
  { value: "Node.js + Express + TypeScript", label: "Node.js + Express + TypeScript" },
  { value: "Python + FastAPI", label: "Python + FastAPI" },
  { value: "Python + Django", label: "Python + Django" },
  { value: "Laravel + PHP", label: "Laravel + PHP" },
  { value: "Java + Spring Boot", label: "Java + Spring Boot" },
  { value: "C# + .NET", label: "C# + .NET" },
  { value: "Flutter + Dart", label: "Flutter + Dart" },
  { value: "React Native + TypeScript", label: "React Native + TypeScript" },
  { value: "custom", label: "Custom stack…" },
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
  const [kind, setKind] = useState<ContentKind>("chat");
  const [codeStack, setCodeStack] = useState("auto");
  const [customCodeStack, setCustomCodeStack] = useState("");
  const [brief, setBrief] = useState("");
  const [refinement, setRefinement] = useState("");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [allowanceOpen, setAllowanceOpen] = useState(false);
  const [showMobileLibrary, setShowMobileLibrary] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [showPayShap, setShowPayShap] = useState(false);
  const [workspacePanel, setWorkspacePanel] = useState<WorkspacePanel>(null);
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("weekly");
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailMode, setEmailMode] = useState<"signup" | "login">("signup");
  const [emailFirstName, setEmailFirstName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const draftsQuery = trpc.drafts.list.useQuery(undefined, { enabled: isAuthenticated });
  const usageQuery = trpc.usage.status.useQuery(undefined, { enabled: isAuthenticated });
  const plansQuery = trpc.payments.plans.useQuery(undefined, { enabled: isAuthenticated });
  const attemptsQuery = trpc.payments.attempts.useQuery(undefined, { enabled: isAuthenticated });
  const payShapRequestsQuery = trpc.payments.payShapRequests.useQuery(undefined, { enabled: isAuthenticated });
  const adminPayShapQuery = trpc.payments.adminOpenPayShapRequests.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const deletionStatusQuery = trpc.privacy.deletionStatus.useQuery(undefined, { enabled: isAuthenticated });
  const adminDeletionQuery = trpc.privacy.adminOpenDeletionRequests.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const preferenceSave = trpc.preferences.save.useMutation({ onSuccess: () => utils.preferences.get.invalidate() });
  const generate = trpc.generation.create.useMutation({
    onSuccess: ({ draft }) => {
      if (draft) setActiveDraftId(draft.id);
      setRefinement("");
      utils.drafts.list.invalidate(); utils.usage.status.invalidate();
      toast.success(kind === "image" ? "Your image is ready." : kind === "video" ? "Your video plan is ready." : kind === "chat" ? "Kamvai has answered." : "Your draft is ready.");
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.drafts.publish.useMutation();
  const requestPayShap = trpc.payments.requestPayShap.useMutation({
    onSuccess: () => { utils.payments.payShapRequests.invalidate(); utils.payments.adminOpenPayShapRequests.invalidate(); toast.success("Your PayShap request is ready. Use the exact reference when paying."); },
    onError: error => toast.error(error.message),
  });
  const reconcilePayShap = trpc.payments.reconcilePayShap.useMutation({
    onSuccess: () => { utils.payments.payShapRequests.invalidate(); utils.payments.adminOpenPayShapRequests.invalidate(); utils.usage.status.invalidate(); toast.success("Payment request reconciled."); },
    onError: error => toast.error(error.message),
  });
  const requestDeletion = trpc.privacy.requestDeletion.useMutation({
    onSuccess: () => { utils.privacy.deletionStatus.invalidate(); utils.privacy.adminOpenDeletionRequests.invalidate(); toast.success("Your account-deletion request has been recorded."); },
    onError: error => toast.error(error.message),
  });
  const resolveDeletion = trpc.privacy.resolveDeletionRequest.useMutation({
    onSuccess: () => { utils.privacy.deletionStatus.invalidate(); utils.privacy.adminOpenDeletionRequests.invalidate(); toast.success("Deletion request updated."); },
    onError: error => toast.error(error.message),
  });
  const requestSignupOtp = trpc.emailAuth.requestSignupOtp.useMutation({
    onSuccess: () => { setOtpRequested(true); toast.success("Your verification code is on its way."); },
    onError: error => toast.error(error.message),
  });
  const verifySignupOtp = trpc.emailAuth.verifySignupOtp.useMutation({
    onSuccess: () => { toast.success("Your email is verified."); window.location.reload(); },
    onError: error => toast.error(error.message),
  });
  const emailLogin = trpc.emailAuth.login.useMutation({
    onSuccess: () => { toast.success("Welcome back."); window.location.reload(); },
    onError: error => toast.error(error.message),
  });
  const activeDraft = useMemo(() => activeDraftId ? draftsQuery.data?.find(draft => draft.id === activeDraftId) : undefined, [activeDraftId, draftsQuery.data]);
  const activeLanguage = languageOptions.find(option => option.code === i18n.language) ?? languageOptions[0];
  const activeWorkspaceCopy = workspaceCopy[kind];

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
  function openPayment(plan: "weekly" | "monthly" = "weekly") { if (!ensureAuthenticated()) return; setSelectedPlan(plan); setWorkspacePanel(null); setShowPayShap(true); }
  function startNewDraft() { stopVoice(); setKind("chat"); setCodeStack("auto"); setCustomCodeStack(""); setBrief(""); setRefinement(""); setActiveDraftId(null); }
  function submitGeneration(refine = false) {
    if (!ensureAuthenticated()) return;
    if (!brief.trim()) { toast.error("Add a short brief before generating."); return; }
    if (!preferencesQuery.data?.privacyConsentAt) { toast.message("Please confirm the privacy notice first."); return; }
    const stack = kind === "code" ? (codeStack === "custom" ? customCodeStack.trim() || undefined : codeStack === "auto" ? undefined : codeStack) : undefined;
    generate.mutate({ kind, brief, language: activeLanguage.code, stack, draftId: refine ? activeDraft?.id : undefined, refinement: refine ? refinement : undefined });
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
  function submitEmailAuth() {
    if (emailMode === "login") { emailLogin.mutate({ email: emailAddress, password: emailPassword }); return; }
    if (otpRequested) { verifySignupOtp.mutate({ email: emailAddress, code: otpCode }); return; }
    requestSignupOtp.mutate({ email: emailAddress, firstName: emailFirstName || undefined, password: emailPassword });
  }
  async function share(platform?: string) {
    if (!activeDraft) return;
    try {
      const result = await publish.mutateAsync({ id: activeDraft.id });
      const url = `${window.location.origin}/p/${result.slug}`;
      if (!platform) { await navigator.clipboard.writeText(url); toast.success(t("copied")); return; }
      window.open(shareLinks(url)[platform as keyof ReturnType<typeof shareLinks>], "_blank", "noopener,noreferrer");
    } catch { toast.error("We could not prepare your shareable preview."); }
  }
  async function downloadCodeZip() {
    if (!activeDraft?.body) return;
    try {
      const payload = await downloadCodeExport({ title: activeDraft.title, body: activeDraft.body, language: activeDraft.language, prompt: activeDraft.prompt });
      toast.success(`Downloaded ${payload.files.length - 1} generated code file${payload.files.length === 2 ? "" : "s"} as ZIP.`);
    } catch {
      toast.error("We could not package this code export. Please try again.");
    }
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
            {isAuthenticated ? <Button variant="outline" className="hidden rounded-full px-4 text-xs sm:inline-flex" onClick={() => logout()}>{t("signOut")}</Button> : <Button className="rounded-full bg-[#244F49] px-4 text-xs text-white hover:bg-[#173b36]" onClick={() => setShowEmailAuth(true)}>{t("signIn")}</Button>}
          </div>
        </div>
      </header>

      <main className="container grid gap-8 py-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <button onClick={startNewDraft} className="flex w-full items-center gap-3 rounded-xl bg-[#244F49] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(36,79,73,.18)]"><Plus size={16} /> {t("newDraft")}</button>
            <div className="mt-7">
              <button type="button" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(open => !open)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground transition hover:bg-muted">
                <span>{t("yourLibrary")}</span><ChevronRight size={15} className={`transition-transform ${libraryOpen ? "rotate-90" : ""}`} />
              </button>
              {libraryOpen && <div className="mt-2 space-y-1">{draftsQuery.data?.length ? draftsQuery.data.slice(0, 6).map(draft => <button key={draft.id} onClick={() => { setActiveDraftId(draft.id); setLibraryOpen(false); }} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${activeDraft?.id === draft.id ? "bg-[#E7EFEA] text-[#1B453F] dark:bg-[#254840] dark:text-white" : "text-muted-foreground hover:bg-muted"}`}><span className="block truncate font-medium">{draft.title}</span><span className="mt-1 block text-[11px] capitalize opacity-70">{draft.kind} · {new Date(draft.updatedAt).toLocaleDateString()}</span></button>) : <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">No saved drafts yet.</p>}</div>}
            </div>
            {isAuthenticated && <div className="mt-3"><button type="button" aria-expanded={allowanceOpen} onClick={() => setAllowanceOpen(open => !open)} className="flex w-full items-center justify-between rounded-xl border border-[#C7D7CF] bg-[#F1F7F2] px-3 py-2.5 text-left text-sm font-semibold text-[#244F49] transition hover:border-[#8BAFA2] hover:bg-[#E7F0EA] dark:border-[#426357] dark:bg-[#20382F] dark:text-[#C7F0DD]"><span className="flex items-center gap-2"><Sparkles size={15} />Remaining credits</span><ChevronRight size={15} className={`transition-transform ${allowanceOpen ? "rotate-90" : ""}`} /></button>{allowanceOpen && <div aria-live="polite" className="mt-2 rounded-xl border border-border bg-card p-3 text-xs leading-5 text-muted-foreground">{usageQuery.isLoading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} />Checking allowance…</span> : usageQuery.isError || !usageQuery.data ? "Your remaining credits are temporarily unavailable. Please try again shortly." : usageQuery.data.unlimited ? <><span className="font-semibold text-foreground">Unlimited access is active.</span><br />Your current pass is covering all generations.</> : <><span className="font-semibold text-foreground">{usageQuery.data.remaining ?? 0} generation credit{usageQuery.data.remaining === 1 ? "" : "s"} remaining.</span><br />Your rolling allowance refreshes after {usageQuery.data.resetsAt ? new Date(usageQuery.data.resetsAt).toLocaleString() : "your oldest recent generation"}.</>}</div>}</div>}
            {isAuthenticated && <div className="mt-7 border-t border-border pt-5"><p className="px-3 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Workspace tools</p><div className="mt-2 space-y-1"><Button variant="ghost" className="w-full justify-start rounded-xl text-sm" onClick={() => setWorkspacePanel("analytics")}><BarChart3 size={16} />Contribution & goals</Button><PromptLibrary onApply={template => { setKind(template.kind); setBrief(template.prompt); setRefinement(""); }} /><Button variant="ghost" className="w-full justify-start rounded-xl text-sm" onClick={() => setWorkspacePanel("sharing")}><Share2 size={16} />Shared prompt reach</Button><Button variant="ghost" className="w-full justify-start rounded-xl text-sm" onClick={() => setWorkspacePanel("payments")}><CreditCard size={16} />Payments & passes</Button><Button variant="ghost" className="w-full justify-start rounded-xl text-sm" onClick={() => setWorkspacePanel("privacy")}><ShieldCheck size={16} />Privacy & data</Button></div><Button size="sm" className="mt-4 w-full rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]" onClick={() => openPayment()}><Sparkles size={15} />Explore passes</Button></div>}
            <div className="mt-8 rounded-2xl border border-[#D8D0BA] bg-[#F6F0E2] p-4 dark:border-[#59635D] dark:bg-[#27332E]"><div className="flex items-center gap-2 text-[#244F49] dark:text-[#CFE7D4]"><LockKeyhole size={15} /><p className="text-xs font-bold">{t("paymentSafe")}</p></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("paymentSafeBody")}</p></div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-7 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#B36935]">{isAuthenticated ? `Welcome back, ${user?.name?.split(" ")[0] ?? "creator"}` : "KAMVAI STUDIO"}</p><h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl">{t("welcome")}</h1><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{t("welcomeBody")}</p>{isAuthenticated && <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden"><Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setShowMobileLibrary(true)}><Archive size={14} />Library</Button><Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setWorkspacePanel("analytics")}><BarChart3 size={14} />Insights</Button><PromptLibrary onApply={template => { setKind(template.kind); setBrief(template.prompt); setRefinement(""); }} triggerClassName="mb-0 h-8 shrink-0 px-3 text-xs" /><Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setWorkspacePanel("sharing")}><Share2 size={14} />Sharing</Button><Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setWorkspacePanel("payments")}><CreditCard size={14} />Payments</Button><Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setWorkspacePanel("privacy")}><ShieldCheck size={14} />Privacy</Button><Button size="sm" className="shrink-0 rounded-full bg-[#244F49] text-white hover:bg-[#173b36]" onClick={() => openPayment()}><Sparkles size={14} />Get a pass</Button></div>}</div>
          {(preferencesQuery.isError || draftsQuery.isError || usageQuery.isError || plansQuery.isError || attemptsQuery.isError || payShapRequestsQuery.isError) && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#D9C98D] bg-[#FEF8DD] p-4 text-sm dark:border-[#766833] dark:bg-[#39331A]"><AlertCircle className="mt-0.5 shrink-0 text-[#A65B26]" size={18} /><p>Some saved workspace details could not be loaded. You can refresh the page to try again; your unsaved brief remains here.</p></div>}
          {isAuthenticated && !preferencesQuery.data?.privacyConsentAt && <div className="mb-6 rounded-2xl border border-[#D9C98D] bg-[#FEF8DD] p-4 dark:border-[#766833] dark:bg-[#39331A]"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#A65B26]" size={18} /><div><p className="font-semibold">{t("consentTitle")}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("consentBody")}</p><Button size="sm" className="mt-3 bg-[#244F49] text-white hover:bg-[#173b36]" onClick={() => preferenceSave.mutate({ acceptPrivacy: true })}>{t("consentAccept")}</Button></div></div></div>}
          <div className="rounded-[1.5rem] border border-border/80 bg-card p-4 shadow-[0_22px_70px_rgba(46,41,30,.07)] sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{kindOptions.map(option => { const Icon = option.icon; const selected = kind === option.value; return <button key={option.value} onClick={() => setKind(option.value)} className={`rounded-2xl border p-3 text-left transition-all ${selected ? "border-[#244F49] bg-[#EAF3EE] shadow-sm dark:bg-[#1E3E39]" : "border-border hover:border-[#AAC3BA] hover:bg-muted/60"}`}><Icon className={selected ? "text-[#244F49] dark:text-[#C7F0DD]" : "text-muted-foreground"} size={18} /><p className="mt-4 text-sm font-semibold">{option.label}</p><p className="mt-1 hidden text-xs leading-4 text-muted-foreground xl:block">{option.description}</p></button>; })}</div>
            <div className="mt-6">{kind === "video" && <div className="mb-5 rounded-2xl border border-[#D9C98D] bg-[#FEF8DD] p-4 dark:border-[#766833] dark:bg-[#39331A]"><div className="flex gap-3"><Video className="mt-0.5 shrink-0 text-[#A65B26]" size={18} /><div><p className="text-sm font-semibold">Video planning workspace</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Kamvai creates a script, shot list, sound direction, and ready-to-use video-generation prompt. It does not render a video file in this workspace yet.</p></div></div></div>}{kind === "code" && <div className="mb-5 rounded-2xl border border-[#C7D7CF] bg-[#F1F7F2] p-4 dark:border-[#426357] dark:bg-[#20382F]"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><label className="text-sm font-semibold" htmlFor="code-stack">Preferred technology stack</label><p className="mt-1 text-xs leading-5 text-muted-foreground">Select a stack or name a custom one. Kamvai will tailor the code, dependencies, and setup guidance accordingly.</p><Select value={codeStack} onValueChange={setCodeStack}><SelectTrigger id="code-stack" className="mt-3 h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent>{codeStackOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>{codeStack === "custom" && <div className="min-w-0 flex-1"><label className="text-sm font-semibold" htmlFor="custom-code-stack">Your stack</label><Input id="custom-code-stack" value={customCodeStack} onChange={event => setCustomCodeStack(event.target.value)} placeholder="e.g. Bun + Hono + SQLite" className="mt-3 h-10 bg-background" maxLength={120} /></div>}</div></div>}<div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold" htmlFor="brief">{activeWorkspaceCopy.inputLabel}</label><div className="flex items-center gap-2">{voiceActive && <span className="flex items-center gap-1.5 text-xs font-medium text-[#B6503A]"><span className="size-2 animate-pulse rounded-full bg-[#B6503A]" />{t("listening")}</span>}<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={voiceActive ? stopVoice : startVoice}>{voiceActive ? <X size={14} /> : <Mic size={14} />}{t("voice")}</Button></div></div><div className="relative"><Textarea id="brief" value={brief} onChange={event => setBrief(event.target.value)} placeholder={activeWorkspaceCopy.placeholder} maxLength={6000} className="min-h-36 resize-y rounded-2xl border-border bg-muted/30 p-4 pb-14 text-base leading-6 focus-visible:ring-[#59857A]" /><div className="absolute inset-x-3 bottom-3 flex items-center justify-between"><div className="flex items-center gap-2">{isAuthenticated && <DocumentUploader />}<span className="text-xs text-muted-foreground">{brief.length.toLocaleString()} / 6,000</span></div><Button disabled={generate.isPending || !brief.trim()} onClick={() => submitGeneration()} className="h-9 rounded-full bg-[#244F49] px-4 text-white hover:bg-[#173b36]">{generate.isPending ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}{generate.isPending ? activeWorkspaceCopy.loadingLabel : activeWorkspaceCopy.actionLabel}</Button></div></div>{isAuthenticated && <AttachedDocumentChips />}</div>
          </div>

          {activeDraft && <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_22px_70px_rgba(46,41,30,.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{activeDraft?.kind === "image" ? "Generated image" : activeDraft?.kind === "video" ? "Video plan" : activeDraft?.kind === "chat" ? "General chat" : t("draftStack")}</p><h2 className="mt-1 font-display text-2xl tracking-tight">{activeDraft?.title ?? t("draftNotSelected")}</h2></div>{activeDraft && <div className="flex gap-1">{activeDraft.kind === "code" && activeDraft.body && <Button size="sm" variant="outline" className="rounded-full" onClick={downloadCodeZip}><Archive size={15} />Download ZIP</Button>}<Button size="icon" variant="ghost" className="rounded-full" onClick={() => share()}><Copy size={16} /></Button><Button size="icon" variant="ghost" className="rounded-full" onClick={() => share("WhatsApp")}><Share2 size={16} /></Button></div>}</div>
            {activeDraft ? <div className="p-5 sm:p-7">{activeDraft.kind === "image" && activeDraft.imageUrl ? <div><img src={activeDraft.imageUrl} alt={activeDraft.prompt} className="max-h-[520px] w-full rounded-2xl object-cover" /><div className="mt-4 flex justify-end"><a href={activeDraft.imageUrl} download className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"><Download size={15} />{t("download")}</a></div></div> : <article className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight"><Streamdown>{activeDraft.body ?? ""}</Streamdown></article>}<div className="mt-7 border-t border-border pt-5"><label className="mb-2 block text-sm font-semibold">{activeDraft.kind === "chat" ? "Ask a follow-up" : activeDraft.kind === "video" ? "Refine video plan" : t("refine")}</label><div className="flex flex-col gap-2 sm:flex-row"><Input value={refinement} onChange={event => setRefinement(event.target.value)} placeholder={activeDraft.kind === "chat" ? "What would you like to ask next?" : activeDraft.kind === "video" ? "What should change in the script or shots?" : t("refinePlaceholder")} className="h-11 rounded-xl" /><Button disabled={generate.isPending || !refinement.trim()} onClick={() => submitGeneration(true)} variant="outline" className="h-11 rounded-xl border-[#9CB9AF] text-[#244F49] dark:text-[#C7F0DD]"><ChevronRight size={16} />{activeDraft.kind === "chat" ? "Ask" : activeDraft.kind === "video" ? "Refine plan" : t("refine")}</Button></div></div><div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-muted-foreground">{t("share")}:</span>{Object.keys(shareLinks("https://kamvai")).map(platform => <Button key={platform} onClick={() => share(platform)} size="sm" variant="ghost" className="rounded-full text-xs">{platform}</Button>)}<Button onClick={() => share()} size="sm" variant="ghost" className="rounded-full text-xs"><Link2 size={14} />{t("copyLink")}</Button></div></div> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted"><Sparkles size={20} className="text-muted-foreground" /></div><p className="mt-4 font-display text-xl">A calm place to begin.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t("noDrafts")}</p></div></div>}
          </div>}
        </section>

        <aside className="hidden" aria-hidden="true"><div className="rounded-[1.4rem] border border-border bg-card p-5 shadow-[0_14px_42px_rgba(46,41,30,.05)]"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{t("freeAllowance")}</p><p className="mt-1 font-display text-2xl">{usageQuery.data?.unlimited ? t("unlimited") : isAuthenticated ? `${usageQuery.data?.remaining ?? 0} ${t("remaining")}` : "—"}</p></div><div className="grid size-10 place-items-center rounded-xl bg-[#EAF3EE] text-[#244F49] dark:bg-[#1E3E39] dark:text-[#C7F0DD]"><Sparkles size={17} /></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#5E8D80]" style={{ width: `${usageQuery.data?.unlimited ? 100 : ((usageQuery.data?.used ?? 0) / (usageQuery.data?.limit ?? 5)) * 100}%` }} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{usageQuery.data?.unlimited ? "Your pass is active." : t("reset")}</p></div>
          <div className="rounded-[1.4rem] bg-[#244F49] p-5 text-[#FAF7EE] shadow-[0_14px_42px_rgba(36,79,73,.20)]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#D7B760]">{t("subscription")}</p><p className="mt-2 font-display text-2xl">Pay by PayShap.</p><p className="mt-2 text-xs leading-5 text-[#D5E3D4]">Create a payment request first. Access remains pending until an authorised reconciliation.</p><div className="mt-5 space-y-2">{(plansQuery.data ?? [{ id: "weekly", name: "Weekly pass", priceZar: 50, days: 7 }, { id: "monthly", name: "Monthly pass", priceZar: 150, days: 30 }]).map(plan => <button key={plan.id} onClick={() => { if (ensureAuthenticated()) { setSelectedPlan(plan.id as "weekly" | "monthly"); setShowPayShap(true); } }} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/8 p-3 text-left transition hover:bg-white/14"><div><p className="text-sm font-semibold">{t(plan.id)}</p><p className="mt-0.5 text-xs text-[#D5E3D4]">{plan.days} {t("days")}</p></div><span className="font-display text-xl">R{plan.priceZar}</span></button>)}</div><p className="mt-4 text-xs leading-5 text-[#D5E3D4]">A reference or proof alone never unlocks an account.</p></div>
          <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">{t("draftStack")}</p><div className="mt-4 space-y-3">{draftsQuery.data?.slice(0, 3).map(draft => <button key={draft.id} onClick={() => setActiveDraftId(draft.id)} className="block w-full text-left"><p className="truncate text-sm font-medium">{draft.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(draft.updatedAt).toLocaleDateString()} · {draft.kind}</p></button>) ?? <p className="text-sm text-muted-foreground">{t("noDrafts")}</p>}</div></div>
          {isAuthenticated && <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Voucher activity</p><div className="mt-4 space-y-3">{attemptsQuery.data?.length ? attemptsQuery.data.slice(0, 3).map(attempt => <div key={attempt.id} className="flex items-center justify-between gap-3 text-xs"><div><p className="font-semibold capitalize">{attempt.plan} · {attempt.voucherBrand}</p><p className="mt-1 text-muted-foreground">{attempt.maskedVoucherCode}</p></div><span className={`rounded-full px-2 py-1 font-semibold capitalize ${attempt.status === "confirmed" ? "bg-[#EAF3EE] text-[#244F49]" : attempt.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{attempt.status}</span></div>) : <p className="text-sm leading-6 text-muted-foreground">No voucher requests yet. Your code stays masked after submission.</p>}</div></div>}
          {isAuthenticated && <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">PayShap requests</p><div className="mt-4 space-y-3">{payShapRequestsQuery.data?.length ? payShapRequestsQuery.data.slice(0, 3).map(request => <div key={request.id} className="flex items-center justify-between gap-3 text-xs"><div><p className="font-semibold">{request.paymentReference}</p><p className="mt-1 text-muted-foreground">R{(request.amountCents / 100).toFixed(2)} · expires {new Date(request.expiresAt).toLocaleDateString()}</p></div><span className={`rounded-full px-2 py-1 font-semibold capitalize ${request.status === "confirmed" ? "bg-[#EAF3EE] text-[#244F49]" : request.status === "rejected" || request.status === "expired" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{request.status}</span></div>) : <p className="text-sm leading-6 text-muted-foreground">No PayShap requests yet.</p>}</div></div>}
          {isAuthenticated && <div className="rounded-[1.4rem] border border-border bg-card p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Privacy & data</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Request the deletion of your Kamvai account data. We will review and process this request under the published privacy policy.</p>{deletionStatusQuery.data ? <div className="mt-4 rounded-xl bg-muted p-3 text-xs"><p className="font-semibold capitalize">Request status: {deletionStatusQuery.data.status.replace("_", " ")}</p><p className="mt-1 text-muted-foreground">Requested {new Date(deletionStatusQuery.data.requestedAt).toLocaleDateString()}</p></div> : <Button size="sm" disabled={requestDeletion.isPending} onClick={() => { if (window.confirm("Request deletion of your Kamvai account data? This starts a review and does not immediately remove your account.")) requestDeletion.mutate(); }} className="mt-4 bg-[#244F49] text-white hover:bg-[#173b36]">{requestDeletion.isPending ? <Loader2 className="animate-spin" /> : <LockKeyhole size={14} />}Request account deletion</Button>}</div>}
          {user?.role === "admin" && <div className="rounded-[1.4rem] border border-[#C6D6CF] bg-[#F1F7F2] p-5 dark:border-[#426357] dark:bg-[#20382F]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Admin reconciliation</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Confirm only after matching the actual bank credit and payment reference.</p><div className="mt-4 space-y-3">{adminPayShapQuery.data?.length ? adminPayShapQuery.data.slice(0, 4).map(request => <div key={request.id} className="rounded-xl border border-border bg-card/75 p-3 text-xs"><p className="font-semibold">{request.paymentReference} · R{(request.amountCents / 100).toFixed(2)}</p><p className="mt-1 text-muted-foreground">{request.plan}</p><div className="mt-3 flex gap-2"><Button size="sm" disabled={reconcilePayShap.isPending} onClick={() => reconcilePayShap.mutate({ requestId: request.id, outcome: "confirmed" })} className="h-7 bg-[#244F49] px-2 text-xs">Confirm</Button><Button size="sm" variant="outline" disabled={reconcilePayShap.isPending} onClick={() => reconcilePayShap.mutate({ requestId: request.id, outcome: "rejected" })} className="h-7 px-2 text-xs">Reject</Button></div></div>) : <p className="text-sm leading-6 text-muted-foreground">No pending PayShap requests.</p>}</div></div>}
          {user?.role === "admin" && <div className="rounded-[1.4rem] border border-[#C6D6CF] bg-[#F1F7F2] p-5 dark:border-[#426357] dark:bg-[#20382F]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Deletion review</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Move a request to review, then only mark completed after the approved deletion process is finished.</p><div className="mt-4 space-y-3">{adminDeletionQuery.data?.length ? adminDeletionQuery.data.slice(0, 4).map(request => <div key={request.id} className="rounded-xl border border-border bg-card/75 p-3 text-xs"><p className="font-semibold">Request {request.id.slice(0, 8)}</p><p className="mt-1 text-muted-foreground">Requested {new Date(request.requestedAt).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={resolveDeletion.isPending} onClick={() => resolveDeletion.mutate({ requestId: request.id, outcome: "in_review" })} className="h-7 bg-[#244F49] px-2 text-xs">Review</Button><Button size="sm" variant="outline" disabled={resolveDeletion.isPending} onClick={() => resolveDeletion.mutate({ requestId: request.id, outcome: "completed" })} className="h-7 px-2 text-xs">Complete</Button><Button size="sm" variant="outline" disabled={resolveDeletion.isPending} onClick={() => resolveDeletion.mutate({ requestId: request.id, outcome: "declined" })} className="h-7 px-2 text-xs">Decline</Button></div></div>) : <p className="text-sm leading-6 text-muted-foreground">No pending deletion requests.</p>}</div></div>}
        </aside>
      </main>

      <footer className="border-t border-[#D8D0BA] bg-[#F6F0E2]/75 py-8 dark:border-[#44554D] dark:bg-[#1C2C26]/70">
        <div className="container">
          <div className="flex flex-col gap-5 rounded-[1.5rem] border border-[#D8D0BA] bg-background/75 p-5 shadow-[0_12px_35px_rgba(46,41,30,.04)] sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-[#4A5D54]">
            <div className="flex max-w-3xl gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF3EE] text-[#244F49] dark:bg-[#1E3E39] dark:text-[#C7F0DD]"><LockKeyhole size={18} /></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">POPIA privacy &amp; data rights</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Kamvai uses your account, preference, and draft data only to provide this workspace and its requested features. You can request account-data deletion at any time; requests are reviewed through the privacy process before they are completed.</p>
              </div>
            </div>
            {isAuthenticated ? deletionStatusQuery.data ? <div className="rounded-xl bg-muted px-4 py-3 text-xs"><p className="font-semibold capitalize">Deletion request: {deletionStatusQuery.data.status.replace("_", " ")}</p><p className="mt-1 text-muted-foreground">Your request is being handled through the privacy workflow.</p></div> : <Button disabled={requestDeletion.isPending} onClick={() => { if (window.confirm("Request deletion of your Kamvai account data? This starts a review and does not immediately remove your account.")) requestDeletion.mutate(); }} className="shrink-0 rounded-full bg-[#244F49] text-white hover:bg-[#173b36]">{requestDeletion.isPending ? <Loader2 className="animate-spin" size={15} /> : <LockKeyhole size={15} />}Request data deletion</Button> : <Button variant="outline" onClick={ensureAuthenticated} className="shrink-0 rounded-full">Sign in to manage your data</Button>}
          </div>
        </div>
      </footer>

      <Dialog open={showMobileLibrary} onOpenChange={setShowMobileLibrary}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle className="font-display text-3xl">Your Library</DialogTitle><DialogDescription>Open a saved draft when you want to continue it. New chats stay clear until you choose one.</DialogDescription></DialogHeader><div className="space-y-2 pt-3">{draftsQuery.data?.length ? draftsQuery.data.map(draft => <button key={draft.id} onClick={() => { setActiveDraftId(draft.id); setShowMobileLibrary(false); }} className="w-full rounded-xl border border-border p-3 text-left transition hover:border-[#8BAFA2] hover:bg-muted/50"><p className="truncate text-sm font-semibold">{draft.title}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{draft.kind} · {new Date(draft.updatedAt).toLocaleDateString()}</p></button>) : <p className="rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">No saved drafts yet. Generate something new and it will appear here.</p>}</div><Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => { startNewDraft(); setShowMobileLibrary(false); }}><Plus size={15} />New draft</Button></DialogContent></Dialog>
      <Dialog open={workspacePanel !== null} onOpenChange={open => { if (!open) setWorkspacePanel(null); }}><DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle className="font-display text-3xl">{workspacePanel === "analytics" ? "Contribution, goals & streaks" : workspacePanel === "sharing" ? "Shared prompt reach" : workspacePanel === "payments" ? "Payments & passes" : "Privacy & data"}</DialogTitle><DialogDescription>{workspacePanel === "analytics" ? "Review your momentum and adjust your weekly generation goal without interrupting your current chat." : workspacePanel === "sharing" ? "See which shared custom prompts are connecting with people." : workspacePanel === "payments" ? "Choose a pass, create a PayShap request, and follow its status in one place." : "Manage your data rights and review any account-deletion request."}</DialogDescription></DialogHeader>{workspacePanel === "analytics" && <ContributionAnalytics />}{workspacePanel === "sharing" && <SharedPromptLeaderboard />}{workspacePanel === "payments" && <div className="space-y-5 pt-3"><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => openPayment("weekly")} className="rounded-2xl border border-[#C7D7CF] bg-[#F1F7F2] p-5 text-left transition hover:border-[#244F49] dark:border-[#426357] dark:bg-[#20382F]"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#B36935]">Weekly pass</p><p className="mt-2 font-display text-3xl">R50</p><p className="mt-2 text-sm text-muted-foreground">7 days of unlimited creation.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#244F49] dark:text-[#C7F0DD]">Choose weekly <ChevronRight size={15} /></span></button><button onClick={() => openPayment("monthly")} className="rounded-2xl border border-[#244F49] bg-[#244F49] p-5 text-left text-[#FAF7EE] transition hover:bg-[#173b36]"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#D7B760]">Monthly pass</p><p className="mt-2 font-display text-3xl">R150</p><p className="mt-2 text-sm text-[#D5E3D4]">30 days of unlimited creation.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Choose monthly <ChevronRight size={15} /></span></button></div><div className="rounded-2xl border border-border bg-muted/30 p-4"><p className="text-sm font-semibold">Recent PayShap requests</p>{payShapRequestsQuery.data?.length ? <div className="mt-3 space-y-2">{payShapRequestsQuery.data.slice(0, 4).map(request => <div key={request.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-mono text-xs">{request.paymentReference}</span><span className="capitalize text-muted-foreground">{request.status}</span></div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">No PayShap requests yet.</p>}</div></div>}{workspacePanel === "privacy" && <div className="pt-3"><p className="text-sm leading-6 text-muted-foreground">You can request deletion of your Kamvai account data. Requests are reviewed before any records are removed.</p>{deletionStatusQuery.data ? <div className="mt-4 rounded-xl bg-muted p-4 text-sm"><p className="font-semibold capitalize">Request status: {deletionStatusQuery.data.status.replace("_", " ")}</p><p className="mt-1 text-muted-foreground">Requested {new Date(deletionStatusQuery.data.requestedAt).toLocaleDateString()}</p></div> : <Button disabled={requestDeletion.isPending} onClick={() => { if (window.confirm("Request deletion of your Kamvai account data? This starts a review and does not immediately remove your account.")) requestDeletion.mutate(); }} className="mt-5 bg-[#244F49] text-white hover:bg-[#173b36]">{requestDeletion.isPending ? <Loader2 className="animate-spin" /> : <LockKeyhole size={14} />}Request account deletion</Button>}</div>}</DialogContent></Dialog>
      <Dialog open={showPayShap} onOpenChange={setShowPayShap}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-display text-3xl">Pay with PayShap</DialogTitle><DialogDescription className="leading-6">Create a unique request, pay using the exact reference, then wait for reconciliation. Payment references never unlock a pass by themselves.</DialogDescription></DialogHeader>{requestPayShap.data?.request ? <div className="space-y-4 pt-2"><div className="rounded-2xl border border-[#C7D7CF] bg-[#EEF6F0] p-4 dark:border-[#456258] dark:bg-[#20382F]"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#B36935]">Exact payment reference</p><p className="mt-2 font-mono text-xl font-bold tracking-wide">{requestPayShap.data.request.paymentReference}</p><p className="mt-2 text-sm text-muted-foreground">Amount: <strong>R{(requestPayShap.data.request.amountCents / 100).toFixed(2)}</strong> · expires {new Date(requestPayShap.data.request.expiresAt).toLocaleString()}</p></div>{requestPayShap.data.paymentInstructionsConfigured ? <div className="space-y-2 text-sm"><p>Recipient: <strong>{requestPayShap.data.recipientName}</strong></p><p>ShapID: <strong className="font-mono">{requestPayShap.data.shapId}</strong></p><Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`PayShap to ${requestPayShap.data!.recipientName} · ShapID ${requestPayShap.data!.shapId} · R${(requestPayShap.data!.request.amountCents / 100).toFixed(2)} · reference ${requestPayShap.data!.request.paymentReference}`).then(() => toast.success("PayShap details copied."))}><Copy size={14} />Copy payment details</Button></div> : <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">The merchant ShapID has not been configured yet. Do not make a payment until Kamvai provides the recipient details.</p>}<p className="text-xs leading-5 text-muted-foreground">Never send a voucher code or confidential banking details to Kamvai. Only an authorised reconciliation confirms the pass.</p></div> : <div className="space-y-4 pt-2"><div className="grid grid-cols-2 gap-2"><Button variant={selectedPlan === "weekly" ? "default" : "outline"} onClick={() => setSelectedPlan("weekly")} className={selectedPlan === "weekly" ? "bg-[#244F49]" : ""}>Weekly · R50</Button><Button variant={selectedPlan === "monthly" ? "default" : "outline"} onClick={() => setSelectedPlan("monthly")} className={selectedPlan === "monthly" ? "bg-[#244F49]" : ""}>Monthly · R150</Button></div><Button disabled={requestPayShap.isPending} onClick={() => requestPayShap.mutate({ plan: selectedPlan })} className="w-full bg-[#244F49] hover:bg-[#173b36]">{requestPayShap.isPending ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}Create PayShap request</Button></div>}</DialogContent></Dialog> 
      <Dialog open={showEmailAuth} onOpenChange={open => { setShowEmailAuth(open); if (!open) setOtpRequested(false); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-display text-3xl">{emailMode === "signup" ? "Join Kamvai" : "Welcome back"}</DialogTitle><DialogDescription className="leading-6">{emailMode === "signup" ? "Create a verified email account to save your drafts, preferences, and access." : "Sign in with your verified email account."}</DialogDescription></DialogHeader><div className="space-y-4 pt-2">{emailMode === "signup" && !otpRequested && <Input autoComplete="given-name" value={emailFirstName} onChange={event => setEmailFirstName(event.target.value)} placeholder="First name (optional)" />}{!otpRequested && <><Input autoComplete="email" type="email" value={emailAddress} onChange={event => setEmailAddress(event.target.value)} placeholder="Email address" /><Input autoComplete={emailMode === "signup" ? "new-password" : "current-password"} type="password" value={emailPassword} onChange={event => setEmailPassword(event.target.value)} placeholder="Password" />{emailMode === "signup" && <p className="text-xs leading-5 text-muted-foreground">Use at least 12 characters. We will email a six-digit verification code before activating your account.</p>}</>}{otpRequested && <><Input autoFocus inputMode="numeric" maxLength={6} value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit verification code" /><p className="text-xs leading-5 text-muted-foreground">The code expires after 10 minutes. Your code is never retained in plain text.</p></>}<Button disabled={requestSignupOtp.isPending || verifySignupOtp.isPending || emailLogin.isPending || !emailAddress || !emailPassword || (otpRequested && otpCode.length !== 6)} onClick={submitEmailAuth} className="w-full bg-[#244F49] hover:bg-[#173b36]">{requestSignupOtp.isPending || verifySignupOtp.isPending || emailLogin.isPending ? <Loader2 className="animate-spin" /> : <Mail size={16} />}{emailMode === "signup" ? (otpRequested ? "Verify email" : "Send verification code") : "Sign in"}</Button>{!otpRequested && <button className="w-full text-center text-sm font-medium text-[#244F49] underline underline-offset-4 dark:text-[#C7F0DD]" onClick={() => setEmailMode(mode => mode === "signup" ? "login" : "signup")}>{emailMode === "signup" ? "Already verified? Sign in" : "New here? Create an account"}</button>}<div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:border-t before:border-border"><span className="relative bg-card px-2">or</span></div><Button variant="outline" onClick={() => startLogin()} className="w-full">Continue with secure single sign-on</Button></div></DialogContent></Dialog>
    </div>
  );
}
