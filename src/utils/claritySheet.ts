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

export const MIN_VALID_MMR = 1;
export const MAX_VALID_MMR = 16000;
export const MIN_ACCOUNT_ID = 20000;
export const TEAM_SIZE = 5;

export const RANK_THRESHOLDS = {
  HERALD: 770,
  GUARDIAN: 1540,
  CRUSADER: 2310,
  ARCHON: 3080,
  LEGEND: 3850,
  ANCIENT: 4620,
  DIVINE: 5420,
} as const;

export function isValidMmr(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') {
    return !isNaN(val) && val >= MIN_VALID_MMR && val <= MAX_VALID_MMR;
  }
  const clean = String(val).replace(/,/g, '').trim();
  if (!/^\d+$/.test(clean)) return false;
  const num = parseInt(clean, 10);
  return num >= MIN_VALID_MMR && num <= MAX_VALID_MMR;
}

export function normalizeName(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function cleanPlayerName(name: string): string {
  return (name || '')
    .replace(/\s*\(c\)\s*$/i, '')
    .replace(/\s*\[c\]\s*$/i, '')
    .replace(/\s*\(sub\)\s*$/i, '')
    .replace(/\s*\[sub\]\s*$/i, '')
    .replace(/^captain:\s*/i, '')
    .replace(/^team\s+([^:]+):?$/i, '$1')
    .trim();
}

export function extractDotaAccountId(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Ignore literal placeholder labels like "DB Link", "DB", "Dotabuff"
  const lower = str.toLowerCase();
  if (
    lower === 'db link' ||
    lower === 'db' ||
    lower === 'dotabuff' ||
    lower === 'link' ||
    lower === 'opendota' ||
    lower === 'db profile' ||
    lower === 'dotabuff link' ||
    lower === 'profile link' ||
    lower === 'steam profile'
  ) {
    return null;
  }

  // 1. Match Dotabuff or OpenDota URL
  const urlMatch = str.match(/(?:dotabuff\.com|opendota\.com)\/players\/(\d+)/i) || str.match(/players\/(\d+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1];

  // 2. Steam ID64 URL conversion
  const steamMatch = str.match(/steamcommunity\.com\/profiles\/(7656119\d{10})/i);
  if (steamMatch && steamMatch[1]) {
    try {
      const id64 = BigInt(steamMatch[1]);
      const id32 = id64 - BigInt('76561197960265728');
      return id32.toString();
    } catch {}
  }

  // 3. Match Steam ID32 format e.g. [U:1:86745123]
  const steam32Match = str.match(/\[U:1:(\d+)\]/i);
  if (steam32Match && steam32Match[1]) {
    return steam32Match[1];
  }

  // 4. Plain Dota Account ID (strip commas if formatted as number in sheet)
  const digitsOnly = str.replace(/,/g, '').trim();
  if (/^\d{6,10}$/.test(digitsOnly)) {
    const num = parseInt(digitsOnly, 10);
    if (num > MIN_ACCOUNT_ID) {
      return digitsOnly;
    }
  }

  return null;
}

export function getRankFromMmr(mmr: number | null): string {
  if (!mmr || isNaN(mmr) || mmr <= 0) return 'Unranked';
  if (mmr < RANK_THRESHOLDS.HERALD) return `Herald (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.GUARDIAN) return `Guardian (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.CRUSADER) return `Crusader (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.ARCHON) return `Archon (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.LEGEND) return `Legend (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.ANCIENT) return `Ancient (${mmr.toLocaleString()})`;
  if (mmr < RANK_THRESHOLDS.DIVINE) return `Divine (${mmr.toLocaleString()})`;
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
      const vStr = cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : '';
      const fStr = cell.f !== null && cell.f !== undefined ? String(cell.f).trim() : '';

      // Preserve actual URL or numeric account ID if stored in value vs formatted text
      let textVal = fStr || vStr;
      if (vStr.includes('http') || vStr.includes('players/') || /^\d{6,10}$/.test(vStr.replace(/,/g, ''))) {
        textVal = vStr;
      }

      const numVal = typeof cell.v === 'number' ? cell.v : (/^\d+(\.\d+)?$/.test(textVal.replace(/,/g, '')) ? parseFloat(textVal.replace(/,/g, '')) : undefined);
      return { text: textVal, num: numVal };
    });
  });
}

let masterMapCache: { spreadsheetId: string; map: Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }> } | null = null;

/**
 * Fast master player lookup: checks '04a _ Player List', '05 _ Full Account List', '03 _ Final Responses'.
 */
export async function fetchMasterPlayerMap(
  spreadsheetId: string
): Promise<Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>> {
  if (masterMapCache?.spreadsheetId === spreadsheetId) return masterMapCache.map;

  const map = new Map<string, { accountId: string; dotabuffUrl: string; mmr?: number }>();
  const tabs = [
    '04a _ Player List',
    '05 _ Full Account List',
    '05 _ Account List',
    '03 _ Final Responses',
    '03 _ Responses',
    '04b _ Player List',
    '04c _ Player List',
    '04d _ Player List',
    '04 _ Player List',
    'Player List',
    'Draft Pool',
    'Players'
  ];

  for (const tabName of tabs) {
    try {
      const grid = await fetchGVizGrid(spreadsheetId, { tabName });
      if (grid && grid.length > 1) {
        grid.forEach((row) => {
          let foundId: string | null = null;
          let mmr: number | undefined;
          const names: string[] = [];

          row.forEach((cell) => {
            if (!cell?.text) return;
            const id = extractDotaAccountId(cell.text);
            if (id) foundId = id;

            if (isValidMmr(cell.num) && !foundId) {
              mmr = Math.round(Number(cell.num));
            }

            const cleanStr = cell.text.trim();
            const low = cleanStr.toLowerCase();
            if (
              !low.includes('dotabuff') &&
              !low.includes('db link') &&
              !low.includes('opendota') &&
              !low.includes('http') &&
              !low.includes('mmr') &&
              !low.includes('coins') &&
              !/^\d+$/.test(cleanStr.replace(/,/g, '')) &&
              cleanStr.length >= 2
            ) {
              names.push(cleanStr);
            }
          });

          if (foundId && names.length > 0) {
            names.forEach((n) => {
              const norm = normalizeName(n);
              const cleanedNorm = normalizeName(cleanPlayerName(n));
              const entry = {
                accountId: foundId!,
                dotabuffUrl: `https://www.dotabuff.com/players/${foundId}`,
                mmr,
              };
              if (norm.length >= 2 && !map.has(norm)) {
                map.set(norm, entry);
              }
              if (cleanedNorm.length >= 2 && !map.has(cleanedNorm)) {
                map.set(cleanedNorm, entry);
              }
            });
          }
        });
      }
    } catch {
      // Continue to next tab candidate
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

  const cleanCaptain = cleanPlayerName(captainQuery).toLowerCase();
  const normCaptain = normalizeName(cleanCaptain);
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

  // Locate team block
  interface Match {
    row: number;
    col: number;
    text: string;
    score: number;
  }
  const matches: Match[] = [];

  for (let r = 0; r < sheetGrid.length; r++) {
    for (let c = 0; c < sheetGrid[r].length; c++) {
      const cell = sheetGrid[r][c];
      const text = (cell?.text || '').toLowerCase();
      const norm = normalizeName(text);
      const cleanedNorm = normalizeName(cleanPlayerName(text));

      if (
        text &&
        (text === cleanCaptain ||
          norm === normCaptain ||
          cleanedNorm === normCaptain ||
          (normCaptain.length >= 3 && (norm.includes(normCaptain) || normCaptain.includes(norm))))
      ) {
        let score = (text === cleanCaptain || norm === normCaptain || cleanedNorm === normCaptain) ? 100 : 50;
        const row = sheetGrid[r];
        const next1 = row[c + 1]?.text || '';
        const next2 = row[c + 2]?.text.toLowerCase() || '';
        const prev = r > 0 ? sheetGrid[r - 1] : [];

        if (isValidMmr(next1)) score += 30;
        if (next2.includes('db') || next2.includes('dotabuff') || next2.includes('link')) score += 25;
        if (prev.some((h) => (h?.text || '').toLowerCase().includes('player') || (h?.text || '').toLowerCase().includes('mmr'))) score += 30;
        if (next1.length > 4 && !/^\d+$/.test(next1.replace(/,/g, ''))) score -= 30;

        matches.push({ row: r, col: c, text: cell.text, score });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Could not find captain "${captainQuery}" in Division ${divisionNumber} tab (${usedTab}).`);
  }

  matches.sort((a, b) => b.score - a.score);
  let { row: captainRow, col: captainCol, text: matchedCaptainName } = matches[0];

  const mmrAtMatch = sheetGrid[captainRow]?.[captainCol + 1]?.text;
  if (!isValidMmr(mmrAtMatch) && captainRow + 1 < sheetGrid.length) {
    const mmrBelow = sheetGrid[captainRow + 1]?.[captainCol + 1]?.text;
    if (isValidMmr(mmrBelow)) {
      captainRow = captainRow + 1;
    }
  }

  let playerCol = captainCol,
    mmrCol = captainCol + 1,
    dbCol = captainCol + 2;
  if (captainRow > 0) {
    const h = sheetGrid[captainRow - 1];
    for (let c = Math.max(0, captainCol - 2); c <= Math.min(h.length - 1, captainCol + 4); c++) {
      const ht = h[c]?.text.toLowerCase() || '';
      if (ht.includes('player') || ht.includes('name')) playerCol = c;
      if (ht.includes('mmr') || ht.includes('rank')) mmrCol = c;
      if (ht.includes('dotabuff') || ht.includes('db') || ht.includes('link')) dbCol = c;
    }
  }

  const players: ClarityPlayerItem[] = [];

  for (let offset = 0; offset < TEAM_SIZE; offset++) {
    const r = captainRow + offset;
    if (r >= sheetGrid.length) break;

    const row = sheetGrid[r];
    const rawName = row[playerCol]?.text.trim() || (offset === 0 ? matchedCaptainName : '');
    const pName = cleanPlayerName(rawName);
    if (pName.toLowerCase().includes('average') || pName.toLowerCase().includes('mmr:')) break;

    let mmrNum: number | null = null;
    const rawMmr = (row[mmrCol]?.text || '').replace(/,/g, '').trim();
    if (isValidMmr(rawMmr)) {
      mmrNum = parseInt(rawMmr, 10);
    } else if (isValidMmr(row[mmrCol]?.num)) {
      mmrNum = Math.round(row[mmrCol]!.num!);
    }

    // 1. Extract from dbCol text
    let foundId = extractDotaAccountId(row[dbCol]?.text);

    // 2. Search adjacent row cells for link or ID
    if (!foundId) {
      for (let c = Math.max(0, playerCol - 1); c <= Math.min(row.length - 1, dbCol + 4); c++) {
        const id = extractDotaAccountId(row[c]?.text);
        if (id) {
          foundId = id;
          break;
        }
      }
    }

    // 3. Fallback to masterMap lookup
    if (!foundId && pName) {
      const norm = normalizeName(pName);
      const rawNorm = normalizeName(rawName);
      const master = masterMap.get(norm) || masterMap.get(rawNorm);

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

  while (players.length < TEAM_SIZE) {
    const idx = players.length + 1;
    players.push({
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
    players,
  };
}
