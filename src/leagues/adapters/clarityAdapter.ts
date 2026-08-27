import {
  LeagueAdapter,
  LeagueDefinition,
  LeagueTeamResult,
  FetchTeamParams
} from '../types';
import {
  importTeamFromClaritySheet,
  fetchGVizGrid,
  extractSpreadsheetInfo,
  normalizeName,
  cleanPlayerName
} from '../../utils/claritySheet';

const DEFAULT_CLARITY_DIVISIONS = [
  { id: 1, label: 'Division 1' },
  { id: 2, label: 'Division 2' },
  { id: 3, label: 'Division 3' },
  { id: 4, label: 'Division 4' }
];

export const clarityDefinition: LeagueDefinition = {
  id: 'clarity',
  name: 'Clarity League',
  shortName: 'Clarity',
  description: 'Community draft league with Google Sheets lineup and MMR tracking',
  divisions: DEFAULT_CLARITY_DIVISIONS,
  defaultDivision: 1,
  requiresSheetUrl: true,
  defaultSheetUrl: '',
  logoUrl: '/assets/leagues/clarity.png',
  accentColor: 'blue'
};

const captainsCache = new Map<string, string[]>();

function isValidMmr(val: string | undefined | null): boolean {
  if (!val) return false;
  const clean = val.replace(/,/g, '').trim();
  if (!/^\d+$/.test(clean)) return false;
  const num = parseInt(clean, 10);
  return num >= 400 && num <= 16000;
}

export const ClarityLeagueAdapter: LeagueAdapter = {
  id: 'clarity',
  definition: clarityDefinition,

  async fetchCaptainsList({ division, sheetUrl }: { division: number | string; sheetUrl?: string }): Promise<string[]> {
    if (!sheetUrl) return [];
    const { spreadsheetId, gid } = extractSpreadsheetInfo(sheetUrl);
    if (!spreadsheetId) return [];

    const divNum = typeof division === 'number' ? division : parseInt(String(division), 10) || 1;
    const cacheKey = `${spreadsheetId}_div_${divNum}_${gid || ''}`;
    if (captainsCache.has(cacheKey)) {
      return captainsCache.get(cacheKey)!;
    }

    const divLetter = ['', 'a', 'b', 'c', 'd', 'e', 'f'][divNum] || '';
    const tabCandidates = [
      `06${divLetter} _ Division ${divNum}`,
      `06${divLetter}_Division ${divNum}`,
      `Division ${divNum}`,
      `Div ${divNum}`
    ];

    let sheetGrid = null;
    if (gid) {
      try {
        sheetGrid = await fetchGVizGrid(spreadsheetId, { gid });
      } catch {}
    }

    if (!sheetGrid) {
      for (const tab of tabCandidates) {
        try {
          sheetGrid = await fetchGVizGrid(spreadsheetId, { tabName: tab });
          if (sheetGrid && sheetGrid.length > 0) break;
        } catch {}
      }
    }

    if (!sheetGrid || sheetGrid.length === 0) return [];

    const captains: string[] = [];
    const seen = new Set<string>();
    const ignoreWords = new Set([
      'player', 'players', 'mmr', 'dotabuff', 'db', 'link', 'db link', 'coins', 'average', 'avg',
      'total', 'rank', 'sub', 'subs', 'substitutes', 'team', 'captain', 'captains', 'division',
      'score', 'wins', 'losses', 'tier', 'status', 'unranked', 'tbd', 'open', 'pos 1', 'pos 2',
      'pos 3', 'pos 4', 'pos 5', 'pos', 'role', 'name', 'account id', 'id', 'role/rank'
    ]);

    const addCaptain = (rawName: string) => {
      const cleaned = cleanPlayerName(rawName);
      const norm = normalizeName(cleaned);
      if (cleaned && norm.length >= 2 && !ignoreWords.has(norm) && !/^\d+$/.test(cleaned) && !seen.has(norm)) {
        seen.add(norm);
        captains.push(cleaned);
      }
    };

    // 1. Primary Discovery: Locate consecutive player rows with MMR where r is the FIRST player row
    for (let r = 0; r < sheetGrid.length - 1; r++) {
      for (let c = 0; c < sheetGrid[r].length; c++) {
        const p1Name = (sheetGrid[r][c]?.text || '').trim();
        const p1Mmr = sheetGrid[r][c + 1]?.text;
        const p2Mmr = sheetGrid[r + 1]?.[c + 1]?.text;
        const pAboveMmr = r > 0 ? sheetGrid[r - 1]?.[c + 1]?.text : null;

        // Condition: Row r has MMR, row r+1 has MMR, but row r-1 does NOT have MMR -> Row r is Player 1 (Captain)
        if (isValidMmr(p1Mmr) && isValidMmr(p2Mmr) && !isValidMmr(pAboveMmr)) {
          addCaptain(p1Name);
        }

        // Also check if MMR is in col c+2 (e.g. role/rank in c+1)
        const p1Mmr2 = sheetGrid[r][c + 2]?.text;
        const p2Mmr2 = sheetGrid[r + 1]?.[c + 2]?.text;
        const pAboveMmr2 = r > 0 ? sheetGrid[r - 1]?.[c + 2]?.text : null;

        if (isValidMmr(p1Mmr2) && isValidMmr(p2Mmr2) && !isValidMmr(pAboveMmr2)) {
          addCaptain(p1Name);
        }
      }
    }

    // 2. Secondary Discovery: Table Header Matching (Player / MMR) -> row r+1 is Captain
    for (let r = 0; r < sheetGrid.length - 1; r++) {
      for (let c = 0; c < sheetGrid[r].length; c++) {
        const headerCell = (sheetGrid[r][c]?.text || '').trim().toLowerCase();
        const nextHeaderCell = (sheetGrid[r][c + 1]?.text || '').trim().toLowerCase();
        const nextHeaderCell2 = (sheetGrid[r][c + 2]?.text || '').trim().toLowerCase();

        const isHeader =
          (headerCell === 'player' || headerCell === 'players' || headerCell === 'captain' || headerCell === 'name') &&
          (nextHeaderCell.includes('mmr') || nextHeaderCell.includes('rank') || nextHeaderCell2.includes('mmr') || nextHeaderCell === '');

        if (isHeader) {
          const capCell = (sheetGrid[r + 1][c]?.text || '').trim();
          addCaptain(capCell);
        }
      }
    }

    captainsCache.set(cacheKey, captains);
    return captains;
  },

  async fetchTeam({ division, captainName, sheetUrl }: FetchTeamParams): Promise<LeagueTeamResult> {
    if (!sheetUrl) {
      throw new Error('Google Sheet URL is required for Clarity League.');
    }

    const divNum = typeof division === 'number' ? division : parseInt(String(division), 10) || 1;
    const result = await importTeamFromClaritySheet(sheetUrl, divNum, captainName);

    return {
      captainName: result.captainName,
      division: result.division,
      players: result.players
    };
  }
};
