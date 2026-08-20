import React, { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Copy, Eye, Heart, Link2, Pencil, Plus, RefreshCw, Search, Sparkles, Tag, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type PromptKind = "blog" | "email" | "code" | "image";
type PromptLocale = "en" | "zu" | "xh";
type PromptView = "library" | "mine";
type PromptCard = {
  id: string;
  title: string;
  body: string;
  kind: PromptKind;
  category: string;
  tags: string[];
  isFavorite: boolean;
  isOwned: boolean;
  shareSlug: string | null;
  viewCount: number;
};

const blankPrompt = { title: "", category: "Business", kind: "blog" as PromptKind, body: "" };

export function promptForGenerator(prompt: { title: string; kind: PromptKind; body: string }) {
  return { title: prompt.title, kind: prompt.kind, prompt: prompt.body };
}

function EmptyPromptState({ title, message }: { title: string; message: string }) {
  return <div className="grid place-items-center py-12 text-center"><div>
    <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted"><Check size={19} className="text-muted-foreground" /></div>
    <p className="mt-3 font-semibold">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{message}</p>
  </div></div>;
}

export function PromptLibrary({ onApply, triggerClassName = "" }: { onApply: (template: { prompt: string; kind: PromptKind; title: string }) => void; triggerClassName?: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PromptView>("library");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | PromptKind>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState(blankPrompt);
  const [editingId, setEditingId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const locale: PromptLocale = i18n.language === "zu" || i18n.language === "xh" ? i18n.language : "en";
  const input = useMemo(() => ({
    query: query || undefined,
    kind: kind === "all" ? undefined : kind,
    locale,
    favoritesOnly: view === "library" && favoritesOnly,
  }), [query, kind, locale, favoritesOnly, view]);
  const libraryQuery = trpc.promptLibrary.list.useQuery(input, { enabled: open });
  const invalidate = () => utils.promptLibrary.list.invalidate();
  const toggleFavorite = trpc.promptLibrary.toggleFavorite.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message || "We could not update this favourite.") });
  const createPrompt = trpc.promptLibrary.create.useMutation({ onSuccess: () => { setEditor(blankPrompt); invalidate(); toast.success("Custom prompt saved to My Prompts."); }, onError: error => toast.error(error.message || "We could not save that prompt.") });
  const updatePrompt = trpc.promptLibrary.update.useMutation({ onSuccess: () => { setEditor(blankPrompt); setEditingId(null); invalidate(); toast.success("Custom prompt updated."); }, onError: error => toast.error(error.message || "We could not update that prompt.") });
  const removePrompt = trpc.promptLibrary.remove.useMutation({ onSuccess: () => { setEditingId(null); setEditor(blankPrompt); invalidate(); toast.success("Custom prompt removed."); }, onError: error => toast.error(error.message || "We could not remove that prompt.") });
  const setTags = trpc.promptLibrary.setTags.useMutation({ onSuccess: () => { invalidate(); toast.success("Tags saved."); }, onError: error => toast.error(error.message || "We could not save those tags.") });
  const sharePrompt = trpc.promptLibrary.share.useMutation({ onSuccess: ({ slug }) => { void copyShareLink(slug); invalidate(); }, onError: error => toast.error(error.message || "We could not create a share link.") });
  const revokeShare = trpc.promptLibrary.revokeShare.useMutation({ onSuccess: () => { invalidate(); toast.success("Share link revoked."); }, onError: error => toast.error(error.message || "We could not revoke that link.") });
  const prompts = (libraryQuery.data ?? []) as PromptCard[];
  const libraryPrompts = favoritesOnly ? prompts : prompts.filter(prompt => !prompt.isOwned);
  const myPrompts = prompts.filter(prompt => prompt.isOwned);
  const tagOptions = Array.from(new Set(myPrompts.flatMap(prompt => prompt.tags))).sort();
  const filteredMyPrompts = selectedTag ? myPrompts.filter(prompt => prompt.tags.includes(selectedTag)) : myPrompts;

  async function copyShareLink(slug: string) {
    const link = `${window.location.origin}/prompt/${slug}`;
    try { await navigator.clipboard.writeText(link); toast.success("Share link copied."); }
    catch { toast.error("We could not copy the link. Please copy it from the browser address bar."); }
  }

  function apply(prompt: PromptCard) {
    onApply(promptForGenerator(prompt));
    setOpen(false);
    toast.success(`Applied “${prompt.title}” to your brief.`);
  }

  function edit(prompt: PromptCard) {
    setEditingId(prompt.id);
    setEditor({ title: prompt.title, category: prompt.category, kind: prompt.kind, body: prompt.body });
    setView("mine");
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = { ...editor, title: editor.title.trim(), category: editor.category.trim(), body: editor.body.trim() };
    if (editingId) updatePrompt.mutate({ promptId: editingId, ...data });
    else createPrompt.mutate(data);
  }

  function saveTags(prompt: PromptCard) {
    const raw = tagDrafts[prompt.id] ?? prompt.tags.join(", ");
    setTags.mutate({ promptId: prompt.id, tags: raw.split(",").map(tag => tag.trim()).filter(Boolean) });
  }

  function PromptCardView({ prompt, management = false }: { prompt: PromptCard; management?: boolean }) {
    return <article className="rounded-2xl border border-border bg-card p-4 transition hover:border-[#8BAFA2] hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{prompt.category} · {prompt.kind}</span>
          <h3 className="mt-3 font-semibold">{prompt.title}</h3>
        </div>
        <Button aria-label={`${prompt.isFavorite ? "Remove" : "Save"} ${prompt.title} favourite`} size="icon" variant="ghost" onClick={() => toggleFavorite.mutate({ promptId: prompt.id })} className={prompt.isFavorite ? "text-[#C66A48]" : "text-muted-foreground"}>
          <Heart size={17} fill={prompt.isFavorite ? "currentColor" : "none"} />
        </Button>
      </div>
      <p className="mt-3 line-clamp-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">{prompt.body}</p>
      {!management ? <Button size="sm" onClick={() => apply(prompt)} className="mt-4 w-full rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]"><Sparkles size={14} />Use this prompt</Button> : <>
        <div className="mt-3 flex flex-wrap gap-1.5">{prompt.tags.map(tag => <span key={tag} className="rounded-full bg-[#E4F0E8] px-2 py-1 text-[10px] font-semibold text-[#244F49] dark:bg-[#29483D] dark:text-[#D4F5E0]">#{tag}</span>)}</div>
        <div className="mt-3 flex gap-2">
          <Input aria-label={`Tags for ${prompt.title}`} value={tagDrafts[prompt.id] ?? prompt.tags.join(", ")} onChange={event => setTagDrafts(current => ({ ...current, [prompt.id]: event.target.value }))} placeholder="Tags, comma-separated" maxLength={280} className="h-9 text-xs" />
          <Button size="sm" variant="outline" className="h-9 rounded-xl" disabled={setTags.isPending} onClick={() => saveTags(prompt)}><Tag size={14} />Save</Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button size="sm" className="rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]" onClick={() => apply(prompt)}><Sparkles size={14} />Use</Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => edit(prompt)}><Pencil size={14} />Edit</Button>
          <Button size="sm" variant="outline" className="rounded-xl text-destructive hover:text-destructive" disabled={removePrompt.isPending} onClick={() => removePrompt.mutate({ promptId: prompt.id })}><Trash2 size={14} />Delete</Button>
        </div>
        {prompt.shareSlug ? <div className="mt-3 rounded-xl border border-[#D7E2D9] bg-[#F7FBF7] px-3 py-2 dark:border-[#426357] dark:bg-[#20382F]">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#244F49] dark:text-[#D4F5E0]"><Eye size={14} />{prompt.viewCount} {prompt.viewCount === 1 ? "view" : "views"} · anonymous reach</p>
          <div className="mt-2 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" className="rounded-xl" onClick={() => void copyShareLink(prompt.shareSlug!)}><Copy size={14} />Copy link</Button><Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" disabled={revokeShare.isPending} onClick={() => revokeShare.mutate({ promptId: prompt.id })}><X size={14} />Revoke</Button></div>
        </div> : <Button size="sm" variant="outline" className="mt-3 w-full rounded-xl" disabled={sharePrompt.isPending} onClick={() => sharePrompt.mutate({ promptId: prompt.id })}><Link2 size={14} />Create share link</Button>}
      </>}
    </article>;
  }

  const cards = (items: PromptCard[], management = false) => items.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(prompt => <PromptCardView key={prompt.id} prompt={prompt} management={management} />)}</div> : <EmptyPromptState title={management ? "No custom prompts yet" : favoritesOnly ? "No favourites yet" : "No prompt matches yet"} message={management ? "Create a reusable template to keep your best ideas close." : "Try a different format or a broader search."} />;

  return <>
    <Button variant="outline" className={`mb-4 rounded-full border-[#9CB9AF] text-[#244F49] dark:text-[#C7F0DD] ${triggerClassName}`} onClick={() => setOpen(true)}><BookOpen size={16} />Prompt Library</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle className="font-display text-3xl">Smart Prompt Library</DialogTitle><DialogDescription>{locale === "zu" ? "Qala ngemiyalelo ebhalwe ngesiZulu, noma ulondoloze awakho amathuluzi." : locale === "xh" ? "Qala ngezikhokelo ezibhalwe ngesiXhosa, okanye ugcine ezakho iitemplate." : "Browse reliable starters, save favourites, and manage your own reusable templates."}</DialogDescription></DialogHeader>
      <div className="mt-2 flex flex-wrap gap-2 border-b border-border pb-4"><Button size="sm" variant={view === "library" ? "default" : "outline"} className={view === "library" ? "rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]" : "rounded-xl"} onClick={() => setView("library")}><BookOpen size={14} />Starter library</Button><Button size="sm" variant={view === "mine" ? "default" : "outline"} className={view === "mine" ? "rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]" : "rounded-xl"} onClick={() => setView("mine")}><Plus size={14} />My Prompts</Button></div>
      {view === "library" ? <>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search prompts, categories, or outcomes" className="pl-9" /></div><Select value={kind} onValueChange={value => setKind(value as "all" | PromptKind)}><SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All formats</SelectItem><SelectItem value="blog">Blog</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="code">Code</SelectItem><SelectItem value="image">Image</SelectItem></SelectContent></Select><Button variant={favoritesOnly ? "default" : "outline"} aria-pressed={favoritesOnly} className={favoritesOnly ? "rounded-xl bg-[#C66A48] text-white hover:bg-[#A95137]" : "rounded-xl"} onClick={() => setFavoritesOnly(value => !value)}><Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} />Favourites</Button></div>
        {libraryQuery.isLoading ? <div className="grid gap-3 py-6 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div> : libraryQuery.isError ? <div className="grid place-items-center py-14 text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#FBEDE6] text-[#B6503A] dark:bg-[#4A2A22]"><RefreshCw size={19} /></div><p className="mt-3 font-semibold">Your prompt library could not load</p><Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => libraryQuery.refetch()}><RefreshCw size={14} />Try again</Button></div></div> : cards(libraryPrompts)}
      </> : <>
        <form onSubmit={submitPrompt} className="mt-4 rounded-2xl border border-[#C7D7CF] bg-[#F1F7F2] p-4 dark:border-[#426357] dark:bg-[#20382F]"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{editingId ? "Edit custom prompt" : "Create a custom prompt"}</h3><p className="mt-1 text-sm text-muted-foreground">Only you can edit, tag, share, or delete these templates.</p></div>{editingId && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditor(blankPrompt); }}>Cancel edit</Button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input value={editor.title} onChange={event => setEditor(current => ({ ...current, title: event.target.value }))} placeholder="Prompt title" maxLength={120} required /><Input value={editor.category} onChange={event => setEditor(current => ({ ...current, category: event.target.value }))} placeholder="Category, e.g. Sales" maxLength={64} required /><Select value={editor.kind} onValueChange={value => setEditor(current => ({ ...current, kind: value as PromptKind }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blog">Blog</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="code">Code</SelectItem><SelectItem value="image">Image</SelectItem></SelectContent></Select></div><Textarea value={editor.body} onChange={event => setEditor(current => ({ ...current, body: event.target.value }))} placeholder="Write the reusable instruction you want Kamvai to follow…" className="mt-3 min-h-28 bg-background" maxLength={6000} required /><div className="mt-3 flex justify-end"><Button type="submit" disabled={createPrompt.isPending || updatePrompt.isPending} className="rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]"><Plus size={15} />{editingId ? "Save changes" : "Save prompt"}</Button></div></form>
        {tagOptions.length ? <div className="mt-4 flex flex-wrap items-center gap-2"><Tag size={15} className="text-muted-foreground" /><Button size="sm" variant={!selectedTag ? "default" : "outline"} className={!selectedTag ? "rounded-full bg-[#244F49] text-white hover:bg-[#173b36]" : "rounded-full"} onClick={() => setSelectedTag("")}>All tags</Button>{tagOptions.map(tag => <Button key={tag} size="sm" variant={selectedTag === tag ? "default" : "outline"} className={selectedTag === tag ? "rounded-full bg-[#244F49] text-white hover:bg-[#173b36]" : "rounded-full"} onClick={() => setSelectedTag(tag)}>#{tag}</Button>)}</div> : null}
        {libraryQuery.isLoading ? <div className="mt-5 h-40 animate-pulse rounded-2xl bg-muted" /> : libraryQuery.isError ? <div className="mt-5 rounded-2xl border border-destructive/30 p-5 text-sm text-muted-foreground">Your custom prompts could not load. <Button variant="link" className="h-auto p-0" onClick={() => libraryQuery.refetch()}>Try again</Button></div> : cards(filteredMyPrompts, true)}
      </>}
    </DialogContent></Dialog>
  </>;
}
