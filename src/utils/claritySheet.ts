import { parseInputForAccountId } from './openDota';

export interface ClarityPlayerItem {
  name: string;
  dotabuffUrl: string;
  accountId: string | null;
  assignedPosition: number; // 1 to 5
}

export interface ClarityTeamResult {
  captainName: string;
  division: number;
  players: ClarityPlayerItem[];
}

/**
 * Validates and extracts Spreadsheet ID from Google Sheets URL.
 */
export function extractSpreadsheetId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  return match && match[1] ? match[1] : null;
}

interface GVizCell {
  v?: string | number | boolean | null;
  f?: string | null;
}

interface GVizRow {
  c: Array<GVizCell | null>;
}

interface GVizTable {
  cols: Array<{ id: string; label: string; type: string }>;
  rows: GVizRow[];
}

interface GVizResponse {
  status: string;
  table?: GVizTable;
  errors?: Array<{ message: string; detailed_message?: string }>;
}

/**
 * Fetches Google Sheet tab data using Google Visualization API (GViz).
 */
export async function fetchGoogleSheetTabData(
  spreadsheetId: string,
  tabName: string
): Promise<Array<Array<string>>> {
  const encodedTab = encodeURIComponent(tabName);
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodedTab}`;

  const response = await fetch(gvizUrl);
  if (!response.ok) {
    throw new Error(`Failed to access Google Sheet (HTTP ${response.status}). Please check sheet sharing permissions.`);
  }

  const text = await response.text();

  // GViz wraps response in: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error('Unable to parse Google Sheet data. Make sure the sheet is public ("Anyone with link can view").');
  }

  const gvizData: GVizResponse = JSON.parse(jsonMatch[1]);
  if (gvizData.status === 'error' || !gvizData.table) {
    const errMsg = gvizData.errors?.[0]?.message || 'Sheet tab not found or private';
    throw new Error(errMsg);
  }

  const rows: Array<Array<string>> = [];
  gvizData.table.rows.forEach((rowObj) => {
    if (!rowObj || !rowObj.c) return;
    const rowValues = rowObj.c.map((cell) => {
      if (!cell) return '';
      // formatted value (f) or raw value (v)
      if (cell.f) return String(cell.f).trim();
      if (cell.v !== null && cell.v !== undefined) return String(cell.v).trim();
      return '';
    });
    rows.push(rowValues);
  });

  return rows;
}

/**
 * Searches for a team by captain name across multiple potential tab variations.
 */
export async function importTeamFromClaritySheet(
  spreadsheetUrl: string,
  divisionNumber: number,
  captainQuery: string
): Promise<ClarityTeamResult> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL. Example: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  }

  const cleanCaptain = captainQuery.trim().toLowerCase();
  if (!cleanCaptain) {
    throw new Error('Please enter a captain name to locate the team.');
  }

  const tabCandidates = [
    `Division ${divisionNumber}`,
    `Div ${divisionNumber}`,
    `Div${divisionNumber}`,
    `Division_${divisionNumber}`,
    `Division${divisionNumber}`,
    `D${divisionNumber}`,
  ];

  let sheetGrid: Array<Array<string>> | null = null;
  let usedTabName = '';
  let lastError: Error | null = null;

  for (const tabName of tabCandidates) {
    try {
      sheetGrid = await fetchGoogleSheetTabData(spreadsheetId, tabName);
      usedTabName = tabName;
      if (sheetGrid && sheetGrid.length > 0) break;
    } catch (e) {
      lastError = e as Error;
    }
  }

  if (!sheetGrid || sheetGrid.length === 0) {
    throw new Error(
      lastError?.message ||
        `Could not find tab for Division ${divisionNumber}. Checked tab names: ${tabCandidates.join(', ')}`
    );
  }

  // Locate the cell matching the captain's name
  let captainRow = -1;
  let captainCol = -1;
  let matchedCaptainName = captainQuery;

  for (let r = 0; r < sheetGrid.length; r++) {
    for (let c = 0; c < sheetGrid[r].length; c++) {
      const cellVal = sheetGrid[r][c].toLowerCase();
      if (cellVal.includes(cleanCaptain) || cleanCaptain.includes(cellVal) && cellVal.length > 2) {
        captainRow = r;
        captainCol = c;
        matchedCaptainName = sheetGrid[r][c] || captainQuery;
        break;
      }
    }
    if (captainRow !== -1) break;
  }

  if (captainRow === -1) {
    throw new Error(
      `Could not locate captain "${captainQuery}" in "${usedTabName}". Please check spelling.`
    );
  }

  // Scan surrounding rows and columns for up to 5 players and their Dotabuff URLs / IDs
  const discoveredPlayers: ClarityPlayerItem[] = [];

  // 1. Scan downwards (vertical team layout) for next 10 rows around captainCol
  for (let r = captainRow; r < Math.min(sheetGrid.length, captainRow + 10); r++) {
    const row = sheetGrid[r];
    // check cells in a window around captainCol (±4 columns)
    const startCol = Math.max(0, captainCol - 2);
    const endCol = Math.min(row.length - 1, captainCol + 6);

    let playerName = '';
    let dbLinkOrId = '';

    for (let c = startCol; c <= endCol; c++) {
      const val = row[c] || '';
      if (!val) continue;

      const id = parseInputForAccountId(val);
      if (id) {
        dbLinkOrId = val;
      } else if (!playerName && val.length > 1 && !val.toLowerCase().includes('mmr') && !val.toLowerCase().includes('pos') && !val.toLowerCase().includes('role')) {
        playerName = val;
      }
    }

    if (dbLinkOrId || playerName) {
      const parsedId = parseInputForAccountId(dbLinkOrId || playerName);
      if (parsedId || playerName) {
        // avoid duplicate entries
        if (!discoveredPlayers.some((p) => (parsedId && p.accountId === parsedId) || p.name === playerName)) {
          discoveredPlayers.push({
            name: playerName || `Player ${discoveredPlayers.length + 1}`,
            dotabuffUrl: dbLinkOrId || (parsedId ? `https://www.dotabuff.com/players/${parsedId}` : ''),
            accountId: parsedId,
            assignedPosition: Math.min(5, discoveredPlayers.length + 1),
          });
        }
      }
    }

    if (discoveredPlayers.length >= 5) break;
  }

  // Pad to 5 if fewer were found
  while (discoveredPlayers.length < 5) {
    discoveredPlayers.push({
      name: `Player ${discoveredPlayers.length + 1}`,
      dotabuffUrl: '',
      accountId: null,
      assignedPosition: discoveredPlayers.length + 1,
    });
  }

  return {
    captainName: matchedCaptainName,
    division: divisionNumber,
    players: discoveredPlayers.slice(0, 5),
  };
}
