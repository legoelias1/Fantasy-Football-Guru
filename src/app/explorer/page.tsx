import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdpVsOutcome } from "@/lib/retrieval";
import type { AdpFormat } from "@/lib/types";

const FORMATS: AdpFormat[] = ["standard", "half_ppr", "ppr", "dynasty", "rookie"];
const POSITIONS = ["QB", "RB", "WR", "TE", "K"];

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; position?: string; season?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const format = (params.format as AdpFormat) || "ppr";
  const position = params.position || "";
  const season = params.season ? Number(params.season) : undefined;

  const rows = await getAdpVsOutcome(supabase, {
    format,
    position: position || undefined,
    minSeason: season,
    maxSeason: season,
    limit: 60,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 text-xl font-semibold">Historical Explorer</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Browse past draft classes: where a player was actually drafted (ADP) vs. what they
        scored that season.
      </p>

      <form className="mb-6 flex flex-wrap gap-3 text-sm">
        <select
          name="format"
          defaultValue={format}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="position"
          defaultValue={position}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          name="season"
          type="number"
          placeholder="Season (e.g. 2021)"
          defaultValue={season}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
        <button type="submit" className="rounded bg-foreground px-4 py-2 text-background">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4">Pos</th>
              <th className="py-2 pr-4">Season</th>
              <th className="py-2 pr-4">ADP</th>
              <th className="py-2 pr-4">Pos Rank (ADP)</th>
              <th className="py-2 pr-4">Fantasy Pts (PPR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-4">{row.player_name}</td>
                <td className="py-2 pr-4">{row.position}</td>
                <td className="py-2 pr-4">{row.season}</td>
                <td className="py-2 pr-4">{row.adp}</td>
                <td className="py-2 pr-4">{row.position_rank}</td>
                <td className="py-2 pr-4">
                  {row.outcome?.fantasy_points_ppr?.toFixed(1) ?? "—"}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-4 text-black/50 dark:text-white/50">
                  No data for these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
