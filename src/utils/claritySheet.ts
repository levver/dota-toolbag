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

export interface CellData {
  text: string;
  href?: string;
}

/**
 * Validates and extracts Spreadsheet ID and optional gid from Google Sheets URL.
 */
export function extractSpreadsheetInfo(url: string): { spreadsheetId: string | null; gid: string | null } {
  const trimmed = url.trim();
  if (!trimmed) return { spreadsheetId: null, gid: null };

  const idMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);

  return {
    spreadsheetId: idMatch && idMatch[1] ? idMatch[1] : null,
    gid: gidMatch && gidMatch[1] ? gidMatch[1] : null,
  };
}

/**
 * Generates all candidate tab names for a given division (e.g. "06d _ Division 4", "Division 4", etc.).
 */
export function getTabNameCandidates(divisionNumber: number): string[] {
  const divLetters = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const letter = divLetters[divisionNumber] || '';

  const candidates = [
    // Clarity Season 17 format: "06d _ Division 4"
    `06${letter} _ Division ${divisionNumber}`,
    `06${letter}_Division ${divisionNumber}`,
    `06${letter} - Division ${divisionNumber}`,
    `06${letter}_Division_${divisionNumber}`,
    `06${letter} _ Div ${divisionNumber}`,
    `06${letter}_Div ${divisionNumber}`,
    `06${letter} Division ${divisionNumber}`,
    // Common alternatives
    `Division ${divisionNumber}`,
    `Div ${divisionNumber}`,
    `Division_${divisionNumber}`,
    `Div_${divisionNumber}`,
    `Div${divisionNumber}`,
    `Division${divisionNumber}`,
    `D${divisionNumber}`,
  ];

  return candidates;
}

/**
 * Fetches Google Sheet tab data using HTML export to preserve all hyperlink URLs (<a href="...">).
 */
