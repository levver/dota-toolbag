import { LeagueAdapter, LeagueDefinition } from './types';
import { ClarityLeagueAdapter, clarityDefinition } from './adapters/clarityAdapter';

export const rd2lDefinition: LeagueDefinition = {
  id: 'rd2l',
  name: 'RD2L',
  shortName: 'RD2L',
  description: 'Reddit Dota 2 League (Integration coming soon)',
  divisions: [
    { id: 'sun', label: 'Sunday Div' },
    { id: 'mon', label: 'Monday Div' },
    { id: 'wed', label: 'Wednesday Div' },
    { id: 'pst', label: 'Pacific Div' }
  ],
  defaultDivision: 'sun',
  isPlaceholder: true,
  logoUrl: `${import.meta.env.BASE_URL}assets/leagues/rd2l.svg`,
  accentColor: 'red'
};

const LEAGUE_ADAPTERS: Record<string, LeagueAdapter> = {
  clarity: ClarityLeagueAdapter
};

export const AVAILABLE_LEAGUES: LeagueDefinition[] = [
  clarityDefinition,
  rd2lDefinition
];

export function getLeagueAdapter(id: string | null): LeagueAdapter | null {
  if (!id) return null;
  return LEAGUE_ADAPTERS[id] || null;
}

export function getLeagueDefinition(id: string | null): LeagueDefinition | null {
  if (!id) return null;
  return AVAILABLE_LEAGUES.find((l) => l.id === id) || null;
}
