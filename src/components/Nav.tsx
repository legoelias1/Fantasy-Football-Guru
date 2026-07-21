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
        <Link href="/" className="font-semibold">
          Fantasy Draft Assistant
        </Link>
        {user && (
          <>
            <Link href="/leagues" className="text-sm">
              Leagues
            </Link>
            <Link href="/assistant" className="text-sm">
              Draft Assistant
            </Link>
            <Link href="/news" className="text-sm">
              Breaking News
            </Link>
          </>
        )}
      </div>
      <div className="text-sm">
        {user ? (
          <form action={signOut}>
            <button type="submit" className="underline">
              Sign out ({user.email})
            </button>
          </form>
        ) : (
          <Link href="/login" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
