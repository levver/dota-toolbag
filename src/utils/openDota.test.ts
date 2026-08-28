import { describe, test, expect } from 'bun:test';
import {
  parseInputForAccountId,
  getRankIconUrl,
  getWinrateColor,
  generateTextSummary,
  resolveTeamDraftUrl,
  normalizeAssetUrl
} from './openDota';
import { PlayerProfileResult } from '../types';

describe('openDota utility tests', () => {
  describe('normalizeAssetUrl', () => {
    test('keeps remote or data URLs intact', () => {
      expect(normalizeAssetUrl('https://example.com/test.png')).toBe('https://example.com/test.png');
      expect(normalizeAssetUrl('data:image/png;base64,...')).toBe('data:image/png;base64,...');
      expect(normalizeAssetUrl('')).toBe('');
    });
  });
  describe('parseInputForAccountId', () => {
    test('parses pure numeric account IDs', () => {
      expect(parseInputForAccountId('131333617')).toBe('131333617');
      expect(parseInputForAccountId('  131333617  ')).toBe('131333617');
    });

    test('parses Dotabuff URLs', () => {
      expect(parseInputForAccountId('https://www.dotabuff.com/players/131333617')).toBe('131333617');
      expect(parseInputForAccountId('http://dotabuff.com/players/112672935/heroes')).toBe('112672935');
    });

    test('parses OpenDota URLs', () => {
      expect(parseInputForAccountId('https://www.opendota.com/players/35747920')).toBe('35747920');
      expect(parseInputForAccountId('opendota.com/players/23765698')).toBe('23765698');
    });

    test('parses Stratz URLs', () => {
      expect(parseInputForAccountId('https://stratz.com/players/131333617')).toBe('131333617');
    });

    test('returns null for empty or invalid input', () => {
      expect(parseInputForAccountId('')).toBeNull();
      expect(parseInputForAccountId('invalid-text')).toBeNull();
    });
  });

  describe('getRankIconUrl', () => {
    test('resolves uncalibrated for 0 or null', () => {
      const rank0 = getRankIconUrl(0);
      expect(rank0.text).toBe('Uncalibrated');
    });

    test('resolves rank tier and stars', () => {
      // 43 = Archon 3 (Tier 4, Star 3)
      const rankArchon3 = getRankIconUrl(43);
      expect(rankArchon3.text).toBe('Archon 3');

      // 75 = Divine 5 (Tier 7, Star 5)
      const rankDivine5 = getRankIconUrl(75);
      expect(rankDivine5.text).toBe('Divine 5');

      // 80 = Immortal (Tier 8, Star 0)
      const rankImmortal = getRankIconUrl(80);
      expect(rankImmortal.text).toBe('Immortal');
    });
  });

  describe('getWinrateColor', () => {
    test('returns green for >= 60%', () => {
      const color = getWinrateColor('60.0%');
      expect(color).toBe('rgb(34, 197, 94)');
    });

    test('returns yellow for 50%', () => {
      const color = getWinrateColor('50.0%');
      expect(color).toBe('rgb(234, 179, 8)');
    });

    test('returns red for <= 40%', () => {
      const color = getWinrateColor('40.0%');
      expect(color).toBe('rgb(239, 68, 68)');
    });

    test('interpolates between red and yellow for 45%', () => {
      const color = getWinrateColor('45.0%');
      expect(color).toBe('rgb(237, 124, 38)');
    });

    test('interpolates between yellow and green for 55%', () => {
      const color = getWinrateColor('55.0%');
      expect(color).toBe('rgb(134, 188, 51)');
    });
  });

  describe('generateTextSummary', () => {
    test('formats text summary for clipboard export', () => {
      const sampleProfiles: PlayerProfileResult[] = [
        {
          accountId: '131333617',
          name: 'levver',
          avatarUrl: '',
          rankText: 'Legend 2',
          rankUrl: { url: '', text: 'Legend 2' },
          allTime: {
            success: true,
            heroes: [
              { name: 'Anti-Mage', iconUrl: '', games: 100, winrate: '60.0%', winCount: 60 },
              { name: 'Axe', iconUrl: '', games: 80, winrate: '55.0%', winCount: 44 }
            ]
          },
          monthly: { success: false },
          pro: { success: false }
        }
      ];

      const summary = generateTextSummary(sampleProfiles);
      expect(summary).toContain('levver');
      expect(summary).toContain('Legend 2');
      expect(summary).toContain('Anti-Mage');
      expect(summary).toContain('Recent Tournament Games (All teams)');
    });
  });

  describe('resolveTeamDraftUrl', () => {
    test('resolves search draft URL if team name is provided without matches', async () => {
      const res = await resolveTeamDraftUrl(null, 'Disciples of Bogg Shuggoth');
      expect(res.draftUrl).toBe('https://www.dotabuff.com/esports/teams?q=Disciples%20of%20Bogg%20Shuggoth');
      expect(res.matchedTeamName).toBe('Disciples of Bogg Shuggoth');
    });

    test('resolves player teams page if only captain ID is provided', async () => {
      const res = await resolveTeamDraftUrl('131333617', null);
      expect(res.draftUrl).toContain('dotabuff.com/esports/');
    });
  });
});
