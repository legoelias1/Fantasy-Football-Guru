import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Draft smarter with 25 years of fantasy football history.
      </h1>
      <p className="text-lg text-black/70 dark:text-white/70">
        Set up your league, ask a draft question, and get advice grounded in real historical
        outcomes — not generic rankings — tailored to redraft or dynasty strategy and your draft
        position.
      </p>
      <div className="flex gap-3">
        {user ? (
          <>
            <Link
              href="/assistant"
              className="rounded bg-foreground px-5 py-3 text-background transition-opacity hover:opacity-90"
            >
              Open Draft Assistant
            </Link>
            <Link
              href="/leagues"
              className="rounded border border-black/20 px-5 py-3 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Manage Leagues
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded bg-foreground px-5 py-3 text-background transition-opacity hover:opacity-90"
          >
            Sign in to get started
          </Link>
        )}
      </div>
    </div>
  );
}
