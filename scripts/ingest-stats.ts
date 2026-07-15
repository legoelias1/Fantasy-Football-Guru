// Pulls season-level player stats (with fantasy_points / fantasy_points_ppr already computed)
// from the nflverse-data "stats_player" GitHub release and loads them into Supabase.
// Usage: npx tsx scripts/ingest-stats.ts [startYear] [endYear]
import { config } from "dotenv";
config({ path: ".env.local" });
import { parse } from "csv-parse/sync";
import { createAdminClient } from "../src/lib/supabase/admin";

const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K"]);
const START_YEAR = Number(process.argv[2]) || 2000;
const END_YEAR = Number(process.argv[3]) || new Date().getFullYear();
const CHUNK_SIZE = 500;

type PlayerRow = {
  player_id: string;
  full_name: string;
  position: string;
  first_season: number;
  last_season: number;
};

type SeasonStatRow = {
  player_id: string;
  season: number;
  team: string;
  position: string;
  games: number;
  fantasy_points: number | null;
  fantasy_points_ppr: number | null;
  passing_yards: number | null;
  passing_tds: number | null;
  rushing_yards: number | null;
  rushing_tds: number | null;
  receptions: number | null;
  targets: number | null;
  receiving_yards: number | null;
  receiving_tds: number | null;
};

function num(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

async function chunkedUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} upsert failed at row ${i}: ${error.message}`);
  }
}

async function main() {
  const supabase = createAdminClient();
  const players = new Map<string, PlayerRow>();
  const seasonStats: SeasonStatRow[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const url = `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_${year}.csv`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`skip ${year}: HTTP ${res.status}`);
      continue;
    }
    const csvText = await res.text();
    const records: Record<string, string>[] = parse(csvText, { columns: true, skip_empty_lines: true });

    let kept = 0;
    for (const r of records) {
      if (!FANTASY_POSITIONS.has(r.position)) continue;
      kept++;

      const existing = players.get(r.player_id);
      if (existing) {
        existing.first_season = Math.min(existing.first_season, year);
        existing.last_season = Math.max(existing.last_season, year);
      } else {
        players.set(r.player_id, {
          player_id: r.player_id,
          full_name: r.player_display_name || r.player_name,
          position: r.position,
          first_season: year,
          last_season: year,
        });
      }

      seasonStats.push({
        player_id: r.player_id,
        season: year,
        team: r.recent_team,
        position: r.position,
        games: num(r.games) ?? 0,
        fantasy_points: num(r.fantasy_points),
        fantasy_points_ppr: num(r.fantasy_points_ppr),
        passing_yards: num(r.passing_yards),
        passing_tds: num(r.passing_tds),
        rushing_yards: num(r.rushing_yards),
        rushing_tds: num(r.rushing_tds),
        receptions: num(r.receptions),
        targets: num(r.targets),
        receiving_yards: num(r.receiving_yards),
        receiving_tds: num(r.receiving_tds),
      });
    }
    console.log(`${year}: ${kept} skill-position rows`);
  }

  console.log(`upserting ${players.size} players...`);
  await chunkedUpsert(supabase, "players", Array.from(players.values()), "player_id");

  console.log(`upserting ${seasonStats.length} season_stats rows...`);
  await chunkedUpsert(supabase, "season_stats", seasonStats, "player_id,season");

  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
