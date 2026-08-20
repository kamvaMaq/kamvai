import { Link, useRoute } from "wouter";
import { BookOpen, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function SharedPrompt() {
  const [, params] = useRoute("/prompt/:slug");
  const promptQuery = trpc.promptLibrary.public.useQuery({ slug: params?.slug ?? "" }, { enabled: Boolean(params?.slug) });
  if (promptQuery.isLoading) return <main className="grid min-h-screen place-items-center bg-[#FCF9F2] text-[#244F49]"><p>Loading shared prompt…</p></main>;
  if (!promptQuery.data) return <main className="grid min-h-screen place-items-center bg-[#FCF9F2] p-6 text-center text-[#244F49]"><div><BookOpen className="mx-auto" /><h1 className="mt-4 font-display text-4xl">This prompt is not available</h1><p className="mt-2 text-muted-foreground">The owner may have revoked its share link.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-[#244F49] px-4 py-2 text-white">Open Kamvai</Link></div></main>;
  const prompt = promptQuery.data;
  return <main className="min-h-screen bg-[#FCF9F2] px-5 py-12 text-[#244F49]"><article className="mx-auto max-w-2xl rounded-3xl border border-[#D7E2D9] bg-white p-6 shadow-sm sm:p-10"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#B06D3F]"><Sparkles size={14} />Shared Kamvai prompt</div><h1 className="mt-4 font-display text-4xl">{prompt.title}</h1><p className="mt-3 text-sm text-muted-foreground">{prompt.category} · {prompt.kind}</p><pre className="mt-7 whitespace-pre-wrap rounded-2xl bg-[#F1F7F2] p-5 font-sans text-sm leading-6 text-[#244F49]">{prompt.body}</pre><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#244F49] px-4 py-2 text-white"><Sparkles size={15} />Try it in Kamvai</Link></article></main>;
}
