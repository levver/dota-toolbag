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
  cleanPlayerName,
  isValidMmr,
  CellValue
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

function getCellMmr(cell: CellValue | undefined): number | null {
  if (!cell) return null;
  if (typeof cell.num === 'number' && isValidMmr(cell.num)) {
    return cell.num;
  }
  if (cell.text && isValidMmr(cell.text)) {
    return parseInt(cell.text.replace(/,/g, '').trim(), 10);
  }
  return null;
}

function hasMmrAtCol(row: CellValue[] | undefined, col: number): boolean {
  if (!row || col >= row.length) return false;
  return getCellMmr(row[col]) !== null;
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

    let sheetGrid: CellValue[][] | null = null;
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

    // 1. Primary Discovery: Locate team block by MMR sequence (row r has MMR, row r+1 has MMR, row r-1 does NOT have MMR)
    for (let r = 0; r < sheetGrid.length - 1; r++) {
      for (let c = 0; c < sheetGrid[r].length; c++) {
        const p1Name = (sheetGrid[r][c]?.text || '').trim();

        // Check if MMR is in col c+1
        const mmr1 = hasMmrAtCol(sheetGrid[r], c + 1);
        const mmr2 = hasMmrAtCol(sheetGrid[r + 1], c + 1);
        const mmrAbove = r > 0 ? hasMmrAtCol(sheetGrid[r - 1], c + 1) : false;

        if (mmr1 && mmr2 && !mmrAbove) {
          addCaptain(p1Name);
        }

        // Check if MMR is in col c+2 (e.g. role/rank in c+1)
        const mmr1_2 = hasMmrAtCol(sheetGrid[r], c + 2);
        const mmr2_2 = hasMmrAtCol(sheetGrid[r + 1], c + 2);
        const mmrAbove_2 = r > 0 ? hasMmrAtCol(sheetGrid[r - 1], c + 2) : false;

        if (mmr1_2 && mmr2_2 && !mmrAbove_2) {
          addCaptain(p1Name);
        }
      }
    }

    // 2. Secondary Discovery: Header-based matching fallback
    if (captains.length === 0) {
      for (let r = 0; r < sheetGrid.length - 1; r++) {
        for (let c = 0; c < sheetGrid[r].length; c++) {
          const headerCell = (sheetGrid[r][c]?.text || '').trim().toLowerCase();
          const nextHeader1 = (sheetGrid[r][c + 1]?.text || '').trim().toLowerCase();
          const nextHeader2 = (sheetGrid[r][c + 2]?.text || '').trim().toLowerCase();

          const isPlayerHeader =
            headerCell.includes('player') || headerCell.includes('captain') || headerCell.includes('name');
          const isMmrHeader =
            nextHeader1.includes('mmr') || nextHeader1.includes('rank') || nextHeader2.includes('mmr');

          if (isPlayerHeader && isMmrHeader) {
            const capCell = (sheetGrid[r + 1][c]?.text || '').trim();
            addCaptain(capCell);
          }
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
