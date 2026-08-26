export interface ClarityPlayerItem {
  name: string;
  mmr: number | null;
  rankText: string;
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
 * Extracts numerical Dota 2 account ID from Dotabuff / OpenDota URL or Google redirect URL.
 */
export function extractDotaAccountId(hrefOrText: string): string | null {
  if (!hrefOrText) return null;
  try {
    const decoded = decodeURIComponent(hrefOrText);
    const match =
      decoded.match(/(?:dotabuff\.com|opendota\.com)\/players\/(\d+)/i) ||
      decoded.match(/players\/(\d+)/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    const match = hrefOrText.match(/players\/(\d+)/i);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Computes approximate Dota 2 rank badge text from MMR.
 */
export function getRankFromMmr(mmr: number | null): string {
  if (!mmr || isNaN(mmr) || mmr <= 0) return 'Unranked';
  if (mmr < 770) return `Herald (${mmr.toLocaleString()})`;
  if (mmr < 1540) return `Guardian (${mmr.toLocaleString()})`;
  if (mmr < 2310) return `Crusader (${mmr.toLocaleString()})`;
  if (mmr < 3080) return `Archon (${mmr.toLocaleString()})`;
  if (mmr < 3850) return `Legend (${mmr.toLocaleString()})`;
  if (mmr < 4620) return `Ancient (${mmr.toLocaleString()})`;
  if (mmr < 5420) return `Divine (${mmr.toLocaleString()})`;
  return `Immortal (${mmr.toLocaleString()})`;
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

  return [
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
 * Master player map cache by spreadsheetId.
 */
let masterPlayerMapCache: {
  spreadsheetId: string;
  map: Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>;
} | null = null;

/**
 * Fetches the master account list / player list tab from the sheet to resolve VLOOKUP formulas.
 */
export async function fetchMasterPlayerMap(
  spreadsheetId: string
): Promise<Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>> {
  if (masterPlayerMapCache && masterPlayerMapCache.spreadsheetId === spreadsheetId) {
    return masterPlayerMapCache.map;
  }

  const map = new Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>();

  const masterTabCandidates = [
    '05 _ Full Account List',
    '05_Full Account List',
    'Full Account List',
    '04a _ Player List',
    '04a_Player List',
    '04b _ Player List (MMR Sorted)',
    '04b_Player List (MMR Sorted)',
    'Player List',
    'Players',
    'Accounts',
    'Account List',
  ];

  for (const tabName of masterTabCandidates) {
    try {
      const grid = await fetchGoogleSheetHtmlGrid(spreadsheetId, { tabName });
      if (grid && grid.length > 1) {
        grid.forEach((row) => {
          let foundId: string | null = null;
          let foundUrl = '';
          let playerName = '';
          let mmr: number | undefined;

          row.forEach((cell) => {
            // Check for link in href or text
            if (cell.href) {
              const id = extractDotaAccountId(cell.href);
              if (id) {
                foundId = id;
                foundUrl = cell.href;
              }
            }
            if (!foundId && cell.text) {
              const id = extractDotaAccountId(cell.text);
              if (id) {
                foundId = id;
                foundUrl = cell.text;
              }
            }

            // Check for MMR (3 to 5 digits)
            if (/^\d{3,5}$/.test(cell.text.trim()) && !foundId) {
              const parsed = parseInt(cell.text.trim(), 10);
              if (parsed > 400 && parsed < 16000) {
                mmr = parsed;
              }
            }

            // Name (first non-numeric string that isn't a header)
            if (
              !playerName &&
              cell.text &&
              !cell.text.toLowerCase().includes('dotabuff') &&
              !cell.text.toLowerCase().includes('db link') &&
              !cell.text.toLowerCase().includes('mmr') &&
              !cell.text.toLowerCase().includes('player') &&
              !cell.text.toLowerCase().includes('discord') &&
              !cell.text.toLowerCase().includes('steam') &&
              !/^\d+$/.test(cell.text)
            ) {
              playerName = cell.text.trim();
            }
          });

          if (playerName && foundId) {
            const cleanKey = playerName.toLowerCase().trim();
            if (!map.has(cleanKey)) {
              map.set(cleanKey, {
                accountId: foundId,
                dotabuffUrl: foundUrl.startsWith('http') ? foundUrl : `https://www.dotabuff.com/players/${foundId}`,
                mmr,
              });
            }
          }
        });

        if (map.size > 10) {
          break; // Found good master list
        }
      }
    } catch (e) {
      // Try next master tab candidate
    }
  }

  masterPlayerMapCache = { spreadsheetId, map };
  return map;
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

  // 1. Try URL's gid first if provided
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

  // Also fetch the master player map asynchronously to resolve VLOOKUP / DB Link formulas
  const masterPlayerMap = await fetchMasterPlayerMap(spreadsheetId);

  // Find all cells matching the captain's name
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
      if (cellText && (cellText === cleanCaptain || cellText.includes(cleanCaptain) || (cleanCaptain.includes(cellText) && cellText.length >= 3))) {
        // Check if header row above or nearby contains "Player", "MMR", "Dotabuff"
        const prevRow = r > 0 ? sheetGrid[r - 1] : [];
        const isHeaderAbove = prevRow.some(
          (cell) =>
            cell.text.toLowerCase().includes('mmr') ||
            cell.text.toLowerCase().includes('player') ||
            cell.text.toLowerCase().includes('dotabuff')
        );
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
    throw new Error(`Could not locate captain "${captainQuery}" in Division ${divisionNumber} tab (${usedTabName}). Please check spelling.`);
  }

  // Prioritize team block matches (where captain is the top player of the 5-player group)
  const bestMatch = matches.find((m) => m.isTeamBlock) || matches[0];
  const captainRow = bestMatch.row;
  const captainCol = bestMatch.col;
  const matchedCaptainName = bestMatch.text || captainQuery;

  // Detect column mapping for this team block (Player Col = Col 0, MMR Col = Col 1, DB Col = Col 2)
  let playerCol = captainCol;
  let mmrCol = captainCol + 1;
  let dbCol = captainCol + 2;

  // Check header row above captain (if present) to confirm exact column indices
  if (captainRow > 0) {
    const headerRow = sheetGrid[captainRow - 1];
    for (let c = Math.max(0, captainCol - 2); c <= Math.min(headerRow.length - 1, captainCol + 4); c++) {
      const hText = headerRow[c]?.text.toLowerCase() || '';
      if (hText.includes('player')) playerCol = c;
      if (hText.includes('mmr')) mmrCol = c;
      if (hText.includes('dotabuff') || hText.includes('db')) dbCol = c;
    }
  }

  const discoveredPlayers: ClarityPlayerItem[] = [];

  // Iterate down 5 player rows from captainRow
  for (let offset = 0; offset < 5; offset++) {
    const r = captainRow + offset;
    if (r >= sheetGrid.length) break;

    const row = sheetGrid[r];
    const nameCell = row[playerCol] || { text: '' };
    const mmrCell = row[mmrCol] || { text: '' };
    const dbCell = row[dbCol] || { text: '' };

    let pName = nameCell.text.trim();
    if (!pName && offset === 0) pName = matchedCaptainName;

    // Check if we hit "Average MMR"
    if (pName.toLowerCase().includes('average') || pName.toLowerCase().includes('mmr:')) {
      break;
    }

    // Extract MMR
    let mmrNum: number | null = null;
    const rawMmr = mmrCell.text.replace(/,/g, '').trim();
    if (/^\d+$/.test(rawMmr)) {
      mmrNum = parseInt(rawMmr, 10);
    }

    // Extract Dotabuff Link & Account ID
    let foundId: string | null = null;
    let foundUrl = '';

    // 1. From dbCell href
    if (dbCell.href) {
      foundId = extractDotaAccountId(dbCell.href);
      if (foundId) foundUrl = dbCell.href;
    }

    // 2. From dbCell text if it has a URL
    if (!foundId && dbCell.text) {
      foundId = extractDotaAccountId(dbCell.text);
      if (foundId) foundUrl = dbCell.text;
    }

    // 3. Look up player name in master player map (resolves VLOOKUP / lookup statements)
    if (!foundId && pName) {
      const masterInfo = masterPlayerMap.get(pName.toLowerCase());
      if (masterInfo) {
        foundId = masterInfo.accountId;
        foundUrl = masterInfo.dotabuffUrl;
        if (!mmrNum && masterInfo.mmr) mmrNum = masterInfo.mmr;
      } else {
        // Partial/fuzzy match across master player map keys
        for (const [key, val] of masterPlayerMap.entries()) {
          if (key.includes(pName.toLowerCase()) || pName.toLowerCase().includes(key)) {
            foundId = val.accountId;
            foundUrl = val.dotabuffUrl;
            if (!mmrNum && val.mmr) mmrNum = val.mmr;
            break;
          }
        }
      }
    }

    if (foundId && !foundUrl.startsWith('http')) {
      foundUrl = `https://www.dotabuff.com/players/${foundId}`;
    }

    discoveredPlayers.push({
      name: pName || `Player ${offset + 1}`,
      mmr: mmrNum,
      rankText: getRankFromMmr(mmrNum),
      dotabuffUrl: foundUrl || (foundId ? `https://www.dotabuff.com/players/${foundId}` : ''),
      accountId: foundId,
      assignedPosition: offset + 1,
    });
  }

  // Pad to 5 players if fewer than 5 rows existed
  while (discoveredPlayers.length < 5) {
    const idx = discoveredPlayers.length + 1;
    discoveredPlayers.push({
      name: `Player ${idx}`,
      mmr: null,
      rankText: 'Unranked',
      dotabuffUrl: '',
      accountId: null,
      assignedPosition: idx,
    });
  }

  return {
    captainName: matchedCaptainName,
    division: divisionNumber,
    players: discoveredPlayers,
  };
}
