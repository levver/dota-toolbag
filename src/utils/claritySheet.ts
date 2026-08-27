export interface ClarityPlayerItem {
  name: string;
  mmr: number | null;
  rankText: string;
  dotabuffUrl: string;
  accountId: string | null;
  assignedPosition: number;
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

export function normalizeName(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extractDotaAccountId(val: string): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/players\/(\d+)/i) || str.match(/(?:dotabuff\.com|opendota\.com)\/players\/(\d+)/i);
  if (match && match[1]) return match[1];
  if (/^\d{6,10}$/.test(str)) return str;
  return null;
}

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

export function extractSpreadsheetInfo(url: string): { spreadsheetId: string | null; gid: string | null } {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
  return {
    spreadsheetId: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : null,
  };
}

/**
 * Fetches Google Sheet tab data using Google Visualization JSON endpoint.
 */
export async function fetchGVizGrid(
  spreadsheetId: string,
  tabNameOrGid: { tabName?: string; gid?: string }
): Promise<CellValue[][]> {
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  if (tabNameOrGid.tabName) {
    url += `&sheet=${encodeURIComponent(tabNameOrGid.tabName)}`;
  } else if (tabNameOrGid.gid) {
    url += `&gid=${tabNameOrGid.gid}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: Unable to fetch sheet.`);

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
  if (!match || !match[1]) throw new Error('Unable to parse sheet response.');

  const data = JSON.parse(match[1]);
  if (data.status === 'error' || !data.table?.rows) {
    throw new Error(data.errors?.[0]?.message || 'Tab not found');
  }

  return data.table.rows.map((rowObj: { c?: Array<{ v?: unknown; f?: string } | null> }) => {
    if (!rowObj?.c) return [];
    return rowObj.c.map((cell) => {
      if (!cell) return { text: '' };
      const textVal = cell.f ?? (cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : '');
      const numVal = typeof cell.v === 'number' ? cell.v : (/^\d+(\.\d+)?$/.test(textVal) ? parseFloat(textVal) : undefined);
      return { text: textVal, num: numVal };
    });
  });
}

let masterMapCache: { spreadsheetId: string; map: Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }> } | null = null;

/**
 * Fast master player lookup: checks '04a _ Player List' first, only falling back if needed.
 */
export async function fetchMasterPlayerMap(
  spreadsheetId: string
): Promise<Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>> {
  if (masterMapCache?.spreadsheetId === spreadsheetId) return masterMapCache.map;

  const map = new Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>();
  const tabs = ['04a _ Player List', '04a_Player List', '05 _ Full Account List', '03 _ Final Responses'];

  for (const tabName of tabs) {
    try {
      const grid = await fetchGVizGrid(spreadsheetId, { tabName });
      if (grid && grid.length > 1) {
        grid.forEach((row) => {
          let foundId: string | null = null;
          let mmr: number | undefined;
          const names: string[] = [];

          row.forEach((cell) => {
            if (!cell.text) return;
            const id = extractDotaAccountId(cell.text);
            if (id) foundId = id;

            if (cell.num && cell.num >= 400 && cell.num <= 16000 && !foundId) {
              mmr = Math.round(cell.num);
            }

            const low = cell.text.toLowerCase();
            if (!low.includes('dotabuff') && !low.includes('db link') && !low.includes('opendota') && !low.includes('http') && !low.includes('mmr') && !low.includes('coins') && !/^\d+$/.test(cell.text) && cell.text.length >= 2) {
              names.push(cell.text.trim());
            }
          });

          if (foundId && names.length > 0) {
            names.forEach((n) => {
              const norm = normalizeName(n);
              if (norm.length >= 2 && !map.has(norm)) {
                map.set(norm, {
                  accountId: foundId!,
                  dotabuffUrl: `https://www.dotabuff.com/players/${foundId}`,
                  mmr,
                });
              }
            });
          }
        });

        if (map.size > 0) break; // Priority tab succeeded
      }
    } catch {
      // fallback to next tab
    }
  }

  masterMapCache = { spreadsheetId, map };
  return map;
}

/**
 * Imports 5-player team from Clarity Draft Sheet.
 */
