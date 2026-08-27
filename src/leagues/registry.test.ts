import { describe, test, expect } from 'bun:test';
import { getLeagueAdapter, getLeagueDefinition, AVAILABLE_LEAGUES } from './registry';

describe('league registry tests', () => {
  test('retrieves Clarity league adapter', () => {
    const clarity = getLeagueAdapter('clarity');
    expect(clarity).toBeDefined();
    expect(clarity?.definition.id).toBe('clarity');
    expect(clarity?.definition.shortName).toBe('Clarity');
    expect(clarity?.definition.requiresSheetUrl).toBe(true);
  });

  test('retrieves RD2L league definition', () => {
    const rd2l = getLeagueDefinition('rd2l');
    expect(rd2l).toBeDefined();
    expect(rd2l?.id).toBe('rd2l');
    expect(rd2l?.shortName).toBe('RD2L');
  });

  test('returns null for unknown league ID', () => {
    const unknown = getLeagueAdapter('non_existent');
    expect(unknown).toBeNull();
  });

  test('lists all available league definitions', () => {
    expect(AVAILABLE_LEAGUES.length).toBeGreaterThanOrEqual(2);
    expect(AVAILABLE_LEAGUES.map((d) => d.id)).toContain('clarity');
    expect(AVAILABLE_LEAGUES.map((d) => d.id)).toContain('rd2l');
  });
});
