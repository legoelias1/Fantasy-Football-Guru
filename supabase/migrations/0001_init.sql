-- Historical reference data (public read, written only by ingestion scripts via service role)

create table if not exists players (
  player_id text primary key,        -- nflverse gsis_id
  full_name text not null,
  position text not null,
  first_season int,
  last_season int
);

create table if not exists season_stats (
  id bigint generated always as identity primary key,
  player_id text not null references players(player_id),
  season int not null,
  team text,
  position text not null,
  games int,
  fantasy_points numeric,
  fantasy_points_ppr numeric,
  passing_yards numeric,
  passing_tds numeric,
  rushing_yards numeric,
  rushing_tds numeric,
  receptions numeric,
  targets numeric,
  receiving_yards numeric,
  receiving_tds numeric,
  unique (player_id, season)
);
create index if not exists season_stats_season_idx on season_stats(season);
create index if not exists season_stats_position_idx on season_stats(position);

create table if not exists adp_history (
  id bigint generated always as identity primary key,
  player_name text not null,
  player_id text references players(player_id),
  position text not null,
  season int not null,
  format text not null check (format in ('standard', 'ppr', 'half_ppr', 'dynasty', 'rookie')),
  adp numeric not null,
  position_rank int,
  teams int,
  unique (player_name, season, format)
);
create index if not exists adp_history_season_format_idx on adp_history(season, format);
create index if not exists adp_history_position_idx on adp_history(position);

alter table players enable row level security;
alter table season_stats enable row level security;
alter table adp_history enable row level security;

create policy "public read players" on players for select using (true);
create policy "public read season_stats" on season_stats for select using (true);
create policy "public read adp_history" on adp_history for select using (true);

-- Per-user league settings

create table if not exists user_leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My League',
  league_type text not null check (league_type in ('redraft', 'dynasty')),
  scoring text not null check (scoring in ('standard', 'half_ppr', 'ppr')),
  team_count int not null default 12,
  draft_position int not null,
  roster_slots jsonb not null default '{"QB":1,"RB":2,"WR":2,"TE":1,"FLEX":1,"BENCH":6}',
  created_at timestamptz not null default now()
);

alter table user_leagues enable row level security;

create policy "owner select" on user_leagues for select using (auth.uid() = user_id);
create policy "owner insert" on user_leagues for insert with check (auth.uid() = user_id);
create policy "owner update" on user_leagues for update using (auth.uid() = user_id);
create policy "owner delete" on user_leagues for delete using (auth.uid() = user_id);
