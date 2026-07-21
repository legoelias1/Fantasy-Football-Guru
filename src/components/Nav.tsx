import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/10">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold transition-opacity hover:opacity-70">
          Fantasy Draft Assistant
        </Link>
        {user && (
          <>
            <Link
              href="/leagues"
              className="text-sm text-black/70 transition-colors hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
            >
              Leagues
            </Link>
            <Link
              href="/assistant"
              className="text-sm text-black/70 transition-colors hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
            >
              Draft Assistant
            </Link>
            <Link
              href="/news"
              className="text-sm text-black/70 transition-colors hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
            >
              Breaking News
            </Link>
          </>
        )}
      </div>
      <div className="text-sm">
        {user ? (
          <form action={signOut}>
            <button type="submit" className="underline transition-opacity hover:opacity-70">
              Sign out ({user.email})
            </button>
          </form>
        ) : (
          <Link href="/login" className="underline transition-opacity hover:opacity-70">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
