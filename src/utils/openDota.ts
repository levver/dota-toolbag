import { HeroStat, HeroStatsSection, PlayerProfileResult } from '../types';

export const OPENDOTA_BASE_URL = 'https://api.opendota.com/api';
export const HERO_ASSET_BASE_URL = 'https://cdn.steamstatic.com/apps/dota2/images/dota_react/heroes/';
export const RANK_ASSET_BASE_URL = 'https://www.opendota.com/assets/images/dota2/rank_icons/';
export const LOBBY_TYPE_PRO = 1;
export const POSITIONS = ["Carry (Pos 1)", "Mid (Pos 2)", "Offlane (Pos 3)", "Soft Supp (Pos 4)", "Hard Supp (Pos 5)"];
export const TOP_HEROES_COUNT = 10;

export interface HeroInfo {
  name: string;
  iconUrl: string;
}

let heroMapCache: Record<number, HeroInfo> | null = null;

/**
 * Robust clipboard copy function supporting modern API with fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting textarea fallback...', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * Parses user input (Account ID, Dotabuff URL, OpenDota URL) into a numerical Dota Account ID.
 */
export function parseInputForAccountId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Dotabuff / OpenDota URL regex: dotabuff.com/players/12345678 or opendota.com/players/12345678
  const urlMatch = trimmed.match(/(?:dotabuff\.com|opendota\.com)\/players\/(\d+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // 2. Pure digits
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Fetches and caches the complete Dota 2 hero map from OpenDota.
 */
export async function fetchHeroMap(): Promise<Record<number, HeroInfo>> {
  if (heroMapCache && Object.keys(heroMapCache).length > 0) {
    return heroMapCache;
  }

  // Check localStorage cache
  try {
    const local = localStorage.getItem('dota_hero_map_cache');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && Object.keys(parsed).length > 100) {
        heroMapCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached hero map:', e);
  }

  const response = await fetch(`${OPENDOTA_BASE_URL}/heroes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch heroes: HTTP ${response.status}`);
  }

  const data: Array<{ id: number; name: string; localized_name: string }> = await response.json();
  const map: Record<number, HeroInfo> = {};

  data.forEach((hero) => {
    let iconUrl = 'https://placehold.co/32x32/334155/FFFFFF?text=?';
    if (hero.name) {
      const safeName = hero.name.replace('npc_dota_hero_', '');
      iconUrl = `${HERO_ASSET_BASE_URL}${safeName}.png`;
    }
    map[hero.id] = {
      name: hero.localized_name,
      iconUrl
    };
  });

  heroMapCache = map;
  try {
    localStorage.setItem('dota_hero_map_cache', JSON.stringify(map));
  } catch (e) {
    // Ignore storage quota errors
  }

  return map;
}

/**
 * Rank Medal Calculation
 */
export function getRankIconUrl(rankTier: number | null | undefined): { url: string; text: string } {
  const tierMap: Record<number, string> = {
    0: 'Uncalibrated',
    1: 'Herald',
    2: 'Guardian',
    3: 'Crusader',
    4: 'Archon',
    5: 'Legend',
    6: 'Ancient',
    7: 'Divine',
    8: 'Immortal'
  };

  const UNCALIBRATED_ICON_URL = `${RANK_ASSET_BASE_URL}rank_icon_0.png`;

  if (!rankTier || typeof rankTier !== 'number' || rankTier < 10) {
    return { url: UNCALIBRATED_ICON_URL, text: tierMap[0] };
  }

  const tier = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  let rankText = tierMap[tier] || 'Ranked';

  if (tier >= 1 && tier <= 8) {
    const filename = `rank_icon_${tier}.png`;
    if (tier >= 1 && tier <= 7 && star >= 1 && star <= 5) {
      rankText += ` ${star}`;
    }
    return {
      url: `${RANK_ASSET_BASE_URL}${filename}`,
      text: rankText
    };
  }

  return { url: UNCALIBRATED_ICON_URL, text: tierMap[0] };
}

/**
 * Calculates winrate color: subtle muted indicator
 */
export function getWinrateColor(wrText: string): string {
  let winrate = 0;
  try {
    winrate = parseFloat(wrText.replace('%', ''));
  } catch {
    return '#475569';
  }

  winrate = Math.min(100, Math.max(0, isNaN(winrate) ? 0 : winrate));
  let r = 0, g = 0;

  if (winrate <= 50) {
    const scale = winrate / 50;
    r = 239;
    g = Math.round(100 * scale);
  } else {
    const scale = (winrate - 50) / 50;
    r = Math.round(239 * (1 - scale * 0.75));
    g = Math.round(100 + (210 - 100) * scale);
  }

  return `rgb(${r}, ${g}, 80)`;
}

/**
 * Fetches hero stats for a single profile with filters.
 */
export async function fetchHeroStats(
  accountId: string,
  heroMap: Record<number, HeroInfo>,
  days: number | null = null,
  lobbyType: number | null = null
): Promise<HeroStatsSection> {
  let url = `${OPENDOTA_BASE_URL}/players/${accountId}/heroes`;
  const params: string[] = [];
  if (days) params.push(`date=${days}`);
  if (lobbyType) params.push(`lobby_type=${lobbyType}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  try {
    const response = await fetch(url);
    if (response.status === 404) {
      return { success: false, message: 'Profile not found or match history private.' };
    }
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data: Array<{ hero_id: string; games: number | string; win: number | string }> = await response.json();
    const playedHeroes = data.filter((h) => parseInt(String(h.games), 10) > 0);

    if (!Array.isArray(playedHeroes) || playedHeroes.length === 0) {
      const message = lobbyType === LOBBY_TYPE_PRO
        ? 'No tournament matches in last 180 days.'
        : (days ? 'No match data found for this period.' : 'No match data found.');
      return { success: false, message };
    }

    const topHeroes: HeroStat[] = playedHeroes.slice(0, TOP_HEROES_COUNT).map((heroStat) => {
      const heroId = parseInt(heroStat.hero_id, 10);
      const heroInfo = heroMap[heroId];
      const games = parseInt(String(heroStat.games), 10);
      const wins = parseInt(String(heroStat.win), 10);

      const winrate = games > 0 ? `${((wins / games) * 100).toFixed(0)}%` : '0%';

      return {
        name: heroInfo ? heroInfo.name : `Hero #${heroId}`,
        iconUrl: heroInfo ? heroInfo.iconUrl : 'https://placehold.co/32x32/334155/FFFFFF?text=?',
        games,
        winrate,
        winCount: wins
      };
    });

    return { success: true, heroes: topHeroes };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `Error: ${err?.message || 'Unknown'}` };
  }
}

