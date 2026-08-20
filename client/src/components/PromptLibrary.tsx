import { useMemo, useState } from "react";
import { BookOpen, Check, Heart, RefreshCw, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type PromptKind = "blog" | "email" | "code" | "image";

export function PromptLibrary({ onApply }: { onApply: (template: { prompt: string; kind: PromptKind; title: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | PromptKind>("all");
  const utils = trpc.useUtils();
  const input = useMemo(() => ({ query: query || undefined, kind: kind === "all" ? undefined : kind }), [query, kind]);
  const libraryQuery = trpc.promptLibrary.list.useQuery(input, { enabled: open });
  const toggleFavorite = trpc.promptLibrary.toggleFavorite.useMutation({
    onSuccess: () => utils.promptLibrary.list.invalidate(),
    onError: error => toast.error(error.message || "We could not update this favourite."),
  });
  const prompts = libraryQuery.data ?? [];

  function apply(prompt: typeof prompts[number]) {
    onApply({ title: prompt.title, kind: prompt.kind, prompt: prompt.body });
    setOpen(false);
    toast.success(`Applied “${prompt.title}” to your brief.`);
  }

  return (
    <>
      <Button variant="outline" className="mb-4 rounded-full border-[#9CB9AF] text-[#244F49] dark:text-[#C7F0DD]" onClick={() => setOpen(true)}>
        <BookOpen size={16} />
        Prompt Library
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">Smart Prompt Library</DialogTitle>
            <DialogDescription>Browse reliable starters, save favourites, and apply one directly to the generator.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search prompts, categories, or outcomes" className="pl-9" />
            </div>
            <Select value={kind} onValueChange={value => setKind(value as "all" | PromptKind)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {libraryQuery.isLoading ? (
            <div className="grid gap-3 py-6 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div>
          ) : libraryQuery.isError ? (
            <div className="grid place-items-center py-14 text-center">
              <div>
                <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#FBEDE6] text-[#B6503A] dark:bg-[#4A2A22]"><RefreshCw size={19} /></div>
                <p className="mt-3 font-semibold">Your prompt library could not load</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your current brief is safe. Please try again in a moment.</p>
                <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => libraryQuery.refetch()}><RefreshCw size={14} />Try again</Button>
              </div>
            </div>
          ) : prompts.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {prompts.map(prompt => (
                <article key={prompt.id} className="group rounded-2xl border border-border bg-card p-4 transition hover:border-[#8BAFA2] hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{prompt.category} · {prompt.kind}</span>
                      <h3 className="mt-3 font-semibold">{prompt.title}</h3>
                    </div>
                    <Button aria-label={`${prompt.isFavorite ? "Remove" : "Save"} ${prompt.title} favourite`} size="icon" variant="ghost" onClick={() => toggleFavorite.mutate({ promptId: prompt.id })} className={prompt.isFavorite ? "text-[#C66A48]" : "text-muted-foreground"}>
                      <Heart size={17} fill={prompt.isFavorite ? "currentColor" : "none"} />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{prompt.body.slice(0, 110)}{prompt.body.length > 110 ? "…" : ""}</p>
                  <p className="mt-3 line-clamp-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">{prompt.body}</p>
                  <Button size="sm" onClick={() => apply(prompt)} className="mt-4 w-full rounded-xl bg-[#244F49] text-white hover:bg-[#173b36]"><Sparkles size={14} />Use this prompt</Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-14 text-center">
              <div>
                <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted"><Check size={19} className="text-muted-foreground" /></div>
                <p className="mt-3 font-semibold">No prompt matches yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different format or a broader search.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
