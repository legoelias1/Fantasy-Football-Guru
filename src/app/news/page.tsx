import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBreakingNews } from "@/lib/news";

export default async function NewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let news: Awaited<ReturnType<typeof getBreakingNews>> = [];
  let error: string | null = null;
  try {
    news = await getBreakingNews();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load news";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Breaking News</h1>
      <p className="mb-8 text-black/60 dark:text-white/60">News from around the league</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4">
        {news.map((item, i) => {
          const body = (
            <>
              <h2 className="font-semibold">{item.headline}</h2>
              <p className="mt-1 text-sm text-black/70 dark:text-white/70">{item.summary}</p>
              {item.source && (
                <p className="mt-2 text-xs text-black/50 underline dark:text-white/50">
                  {item.source}
                </p>
              )}
            </>
          );

          return item.url ? (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded border border-black/10 p-4 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              {body}
            </a>
          ) : (
            <article key={i} className="rounded border border-black/10 p-4 dark:border-white/10">
              {body}
            </article>
          );
        })}
        {!news.length && !error && (
          <p className="text-sm text-black/50 dark:text-white/50">No news found right now.</p>
        )}
      </div>
    </div>
  );
}
