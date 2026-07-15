import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdpFormat, Player, Scoring, SeasonStat } from "./types";

type DB = SupabaseClient;

function pointsForScoring(
  row: { fantasy_points: number | null; fantasy_points_ppr: number | null },
  scoring: Scoring
): number | null {
  if (row.fantasy_points == null && row.fantasy_points_ppr == null) return null;
  if (scoring === "standard") return row.fantasy_points;
  if (scoring === "ppr") return row.fantasy_points_ppr;
  // Half-PPR sits exactly halfway between standard and full-PPR, since the only
  // difference between the two is the per-reception bonus.
  if (row.fantasy_points != null && row.fantasy_points_ppr != null) {
    return (row.fantasy_points + row.fantasy_points_ppr) / 2;
  }
  return row.fantasy_points_ppr ?? row.fantasy_points;
}

export async function searchPlayers(supabase: DB, query: string, position?: string) {
  let q = supabase
    .from("players")
    .select("player_id, full_name, position, first_season, last_season, headshot_url")
    .ilike("full_name", `%${query}%`)
    .limit(10);
  if (position) q = q.eq("position", position);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

// Finds players named verbatim in free-text (e.g. the user's question) so the UI
// can show a headshot for whoever is actually being discussed. Pages through the
// full players table since Supabase caps a single select at ~1000 rows.
export async function findMentionedPlayers(supabase: DB, text: string) {
  const haystack = text.toLowerCase();
  const PAGE_SIZE = 1000;
  const matches: Pick<
    Player,
    "player_id" | "full_name" | "position" | "headshot_url" | "first_season"
  >[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("players")
      .select("player_id, full_name, position, headshot_url, first_season")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) {
      if (p.full_name && haystack.includes(p.full_name.toLowerCase())) matches.push(p);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  return matches;
}

// The player's most recently played season: their points in the league's scoring
// format, and where that ranked among every player at their position that season.
export async function getPlayerLatestSeasonSummary(
  supabase: DB,
  playerId: string,
  position: string,
  scoring: Scoring
) {
  const { data: seasons, error } = await supabase
    .from("season_stats")
    .select("season, fantasy_points, fantasy_points_ppr")
    .eq("player_id", playerId)
    .order("season", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const latest = seasons?.[0];
  if (!latest) return null;

  const points = pointsForScoring(latest, scoring);

  const { data: positionRows, error: posErr } = await supabase
    .from("season_stats")
    .select("player_id, fantasy_points, fantasy_points_ppr")
    .eq("season", latest.season)
    .eq("position", position);
  if (posErr) throw new Error(posErr.message);

  const ranked = (positionRows ?? [])
    .map((r) => ({ player_id: r.player_id as string, points: pointsForScoring(r, scoring) }))
    .filter((r): r is { player_id: string; points: number } => r.points != null)
    .sort((a, b) => b.points - a.points);
  const rankIndex = ranked.findIndex((r) => r.player_id === playerId);

  return {
    season: latest.season as number,
    points,
    positionRank: rankIndex === -1 ? null : rankIndex + 1,
  };
}

export async function getPlayerCareerStats(supabase: DB, playerId: string) {
  const { data, error } = await supabase
    .from("season_stats")
    .select("*")
    .eq("player_id", playerId)
    .order("season", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export type AdpVsOutcomeParams = {
  format: AdpFormat;
  position?: string;
  minAdp?: number;
  maxAdp?: number;
  minSeason?: number;
  maxSeason?: number;
  limit?: number;
};

// The core "historical comp" lookup: which players were drafted in a given
// ADP range/format/era, and what did they actually score that season.
export async function getAdpVsOutcome(supabase: DB, params: AdpVsOutcomeParams) {
  let q = supabase.from("adp_history").select("*").eq("format", params.format);
  if (params.position) q = q.eq("position", params.position);
  if (params.minAdp != null) q = q.gte("adp", params.minAdp);
  if (params.maxAdp != null) q = q.lte("adp", params.maxAdp);
  if (params.minSeason != null) q = q.gte("season", params.minSeason);
  if (params.maxSeason != null) q = q.lte("season", params.maxSeason);

  const { data: adpRows, error } = await q
    .order("season", { ascending: false })
    .limit(params.limit ?? 40);
  if (error) throw new Error(error.message);
  if (!adpRows?.length) return [];

  const ids = [...new Set(adpRows.filter((r) => r.player_id).map((r) => r.player_id as string))];
  const statMap = new Map<string, SeasonStat>();
  if (ids.length) {
    const { data: statRows, error: statErr } = await supabase
      .from("season_stats")
      .select("player_id, season, fantasy_points, fantasy_points_ppr, games")
      .in("player_id", ids);
    if (statErr) throw new Error(statErr.message);
    for (const s of statRows ?? []) statMap.set(`${s.player_id}_${s.season}`, s as SeasonStat);
  }

  return adpRows.map((r) => ({
    ...r,
    outcome: r.player_id ? statMap.get(`${r.player_id}_${r.season}`) ?? null : null,
  }));
}

// Positional breakdown by draft round for a given season/format -- shows how
// quickly each position historically dried up, useful for draft-position strategy.
export async function getPositionalRoundBreakdown(
  supabase: DB,
  params: { format: AdpFormat; season: number; teams?: number }
) {
  const teams = params.teams ?? 12;
  const { data, error } = await supabase
    .from("adp_history")
    .select("position, adp")
    .eq("format", params.format)
    .eq("season", params.season);
  if (error) throw new Error(error.message);

  const rounds: Record<number, Record<string, number>> = {};
  for (const r of data ?? []) {
    const round = Math.ceil(r.adp / teams);
    rounds[round] ??= {};
    rounds[round][r.position] = (rounds[round][r.position] ?? 0) + 1;
  }
  return rounds;
}
