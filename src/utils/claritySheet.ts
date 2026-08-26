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

export interface CellValue {
  text: string;
  num?: number;
}

/**
 * Normalizes string for fuzzy / cross-sheet matching (lowercase, removes all non-alphanumeric).
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts numerical Dota 2 account ID from Dotabuff / OpenDota URL or raw account ID string.
 */
export function extractDotaAccountId(val: string): string | null {
  if (!val) return null;
  const str = String(val).trim();

  try {
    const decoded = decodeURIComponent(str);
    const match =
      decoded.match(/(?:dotabuff\.com|opendota\.com)\/players\/(\d+)/i) ||
      decoded.match(/players\/(\d+)/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    const match = str.match(/players\/(\d+)/i);
    if (match && match[1]) return match[1];
  }

  // Pure 6-10 digit account ID
  if (/^\d{6,10}$/.test(str)) {
    return str;
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

interface GVizCell {
  v?: string | number | boolean | null;
  f?: string | null;
}

interface GVizRow {
  c?: Array<GVizCell | null>;
}

interface GVizResponse {
  status: string;
  table?: {
    rows?: GVizRow[];
  };
  errors?: Array<{ message: string; detailed_message?: string }>;
}

/**
 * Fetches Google Sheet tab data using Google Visualization API JSON (guaranteed CORS support).
 */
export async function fetchGVizJsonGrid(
  spreadsheetId: string,
  tabNameOrGid: { tabName?: string; gid?: string }
): Promise<Array<Array<CellValue>>> {
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  if (tabNameOrGid.tabName) {
    url += `&sheet=${encodeURIComponent(tabNameOrGid.tabName)}`;
  } else if (tabNameOrGid.gid) {
    url += `&gid=${tabNameOrGid.gid}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Unable to fetch sheet. Check sheet sharing settings.`);
  }

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
  if (!match || !match[1]) {
    throw new Error('Unable to parse sheet response. Ensure sheet is set to "Anyone with the link can view".');
  }

  const data: GVizResponse = JSON.parse(match[1]);
  if (data.status === 'error' || !data.table || !data.table.rows) {
    const msg = data.errors?.[0]?.message || 'Tab not found';
    throw new Error(msg);
  }

  const grid: Array<Array<CellValue>> = [];
  data.table.rows.forEach((rowObj) => {
    if (!rowObj || !rowObj.c) return;
    const row: CellValue[] = [];
    rowObj.c.forEach((cell) => {
      if (!cell) {
        row.push({ text: '' });
        return;
      }

      let textVal = '';
      if (cell.f !== null && cell.f !== undefined) {
        textVal = String(cell.f).trim();
      } else if (cell.v !== null && cell.v !== undefined) {
        textVal = String(cell.v).trim();
      }

      let numVal: number | undefined;
      if (typeof cell.v === 'number') {
        numVal = cell.v;
      } else if (/^\d+(\.\d+)?$/.test(textVal)) {
        numVal = parseFloat(textVal);
      }

      row.push({ text: textVal, num: numVal });
    });
    grid.push(row);
  });

  return grid;
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
 * Master player map cache by spreadsheetId.
 */
let masterPlayerMapCache: {
  spreadsheetId: string;
  map: Map<string, { accountId: string; dotabuffUrl: string; mmr?: number; originalName: string }>;
} | null = null;

/**
 * Fetches and builds master player dictionary across all registration/master tabs.
 */
export async function fetchMasterPlayerMap(
  spreadsheetId: string
): Promise<Map<string, { accountId: string; dotabuffUrl: string; mmr?: number; originalName: string }>> {
  if (masterPlayerMapCache && masterPlayerMapCache.spreadsheetId === spreadsheetId) {
    return masterPlayerMapCache.map;
  }

  const map = new Map<string, { accountId: string; dotabuffUrl: string; mmr?: number; originalName: string }>();

  const masterTabCandidates = [
    '05 _ Full Account List',
    '05_Full Account List',
    '05 - Full Account List',
    '04a _ Player List',
    '04a_Player List',
    '04a - Player List',
    '04b _ Player List (MMR Sorted)',
    '04b_Player List (MMR Sorted)',
    '03 _ Final Responses',
    '03_Final Responses',
    'Full Account List',
    'Player List',
    'Players',
    'Accounts',
    'Account List',
  ];

  for (const tabName of masterTabCandidates) {
    try {
      const grid = await fetchGVizJsonGrid(spreadsheetId, { tabName });
      if (grid && grid.length > 1) {
        grid.forEach((row) => {
          let foundId: string | null = null;
          let foundUrl = '';
          let mmr: number | undefined;
          const candidateNames: string[] = [];

          row.forEach((cell) => {
            if (!cell.text) return;

            // 1. Check for Dotabuff / OpenDota URL or Account ID
            const id = extractDotaAccountId(cell.text);
            if (id) {
              foundId = id;
              foundUrl = cell.text.startsWith('http') ? cell.text : `https://www.dotabuff.com/players/${id}`;
            }

            // 2. Check for MMR
            if (cell.num && cell.num >= 400 && cell.num <= 16000 && !foundId) {
              mmr = cell.num;
            } else if (/^\d{3,5}$/.test(cell.text.trim()) && !foundId) {
              const p = parseInt(cell.text.trim(), 10);
              if (p >= 400 && p <= 16000) mmr = p;
            }

            // 3. Name candidates (any non-header, non-id, non-numeric string)
            const low = cell.text.toLowerCase();
            if (
              !low.includes('dotabuff') &&
              !low.includes('db link') &&
              !low.includes('opendota') &&
              !low.includes('steamcommunity') &&
              !low.includes('http') &&
              !low.includes('mmr') &&
              !low.includes('coins') &&
              !low.includes('role') &&
              !low.includes('pos') &&
              !/^\d+$/.test(cell.text) &&
              cell.text.length >= 2
            ) {
              candidateNames.push(cell.text.trim());
            }
          });

          if (foundId && candidateNames.length > 0) {
            const primaryName = candidateNames[0];
            candidateNames.forEach((n) => {
              const norm = normalizeName(n);
              if (norm.length >= 2) {
                map.set(norm, {
                  accountId: foundId!,
                  dotabuffUrl: foundUrl,
                  mmr,
                  originalName: primaryName,
                });
              }
            });
          }
        });

        if (map.size >= 5) {
          break; // Successfully indexed master player list
        }
      }
    } catch {
      // Continue searching next master tab candidate
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
  const normCaptain = normalizeName(captainQuery);
  if (!cleanCaptain) {
    throw new Error('Please enter a captain name to locate the team.');
  }

  const tabCandidates = getTabNameCandidates(divisionNumber);
  let sheetGrid: Array<Array<CellValue>> | null = null;
  let usedTabName = '';
  let lastError: Error | null = null;

  // 1. Try URL's gid first if provided
  if (gid) {
    try {
      sheetGrid = await fetchGVizJsonGrid(spreadsheetId, { gid });
      usedTabName = `gid=${gid}`;
    } catch {
      // fallback to tab names
    }
  }

  // 2. Try candidate tab names
  if (!sheetGrid || sheetGrid.length === 0) {
    for (const tabName of tabCandidates) {
      try {
        sheetGrid = await fetchGVizJsonGrid(spreadsheetId, { tabName });
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

  // Pre-fetch master player dictionary for resolving Dotabuff links
  const masterPlayerMap = await fetchMasterPlayerMap(spreadsheetId);

  // Score candidate locations of the captain name to isolate the 5-player TEAM BLOCK (not the summary table)
  interface TeamMatch {
    row: number;
    col: number;
    text: string;
    score: number;
  }

  const candidates: TeamMatch[] = [];

  for (let r = 0; r < sheetGrid.length; r++) {
    for (let c = 0; c < sheetGrid[r].length; c++) {
      const cellText = sheetGrid[r][c].text.toLowerCase();
      const normCell = normalizeName(cellText);

      if (
        cellText &&
        (cellText === cleanCaptain ||
          normCell === normCaptain ||
          cellText.includes(cleanCaptain) ||
          cleanCaptain.includes(cellText) && cellText.length >= 3)
      ) {
        let score = 0;
        const row = sheetGrid[r];
        const nextCell1 = row[c + 1]?.text || '';
        const nextCell2 = row[c + 2]?.text.toLowerCase() || '';
        const prevRow = r > 0 ? sheetGrid[r - 1] : [];

        // MMR in adjacent column (e.g. 2326, 2950)
        if (/^\d{3,5}$/.test(nextCell1.replace(/,/g, '').trim())) {
          score += 30;
        }

        // DB Link / Dotabuff in c + 2
        if (nextCell2.includes('db') || nextCell2.includes('dotabuff') || nextCell2.includes('link')) {
          score += 25;
        }

        // Header row above (r - 1) has "Player", "MMR", or "Dotabuff"
        const prevHeaderMatch = prevRow.some(
          (h) =>
            h.text.toLowerCase().includes('mmr') ||
            h.text.toLowerCase().includes('player') ||
            h.text.toLowerCase().includes('dotabuff')
        );
        if (prevHeaderMatch) {
          score += 30;
        }

        // Penalty if this is the summary table on the left (e.g. adjacent cell is a team name string like "Shifting Paradigms")
        if (nextCell1.length > 4 && !/^\d+$/.test(nextCell1.replace(/,/g, ''))) {
          score -= 30;
        }

        candidates.push({
          row: r,
          col: c,
          text: sheetGrid[r][c].text,
          score,
        });
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(`Could not locate captain "${captainQuery}" in Division ${divisionNumber} tab (${usedTabName}). Please check spelling.`);
  }

  // Sort candidates by highest score to isolate the true team block
  candidates.sort((a, b) => b.score - a.score);
  const bestMatch = candidates[0];
  const captainRow = bestMatch.row;
  const captainCol = bestMatch.col;
  const matchedCaptainName = bestMatch.text || captainQuery;

  // Detect column mapping for this team block (Player Col = Col 0, MMR Col = Col 1, DB Col = Col 2)
  let playerCol = captainCol;
  let mmrCol = captainCol + 1;
  let dbCol = captainCol + 2;

  // Confirm exact columns from header row above (if present)
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

    // Stop if we encounter "Average MMR"
    if (pName.toLowerCase().includes('average') || pName.toLowerCase().includes('mmr:')) {
      break;
    }

    // Extract MMR
    let mmrNum: number | null = null;
    const rawMmr = mmrCell.text.replace(/,/g, '').trim();
    if (/^\d+$/.test(rawMmr)) {
      mmrNum = parseInt(rawMmr, 10);
    } else if (mmrCell.num) {
      mmrNum = Math.round(mmrCell.num);
    }

    // Extract Dotabuff Link & Account ID
    let foundId: string | null = null;
    let foundUrl = '';

    // 1. Direct check on dbCell text
    if (dbCell.text) {
      foundId = extractDotaAccountId(dbCell.text);
      if (foundId) {
        foundUrl = dbCell.text.startsWith('http') ? dbCell.text : `https://www.dotabuff.com/players/${foundId}`;
      }
    }

    // 2. Resolve via master player dictionary by normalized player name
    if (!foundId && pName) {
      const norm = normalizeName(pName);
      const masterInfo = masterPlayerMap.get(norm);
      if (masterInfo) {
        foundId = masterInfo.accountId;
        foundUrl = masterInfo.dotabuffUrl;
        if (!mmrNum && masterInfo.mmr) mmrNum = masterInfo.mmr;
      } else {
        // Fuzzy search across master player dictionary
        for (const [key, val] of masterPlayerMap.entries()) {
          if (key === norm || key.includes(norm) || norm.includes(key)) {
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

  // Pad to 5 players if needed
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
