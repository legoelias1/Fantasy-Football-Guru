export type LeagueType = "redraft" | "dynasty";
export type Scoring = "standard" | "half_ppr" | "ppr";

export type UserLeague = {
  id: string;
  user_id: string;
  name: string;
  league_type: LeagueType;
  scoring: Scoring;
  team_count: number;
  draft_position: number;
  roster_slots: Record<string, number>;
  created_at: string;
};

export type Player = {
  player_id: string;
  full_name: string;
  position: string;
  first_season: number;
  last_season: number;
};

export type SeasonStat = {
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

export type AdpFormat = "standard" | "half_ppr" | "ppr" | "dynasty" | "rookie";

export type AdpRow = {
  player_name: string;
  player_id: string | null;
  position: string;
  season: number;
  format: AdpFormat;
  adp: number;
  position_rank: number;
  teams: number;
};
