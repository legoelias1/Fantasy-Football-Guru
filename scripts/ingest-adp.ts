// Pulls historical ADP by format from the free FantasyFootballCalculator API
// and loads it into Supabase, best-effort linked to players by exact name match.
// Usage: npx tsx scripts/ingest-adp.ts [startYear] [endYear]
import { config } from "dotenv";
config({ path: ".env.local" });
import { createAdminClient } from "../src/lib/supabase/admin";

const FORMATS: Record<string, string> = {
  standard: "standard",
  ppr: "ppr",
  "half-ppr": "half_ppr",
  dynasty: "dynasty",
  rookie: "rookie",
};
const START_YEAR = Number(process.argv[2]) || 2010;
const END_YEAR = Number(process.argv[3]) || new Date().getFullYear();
const CHUNK_SIZE = 500;

type ApiPlayer = {
  name: string;
  position: string;
  adp: number;
};

type AdpRow = {
  player_name: string;
  player_id: string | null;
  position: string;
  season: number;
  format: string;
  adp: number;
  position_rank: number;
  teams: number;
};

async function main() {
  const supabase = createAdminClient();

  // Supabase caps unpaginated selects at ~1000 rows -- page through to get every player.
  const playerRows: { player_id: string; full_name: string }[] = [];
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("players")
      .select("player_id, full_name")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`failed to load players: ${error.message}`);
    playerRows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  const nameToId = new Map(
    playerRows.map((p) => [p.full_name.toLowerCase(), p.player_id])
  );
  console.log(`loaded ${playerRows.length} players for name matching`);

  const rows: AdpRow[] = [];

  for (const [apiFormat, dbFormat] of Object.entries(FORMATS)) {
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const url = `https://fantasyfootballcalculator.com/api/v1/adp/${apiFormat}?year=${year}&teams=12&position=all`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`skip ${apiFormat} ${year}: HTTP ${res.status}`);
        continue;
      }
      const body = await res.json();
      if (body.status !== "Success" || !Array.isArray(body.players)) {
        console.warn(`skip ${apiFormat} ${year}: no data`);
        continue;
      }

      const players: ApiPlayer[] = body.players;
      const posCounts: Record<string, number> = {};
      for (const p of [...players].sort((a, b) => a.adp - b.adp)) {
        posCounts[p.position] = (posCounts[p.position] ?? 0) + 1;
        rows.push({
          player_name: p.name,
          player_id: nameToId.get(p.name.toLowerCase()) ?? null,
          position: p.position,
          season: year,
          format: dbFormat,
          adp: p.adp,
          position_rank: posCounts[p.position],
          teams: body.meta?.teams ?? 12,
        });
      }
      console.log(`${apiFormat} ${year}: ${players.length} players`);
    }
  }

  // The unique constraint is (player_name, season, format); a handful of shared
  // names collide within the same season/format, which a batch upsert can't
  // apply twice in one statement -- keep the lowest-ADP (first-drafted) entry.
  const deduped = new Map<string, AdpRow>();
  for (const row of rows) {
    const key = `${row.player_name.toLowerCase()}|${row.season}|${row.format}`;
    const existing = deduped.get(key);
    if (!existing || row.adp < existing.adp) deduped.set(key, row);
  }
  const uniqueRows = Array.from(deduped.values());
  console.log(`upserting ${uniqueRows.length} adp_history rows (${rows.length - uniqueRows.length} duplicate name/season/format collisions dropped)...`);
  for (let i = 0; i < uniqueRows.length; i += CHUNK_SIZE) {
    const chunk = uniqueRows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("adp_history")
      .upsert(chunk, { onConflict: "player_name,season,format" });
    if (error) throw new Error(`adp_history upsert failed at row ${i}: ${error.message}`);
  }

  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