export async function importTeamFromClaritySheet(
  spreadsheetUrl: string,
  divisionNumber: number,
  captainQuery: string
): Promise<ClarityTeamResult> {
  const { spreadsheetId, gid } = extractSpreadsheetInfo(spreadsheetUrl);
  if (!spreadsheetId) throw new Error('Invalid Google Sheets URL.');

  const cleanCaptain = captainQuery.trim().toLowerCase();
  const normCaptain = normalizeName(captainQuery);
  if (!cleanCaptain) throw new Error('Please enter a captain name.');

  const divLetter = ['', 'a', 'b', 'c', 'd', 'e', 'f'][divisionNumber] || '';
  const tabCandidates = [
    `06${divLetter} _ Division ${divisionNumber}`,
    `06${divLetter}_Division ${divisionNumber}`,
    `Division ${divisionNumber}`,
    `Div ${divisionNumber}`,
  ];

  let sheetGrid: CellValue[][] | null = null;
  let usedTab = '';

  if (gid) {
    try {
      sheetGrid = await fetchGVizGrid(spreadsheetId, { gid });
      usedTab = `gid=${gid}`;
    } catch {}
  }

  if (!sheetGrid) {
    for (const tab of tabCandidates) {
      try {
        sheetGrid = await fetchGVizGrid(spreadsheetId, { tabName: tab });
        usedTab = tab;
        if (sheetGrid.length > 0) break;
      } catch {}
    }
  }

  if (!sheetGrid || sheetGrid.length === 0) {
    throw new Error(`Could not find tab for Division ${divisionNumber}. Checked: ${tabCandidates.join(', ')}`);
  }

  const masterMap = await fetchMasterPlayerMap(spreadsheetId);

  // Locate true team block (scored against summary table)
  interface Match { row: number; col: number; text: string; score: number }
  const matches: Match[] = [];

  for (let r = 0; r < sheetGrid.length; r++) {
    for (let c = 0; c < sheetGrid[r].length; c++) {
      const text = sheetGrid[r][c].text.toLowerCase();
      const norm = normalizeName(text);
      if (text && (text === cleanCaptain || norm === normCaptain || (normCaptain.length >= 3 && norm.includes(normCaptain)))) {
        let score = 0;
        const row = sheetGrid[r];
        const next1 = row[c + 1]?.text || '';
        const next2 = row[c + 2]?.text.toLowerCase() || '';
        const prev = r > 0 ? sheetGrid[r - 1] : [];

        if (/^\d{3,5}$/.test(next1.replace(/,/g, '').trim())) score += 30;
        if (next2.includes('db') || next2.includes('dotabuff') || next2.includes('link')) score += 25;
        if (prev.some((h) => h.text.toLowerCase().includes('player') || h.text.toLowerCase().includes('mmr'))) score += 30;
        if (next1.length > 4 && !/^\d+$/.test(next1.replace(/,/g, ''))) score -= 30;

        matches.push({ row: r, col: c, text: sheetGrid[r][c].text, score });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Could not find captain "${captainQuery}" in Division ${divisionNumber} tab (${usedTab}).`);
  }

  matches.sort((a, b) => b.score - a.score);
  const { row: captainRow, col: captainCol, text: matchedCaptainName } = matches[0];

  let playerCol = captainCol, mmrCol = captainCol + 1, dbCol = captainCol + 2;
  if (captainRow > 0) {
    const h = sheetGrid[captainRow - 1];
    for (let c = Math.max(0, captainCol - 2); c <= Math.min(h.length - 1, captainCol + 4); c++) {
      const ht = h[c]?.text.toLowerCase() || '';
      if (ht.includes('player')) playerCol = c;
      if (ht.includes('mmr')) mmrCol = c;
      if (ht.includes('dotabuff') || ht.includes('db')) dbCol = c;
    }
  }

  const players: ClarityPlayerItem[] = [];

  for (let offset = 0; offset < 5; offset++) {
    const r = captainRow + offset;
    if (r >= sheetGrid.length) break;

    const row = sheetGrid[r];
    const pName = (row[playerCol]?.text.trim()) || (offset === 0 ? matchedCaptainName : '');
    if (pName.toLowerCase().includes('average') || pName.toLowerCase().includes('mmr:')) break;

    let mmrNum: number | null = null;
    const rawMmr = (row[mmrCol]?.text || '').replace(/,/g, '').trim();
    if (/^\d+$/.test(rawMmr)) mmrNum = parseInt(rawMmr, 10);
    else if (row[mmrCol]?.num) mmrNum = Math.round(row[mmrCol]!.num!);

    let foundId = extractDotaAccountId(row[dbCol]?.text || '');

    if (!foundId && pName) {
      const norm = normalizeName(pName);
      const master = masterMap.get(norm);
      if (master) {
        foundId = master.accountId;
        if (!mmrNum && master.mmr) mmrNum = master.mmr;
      } else {
        for (const [key, val] of masterMap.entries()) {
          if (key === norm || (norm.length >= 3 && (key.includes(norm) || norm.includes(key)))) {
            foundId = val.accountId;
            if (!mmrNum && val.mmr) mmrNum = val.mmr;
            break;
          }
        }
      }
    }

    players.push({
      name: pName || `Player ${offset + 1}`,
      mmr: mmrNum,
      rankText: getRankFromMmr(mmrNum),
      dotabuffUrl: foundId ? `https://www.dotabuff.com/players/${foundId}` : '',
      accountId: foundId,
      assignedPosition: offset + 1,
    });
  }

  while (players.length < 5) {
    const idx = players.length + 1;
    players.push({ name: `Player ${idx}`, mmr: null, rankText: 'Unranked', dotabuffUrl: '', accountId: null, assignedPosition: idx });
  }

  return {
    captainName: matchedCaptainName,
    division: divisionNumber,
    players,
  };
}