/**
 * Fetches full player profile with retries.
 */
export async function fetchFullPlayerProfile(
  accountId: string,
  heroMap: Record<number, HeroInfo>,
  maxRetries = 3
): Promise<PlayerProfileResult> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const [allTimeResult, monthlyResult, proResult, playerResponse] = await Promise.all([
        fetchHeroStats(accountId, heroMap, null, null),
        fetchHeroStats(accountId, heroMap, 30, null),
        fetchHeroStats(accountId, heroMap, 180, LOBBY_TYPE_PRO),
        fetch(`${OPENDOTA_BASE_URL}/players/${accountId}`)
      ]);

      let playerName = `Player ${accountId}`;
      let avatarUrl = 'https://placehold.co/40x40/1e293b/FFFFFF?text=P';
      let rankData = getRankIconUrl(0);
      let rankText = 'Uncalibrated';

      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        playerName = playerData.profile?.personaname || `Player ${accountId}`;
        avatarUrl = playerData.profile?.avatarfull || avatarUrl;

        const rankTier = playerData.rank_tier;
        const leaderboardRank = playerData.leaderboard_rank;

        if (rankTier) {
          rankData = getRankIconUrl(rankTier);
          rankText = rankData.text;
          if (rankTier >= 80 && leaderboardRank) {
            rankText = `Immortal #${leaderboardRank}`;
          }
        }
      }

      return {
        accountId,
        name: playerName,
        avatarUrl,
        rankUrl: rankData,
        rankText,
        allTime: allTimeResult,
        monthly: monthlyResult,
        pro: proResult
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Failed to process profile ${accountId}`, lastError);
  return {
    accountId,
    name: `Player ${accountId}`,
    avatarUrl: 'https://placehold.co/40x40/334155/FFFFFF?text=!',
    rankUrl: getRankIconUrl(0),
    rankText: 'Error',
    allTime: { success: false, message: 'Could not fetch data after retries.' },
    monthly: { success: false, message: 'Could not fetch data after retries.' },
    pro: { success: false, message: 'Could not fetch data after retries.' }
  };
}

/**
 * Formats all player results into a clean text summary.
 */
export function generateTextSummary(results: PlayerProfileResult[]): string {
  let summary = "--- Dota 2 Hero Stats Summary ---\n\n";

  results.forEach((player, playerIndex) => {
    summary += `=== Player ${playerIndex + 1}: ${player.name} (ID: ${player.accountId} | Rank: ${player.rankText}) ===\n\n`;

    const sections = [
      { title: "All-Time Heroes", data: player.allTime },
      { title: "Last Month Heroes", data: player.monthly },
      { title: "Recent Tournament Games", data: player.pro }
    ];

    sections.forEach((section) => {
      summary += `[ ${section.title} ]\n`;
      if (section.data.success && section.data.heroes && section.data.heroes.length > 0) {
        section.data.heroes.forEach((hero, index) => {
          summary += `${String(index + 1).padStart(2)}. ${hero.name.padEnd(25)} ${String(hero.games).padEnd(5)} games | ${hero.winrate} WR\n`;
        });
      } else {
        summary += `  ${section.data.message || 'No data'}\n`;
      }
      summary += "\n";
    });

    summary += "--------------------------------------\n\n";
  });

  return summary;
}