export async function fetchGoogleSheetHtmlGrid(
  spreadsheetId: string,
  tabNameOrGid: { tabName?: string; gid?: string }
): Promise<Array<Array<CellData>>> {
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:html`;
  if (tabNameOrGid.tabName) {
    url += `&sheet=${encodeURIComponent(tabNameOrGid.tabName)}`;
  } else if (tabNameOrGid.gid) {
    url += `&gid=${tabNameOrGid.gid}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch sheet tab.`);
  }

  const htmlText = await response.text();
  if (htmlText.includes('google.visualization.Query.setResponse') && htmlText.includes('"status":"error"')) {
    throw new Error('Tab not found in sheet.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const trElements = doc.querySelectorAll('table tr');

  if (!trElements || trElements.length === 0) {
    throw new Error('No table data found in sheet tab.');
  }

  const grid: Array<Array<CellData>> = [];
  trElements.forEach((tr) => {
    const row: CellData[] = [];
    const cellElements = tr.querySelectorAll('td, th');
    cellElements.forEach((td) => {
      const link = td.querySelector('a');
      const text = td.textContent?.trim() || '';
      const href = link?.getAttribute('href') || undefined;
      row.push({ text, href });
    });
    grid.push(row);
  });

  return grid;
}

/**
 * Imports 5-player team from a Clarity League Draft Sheet given URL, Division, and Captain name.
 */
export async function importTeamFromClaritySheet(
  spreadsheetUrl: string,
  divisionNumber: number,
  captainQuery: string
): Promise<ClarityTeamResult> {
  const { spreadsheetId, gid } = extractSpreadsheetInfo(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL. Example: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  }

  const cleanCaptain = captainQuery.trim().toLowerCase();
  if (!cleanCaptain) {
    throw new Error('Please enter a captain name to locate the team.');
  }

  const tabCandidates = getTabNameCandidates(divisionNumber);
  let sheetGrid: Array<Array<CellData>> | null = null;
  let usedTabName = '';
  let lastError: Error | null = null;

  // 1. Try URL's gid first if division is unspecified or matches
  if (gid) {
    try {
      sheetGrid = await fetchGoogleSheetHtmlGrid(spreadsheetId, { gid });
      usedTabName = `gid=${gid}`;
    } catch (e) {
      // fallback to tab names
    }
  }

  // 2. Try candidate tab names
  if (!sheetGrid || sheetGrid.length === 0) {
    for (const tabName of tabCandidates) {
      try {
        sheetGrid = await fetchGoogleSheetHtmlGrid(spreadsheetId, { tabName });
        usedTabName = tabName;
        if (sheetGrid && sheetGrid.length > 0) break;
      } catch (e) {
        lastError = e as Error;
      }
    }
  }

  if (!sheetGrid || sheetGrid.length === 0) {
    throw new Error(
      lastError?.message ||
        `Could not find tab for Division ${divisionNumber}. Checked tab names: ${tabCandidates.slice(0, 4).join(', ')}... Make sure the sheet is public.`
    );
  }

  // Find all cells containing captain's name
  interface MatchLocation {
    row: number;
    col: number;
    text: string;
    isTeamBlock: boolean;
  }

  const matches: MatchLocation[] = [];

  for (let r = 0; r < sheetGrid.length; r++) {
    for (let c = 0; c < sheetGrid[r].length; c++) {
      const cellText = sheetGrid[r][c].text.toLowerCase();
      if (cellText && (cellText === cleanCaptain || cellText.includes(cleanCaptain) || cleanCaptain.includes(cellText) && cellText.length >= 3)) {
        // Check if this row or previous row has headers like "Player" / "MMR" / "Dotabuff" nearby
        const prevRow = r > 0 ? sheetGrid[r - 1] : [];
        const isHeaderAbove = prevRow.some((cell) => cell.text.toLowerCase().includes('mmr') || cell.text.toLowerCase().includes('player') || cell.text.toLowerCase().includes('dotabuff'));
        matches.push({
          row: r,
          col: c,
          text: sheetGrid[r][c].text,
          isTeamBlock: isHeaderAbove,
        });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Could not locate captain "${captainQuery}" in Division ${divisionNumber} tab (${usedTabName}). Please check the spelling.`);
  }

  // Prioritize team block matches (where captain is the top player of the 5-player roster)
  const bestMatch = matches.find((m) => m.isTeamBlock) || matches[0];
  const captainRow = bestMatch.row;
  const captainCol = bestMatch.col;
  const matchedCaptainName = bestMatch.text || captainQuery;

  // Extract up to 5 players starting from the captain row
  const discoveredPlayers: ClarityPlayerItem[] = [];

  for (let r = captainRow; r < Math.min(sheetGrid.length, captainRow + 8); r++) {
    const row = sheetGrid[r];
    const startCol = Math.max(0, captainCol - 1);
    const endCol = Math.min(row.length - 1, captainCol + 5);

    let playerName = '';
    let dbLink = '';
    let foundAccountId: string | null = null;

    // Check cells in player's row window
    for (let c = startCol; c <= endCol; c++) {
      const cell = row[c];
      if (!cell) continue;

      // 1. Check href for Dotabuff / OpenDota URL
      if (cell.href) {
        const idFromHref = parseInputForAccountId(cell.href);
        if (idFromHref) {
          foundAccountId = idFromHref;
          dbLink = cell.href;
        }
      }

      // 2. Check text for Dotabuff URL or ID
      if (!foundAccountId && cell.text) {
        const idFromText = parseInputForAccountId(cell.text);
        if (idFromText) {
          foundAccountId = idFromText;
          dbLink = cell.text;
        }
      }

      // 3. Name extraction (first non-numeric, non-header string in player column)
      if (!playerName && cell.text && !cell.text.toLowerCase().includes('average') && !cell.text.toLowerCase().includes('db link') && !cell.text.toLowerCase().includes('mmr') && !cell.text.toLowerCase().includes('coins')) {
        // Exclude purely numeric MMR / coins values
        if (!/^\d+$/.test(cell.text.trim())) {
          playerName = cell.text.trim();
        }
      }
    }

    // If we found a player name or link, add to roster
    if (playerName || foundAccountId) {
      // Avoid adding "Average MMR" row
      if (playerName.toLowerCase().includes('average')) {
        break;
      }

      if (!discoveredPlayers.some((p) => (foundAccountId && p.accountId === foundAccountId) || (playerName && p.name.toLowerCase() === playerName.toLowerCase()))) {
        discoveredPlayers.push({
          name: playerName || (r === captainRow ? matchedCaptainName : `Player ${discoveredPlayers.length + 1}`),
          dotabuffUrl: dbLink || (foundAccountId ? `https://www.dotabuff.com/players/${foundAccountId}` : ''),
          accountId: foundAccountId,
          assignedPosition: Math.min(5, discoveredPlayers.length + 1),
        });
      }
    }

    if (discoveredPlayers.length >= 5) break;
  }

  // Fallback pad to 5 players if fewer were detected
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
