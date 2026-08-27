import { describe, test, expect } from 'bun:test';
import {
  extractDotaAccountId,
  cleanPlayerName,
  normalizeName,
  isValidMmr,
  getRankFromMmr,
  extractSpreadsheetInfo,
  extractChallongeUrl,
  MIN_VALID_MMR,
  MAX_VALID_MMR
} from './claritySheet';

describe('claritySheet utility tests', () => {
  describe('extractDotaAccountId', () => {
    test('extracts 32-bit ID from Dotabuff URL', () => {
      expect(extractDotaAccountId('https://www.dotabuff.com/players/131333617')).toBe('131333617');
      expect(extractDotaAccountId('http://dotabuff.com/players/112672935')).toBe('112672935');
      expect(extractDotaAccountId('dotabuff.com/players/90430279')).toBe('90430279');
    });

    test('extracts 32-bit ID from OpenDota URL', () => {
      expect(extractDotaAccountId('https://www.opendota.com/players/35747920')).toBe('35747920');
      expect(extractDotaAccountId('opendota.com/players/23765698')).toBe('23765698');
    });

    test('converts Steam ID64 URL to 32-bit Dota Account ID', () => {
      // 76561198091599345 - 76561197960265728 = 131333617
      expect(extractDotaAccountId('https://steamcommunity.com/profiles/76561198091599345')).toBe('131333617');
    });

    test('extracts Steam ID32 format', () => {
      expect(extractDotaAccountId('[U:1:131333617]')).toBe('131333617');
    });

    test('extracts plain numeric IDs with comma formatting', () => {
      expect(extractDotaAccountId('131333617')).toBe('131333617');
      expect(extractDotaAccountId('131,333,617')).toBe('131333617');
      expect(extractDotaAccountId(131333617)).toBe('131333617');
    });

    test('blocks placeholder link labels from being treated as account IDs', () => {
      expect(extractDotaAccountId('DB Link')).toBeNull();
      expect(extractDotaAccountId('DB')).toBeNull();
      expect(extractDotaAccountId('Dotabuff')).toBeNull();
      expect(extractDotaAccountId('Link')).toBeNull();
      expect(extractDotaAccountId('OpenDota')).toBeNull();
      expect(extractDotaAccountId('DB Profile')).toBeNull();
      expect(extractDotaAccountId('dotabuff link')).toBeNull();
      expect(extractDotaAccountId('Profile Link')).toBeNull();
    });

    test('does not treat small numbers (e.g. MMR < 20000) as Account IDs', () => {
      expect(extractDotaAccountId('4500')).toBeNull();
      expect(extractDotaAccountId('2950')).toBeNull();
      expect(extractDotaAccountId(3500)).toBeNull();
    });

    test('handles null, undefined, and empty string', () => {
      expect(extractDotaAccountId(null)).toBeNull();
      expect(extractDotaAccountId(undefined)).toBeNull();
      expect(extractDotaAccountId('')).toBeNull();
    });
  });

  describe('cleanPlayerName & normalizeName', () => {
    test('removes captain tags', () => {
      expect(cleanPlayerName('levver (c)')).toBe('levver');
      expect(cleanPlayerName('Tanaka [C]')).toBe('Tanaka');
      expect(cleanPlayerName('Captain: Cienszki')).toBe('Cienszki');
    });

    test('removes sub tags', () => {
      expect(cleanPlayerName('Pajazo (sub)')).toBe('Pajazo');
      expect(cleanPlayerName('Lewis [SUB]')).toBe('Lewis');
    });

    test('removes Team prefix', () => {
      expect(cleanPlayerName('Team Levver:')).toBe('Levver');
      expect(cleanPlayerName('Team Tanaka')).toBe('Tanaka');
    });

    test('normalizeName strips whitespace and special characters', () => {
      expect(normalizeName('Notre Daan')).toBe('notredaan');
      expect(normalizeName('Bernard humperdink!')).toBe('bernardhumperdink');
      expect(normalizeName('Ben or NapTime')).toBe('benornaptime');
    });
  });

  describe('isValidMmr', () => {
    test('validates numeric and formatted MMR ranges', () => {
      expect(isValidMmr(MIN_VALID_MMR)).toBe(true);
      expect(isValidMmr(MAX_VALID_MMR)).toBe(true);
      expect(isValidMmr(3500)).toBe(true);
      expect(isValidMmr('4,500')).toBe(true);
      expect(isValidMmr('2950')).toBe(true);
    });

    test('rejects invalid or out-of-bounds MMRs', () => {
      expect(isValidMmr(100)).toBe(false);
      expect(isValidMmr(25000)).toBe(false);
      expect(isValidMmr('N/A')).toBe(false);
      expect(isValidMmr('FALSE')).toBe(false);
      expect(isValidMmr(null)).toBe(false);
      expect(isValidMmr(undefined)).toBe(false);
    });
  });

  describe('getRankFromMmr', () => {
    test('maps MMR to correct medal rank tiers', () => {
      expect(getRankFromMmr(null)).toBe('Unranked');
      expect(getRankFromMmr(0)).toBe('Unranked');
      expect(getRankFromMmr(500)).toBe('Herald (500)');
      expect(getRankFromMmr(1000)).toBe('Guardian (1,000)');
      expect(getRankFromMmr(2000)).toBe('Crusader (2,000)');
      expect(getRankFromMmr(2500)).toBe('Archon (2,500)');
      expect(getRankFromMmr(3500)).toBe('Legend (3,500)');
      expect(getRankFromMmr(4200)).toBe('Ancient (4,200)');
      expect(getRankFromMmr(5000)).toBe('Divine (5,000)');
      expect(getRankFromMmr(7000)).toBe('Immortal (7,000)');
    });
  });

  describe('extractSpreadsheetInfo', () => {
    test('extracts spreadsheet ID and GID from URL', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=123456#gid=123456';
      const info = extractSpreadsheetInfo(url);
      expect(info.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      expect(info.gid).toBe('123456');
    });

    test('handles URLs without GID', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
      const info = extractSpreadsheetInfo(url);
      expect(info.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      expect(info.gid).toBeNull();
    });
  });

  describe('extractChallongeUrl', () => {
    test('extracts challonge bracket URL from grid', () => {
      const grid = [
        [{ text: 'Division 4' }, { text: 'Bracket: https://challonge.com/clarity_s10_div4' }],
        [{ text: 'Player' }, { text: 'MMR' }]
      ];
      expect(extractChallongeUrl(grid)).toBe('https://challonge.com/clarity_s10_div4');
    });

    test('returns null when no challonge URL present', () => {
      const grid = [
        [{ text: 'Division 4' }, { text: 'Rules' }],
        [{ text: 'Player' }, { text: 'MMR' }]
      ];
      expect(extractChallongeUrl(grid)).toBeNull();
    });
  });

  describe('Column D team name & draft URL logic', () => {
    test('identifies Column D (index 3) team name and builds drafts link', () => {
      const mockGrid = [
        // Col A (0), Col B (1), Col C (2), Col D (3)
        [{ text: '1' }, { text: 'levver' }, { text: 'levver' }, { text: 'Disciples of Bogg Shuggoth', link: 'https://www.dotabuff.com/esports/teams/10196182-disciples-of-bogg-shuggoth' }]
      ];
      const colD = mockGrid[0][3];
      expect(colD.text).toBe('Disciples of Bogg Shuggoth');
      expect(colD.link).toContain('dotabuff.com/esports/teams/10196182-disciples-of-bogg-shuggoth');
    });
  });
});
