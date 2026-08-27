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
      'pos 3', 'pos 4', 'pos 5', 'pos', 'role', 'name', 'account id', 'id', 'role/rank', 'false', 'true',
      'average mmr', 'averagemmr', 'total mmr', 'avg mmr'
    ]);

    const addCaptain = (rawName: string) => {
      if (!rawName) return;
      const cleaned = cleanPlayerName(rawName);
      const norm = normalizeName(cleaned);
      if (
        cleaned &&
        norm.length >= 2 &&
        !ignoreWords.has(norm) &&
        !norm.startsWith('average') &&
        !norm.startsWith('total') &&
        !/^\d+$/.test(cleaned) &&
        !seen.has(norm)
      ) {
        seen.add(norm);
        captains.push(cleaned);
      }
    };

    // Extract the row immediately below each cell whose header is "Player" / "Players" / "Player Name" / "Captain"
    for (let r = 0; r < sheetGrid.length - 1; r++) {
      for (let c = 0; c < sheetGrid[r].length; c++) {
        const rawText = (sheetGrid[r][c]?.text || '').trim();
        const normHeader = normalizeName(rawText);

        const isPlayerHeader =
          normHeader === 'player' ||
          normHeader === 'players' ||
          normHeader === 'playername' ||
          normHeader === 'captain' ||
          normHeader === 'playerc';

        if (isPlayerHeader) {
          const capCell = (sheetGrid[r + 1]?.[c]?.text || sheetGrid[r + 2]?.[c]?.text || '').trim();
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
