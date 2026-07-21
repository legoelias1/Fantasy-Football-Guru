import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserLeague } from "@/lib/types";
import { createLeague, deleteLeague } from "./actions";

export default async function LeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leagues } = await supabase
    .from("user_leagues")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold">Your Leagues</h1>

      <ul className="mb-10 flex flex-col gap-3">
        {(leagues as UserLeague[] | null)?.map((league) => (
          <li
            key={league.id}
            className="flex items-center justify-between rounded border border-black/10 px-4 py-3 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <div className="font-medium">{league.name}</div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {league.league_type} · {league.scoring.replace("_", " ")} · {league.team_count}{" "}
                teams · pick {league.draft_position}
              </div>
            </div>
            <form action={deleteLeague}>
              <input type="hidden" name="id" value={league.id} />
              <button
                type="submit"
                className="text-sm text-red-600 underline transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </form>
          </li>
        ))}
        {!leagues?.length && (
          <li className="text-sm text-black/60 dark:text-white/60">
            No leagues yet — add one below.
          </li>
        )}
      </ul>

      <h2 className="mb-4 text-lg font-semibold">Add a league</h2>
      <form action={createLeague} className="flex flex-col gap-3">
        <input
          name="name"
          placeholder="League name"
          className="rounded border border-black/20 px-3 py-2 transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
        />

        <div className="flex gap-3">
          <select
            name="league_type"
            required
            className="flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="redraft">Redraft</option>
            <option value="dynasty">Dynasty</option>
          </select>
          <select
            name="scoring"
            required
            className="flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="ppr">PPR</option>
            <option value="half_ppr">Half PPR</option>
            <option value="standard">Standard</option>
          </select>
        </div>

        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            Team count
            <input
              name="team_count"
              type="number"
              defaultValue={12}
              min={2}
              max={20}
              required
              className="mt-1 w-full rounded border border-black/20 px-3 py-2 transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
            />
          </label>
          <label className="flex-1 text-sm">
            Your draft position
            <input
              name="draft_position"
              type="number"
              defaultValue={1}
              min={1}
              max={20}
              required
              className="mt-1 w-full rounded border border-black/20 px-3 py-2 transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
            />
          </label>
        </div>

        <fieldset className="rounded border border-black/10 p-3 dark:border-white/10">
          <legend className="px-1 text-sm text-black/60 dark:text-white/60">Roster slots</legend>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["qb", "QB", 1],
              ["rb", "RB", 2],
              ["wr", "WR", 2],
              ["te", "TE", 1],
              ["flex", "FLEX", 1],
              ["bench", "BENCH", 6],
            ].map(([field, label, def]) => (
              <label key={field as string} className="text-xs">
                {label}
                <input
                  name={field as string}
                  type="number"
                  defaultValue={def as number}
                  min={0}
                  className="mt-1 w-full rounded border border-black/20 px-2 py-1 transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="rounded bg-foreground px-3 py-2 text-background transition-opacity hover:opacity-90"
        >
          Save league
        </button>
      </form>
    </div>
  );
}
