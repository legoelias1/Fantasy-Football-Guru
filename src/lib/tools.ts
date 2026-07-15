import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import {
  getAdpVsOutcome,
  getPlayerCareerStats,
  getPositionalRoundBreakdown,
  searchPlayers,
} from "./retrieval";
import type { AdpFormat } from "./types";

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_players",
    description:
      "Find players by (partial) name, optionally filtered by position. Returns player_id values usable by get_player_career_stats.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full or partial player name" },
        position: { type: "string", description: "Optional position filter, e.g. RB, WR, QB, TE, K" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_player_career_stats",
    description:
      "Get a specific player's season-by-season fantasy stats (fantasy_points, fantasy_points_ppr, yards, TDs, etc.) across their career.",
    input_schema: {
      type: "object",
      properties: {
        player_id: { type: "string", description: "player_id from search_players" },
      },
      required: ["player_id"],
    },
  },
  {
    name: "get_adp_vs_outcome",
    description:
      "The core historical-comp tool. Finds players historically drafted (ADP) in a given range/position/format/season range, and what they actually scored that season. Use this to find concrete precedents for a draft decision, e.g. 'WRs drafted between ADP 60-80 in PPR since 2015'.",
    input_schema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["standard", "half_ppr", "ppr", "dynasty", "rookie"],
          description: "Scoring/draft format for the ADP data",
        },
        position: { type: "string", description: "Optional position filter" },
        min_adp: { type: "number", description: "Optional minimum ADP (draft slot)" },
        max_adp: { type: "number", description: "Optional maximum ADP (draft slot)" },
        min_season: { type: "number", description: "Optional earliest season to include" },
        max_season: { type: "number", description: "Optional latest season to include" },
        limit: { type: "number", description: "Max rows to return, default 40" },
      },
      required: ["format"],
    },
  },
  {
    name: "get_positional_round_breakdown",
    description:
      "Shows how many players at each position were drafted in each round for a given season/format -- useful for answering positional-scarcity and draft-position strategy questions.",
    input_schema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["standard", "half_ppr", "ppr", "dynasty", "rookie"],
        },
        season: { type: "number" },
        teams: { type: "number", description: "League size, default 12" },
      },
      required: ["format", "season"],
    },
  },
];

export async function callTool(
  supabase: SupabaseClient,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_players":
      return searchPlayers(supabase, input.query as string, input.position as string | undefined);
    case "get_player_career_stats":
      return getPlayerCareerStats(supabase, input.player_id as string);
    case "get_adp_vs_outcome":
      return getAdpVsOutcome(supabase, {
        format: input.format as AdpFormat,
        position: input.position as string | undefined,
        minAdp: input.min_adp as number | undefined,
        maxAdp: input.max_adp as number | undefined,
        minSeason: input.min_season as number | undefined,
        maxSeason: input.max_season as number | undefined,
        limit: input.limit as number | undefined,
      });
    case "get_positional_round_breakdown":
      return getPositionalRoundBreakdown(supabase, {
        format: input.format as AdpFormat,
        season: input.season as number,
        teams: input.teams as number | undefined,
      });
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}
