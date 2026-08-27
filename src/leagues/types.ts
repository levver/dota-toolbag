export interface LeaguePlayerItem {
  name: string;
  mmr: number | null;
  rankText: string;
  dotabuffUrl: string;
  accountId: string | null;
  assignedPosition: number;
}

export interface LeagueTeamResult {
  captainName: string;
  division: number | string;
  players: LeaguePlayerItem[];
}

export interface LeagueDivisionOption {
  id: number | string;
  label: string;
}

export interface LeagueDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  divisions: LeagueDivisionOption[];
  defaultDivision: number | string;
  requiresSheetUrl?: boolean;
  defaultSheetUrl?: string;
  logoUrl?: string;
  accentColor?: string;
  isPlaceholder?: boolean;
}

export interface FetchTeamParams {
  division: number | string;
  captainName: string;
  sheetUrl?: string;
}

export interface LeagueAdapter {
  id: string;
  definition: LeagueDefinition;
  fetchTeam: (params: FetchTeamParams) => Promise<LeagueTeamResult>;
  fetchCaptainsList?: (params: { division: number | string; sheetUrl?: string }) => Promise<string[]>;
}

export interface UserLeagueProfile {
  division: number | string;
  captainName: string;
  sheetUrl?: string;
}

export interface UserPreferences {
  activeLeagueId: string | null;
  leagueProfiles: Record<string, UserLeagueProfile>;
  recentOpponents: Record<string, string[]>;
}
