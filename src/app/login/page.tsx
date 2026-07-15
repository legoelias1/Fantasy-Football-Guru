import { signInWithPassword, signUpWithPassword, signInWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <h1 className="mb-6 text-xl font-semibold">Sign in</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

      <form className="flex flex-col gap-3" action={signInWithPassword}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
        <button type="submit" className="rounded bg-foreground px-3 py-2 text-background">
          Sign in
        </button>
        <button
          type="submit"
          formAction={signUpWithPassword}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          Create account
        </button>
      </form>

      <div className="my-4 text-center text-xs text-black/50 dark:text-white/50">or</div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
