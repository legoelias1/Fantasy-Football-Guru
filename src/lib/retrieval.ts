import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdpFormat, SeasonStat } from "./types";

type DB = SupabaseClient;

export async function searchPlayers(supabase: DB, query: string, position?: string) {
  let q = supabase
    .from("players")
    .select("player_id, full_name, position, first_season, last_season")
    .ilike("full_name", `%${query}%`)
    .limit(10);
  if (position) q = q.eq("position", position);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
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
