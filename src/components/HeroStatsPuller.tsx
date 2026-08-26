import React, { useState, useEffect } from 'react';
import { PlayerProfileResult } from '../types';
import {
  fetchHeroMap,
  fetchFullPlayerProfile,
  parseInputForAccountId,
  generateTextSummary,
  copyTextToClipboard,
  getWinrateColor,
  POSITIONS,
  HeroInfo
} from '../utils/openDota';

export const HeroStatsPuller: React.FC = () => {
  const [inputs, setInputs] = useState<string[]>(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [heroMap, setHeroMap] = useState<Record<number, HeroInfo>>({});
  const [heroMapLoading, setHeroMapLoading] = useState(true);
  const [results, setResults] = useState<PlayerProfileResult[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize hero map and parse URL parameters on initial load
  useEffect(() => {
    async function init() {
      try {
        setHeroMapLoading(true);
        const map = await fetchHeroMap();
        setHeroMap(map);

        const params = new URLSearchParams(window.location.search);
        const initialInputs = ['', '', '', '', ''];
        let hasUrlIds = false;

        for (let i = 0; i < 5; i++) {
          const val = params.get(`id${i + 1}`);
          if (val) {
            const cleanId = parseInputForAccountId(val) || val;
            initialInputs[i] = cleanId;
            hasUrlIds = true;
          }
        }

        if (hasUrlIds) {
          setInputs(initialInputs);
          const validIds = initialInputs
            .map(parseInputForAccountId)
            .filter((id): id is string => id !== null && id.length > 0);

          if (validIds.length > 0) {
            executeFetch(validIds, map, initialInputs);
          }
        }
      } catch (err) {
        console.error('Failed to load hero map:', err);
        setMessage({
          text: 'Failed to load Dota 2 hero database from OpenDota.',
          type: 'error'
        });
      } finally {
        setHeroMapLoading(false);
      }
    }

    init();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  /**
   * Updates URL query parameters only with stripped, clean numeric account IDs.
   */
  const updateUrlParams = (currentInputs: string[]) => {
    const params = new URLSearchParams(window.location.search);
    for (let i = 0; i < 5; i++) {
      const rawVal = currentInputs[i]?.trim();
      const cleanId = rawVal ? parseInputForAccountId(rawVal) : null;
      if (cleanId) {
        params.set(`id${i + 1}`, cleanId);
      } else {
        params.delete(`id${i + 1}`);
      }
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const executeFetch = async (
    profileIds: string[],
    map = heroMap,
    currentInputs: string[] = inputs
  ) => {
    setIsLoading(true);
    setMessage(null);
    setResults([]);

    // Update URL query parameters with stripped numerical IDs only
    updateUrlParams(currentInputs);

    const uniqueIds = Array.from(new Set(profileIds));

    try {
      const profilePromises = uniqueIds.map((id) => fetchFullPlayerProfile(id, map));
      const fetchedResults = await Promise.all(profilePromises);

      setResults(fetchedResults);
      setMessage({
        text: `Processed ${fetchedResults.length} player profile${fetchedResults.length > 1 ? 's' : ''}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage({
        text: 'An error occurred while fetching player data from OpenDota.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validIds = inputs
      .map(parseInputForAccountId)
      .filter((id): id is string => id !== null && id.length > 0);

    if (validIds.length === 0) {
      setMessage({
        text: 'Please enter at least one valid Dota 2 Account ID or Dotabuff URL.',
        type: 'info'
      });
      return;
    }

    // Normalize inputs in UI to clean IDs
    const normalizedInputs = inputs.map((inp) => {
      const clean = parseInputForAccountId(inp);
      return clean ? clean : inp.trim();
    });
    setInputs(normalizedInputs);

    executeFetch(validIds, heroMap, normalizedInputs);
  };

  const handleClear = () => {
    setInputs(['', '', '', '', '']);
    setResults([]);
    setMessage(null);
    const params = new URLSearchParams(window.location.search);
    for (let i = 1; i <= 5; i++) {
      params.delete(`id${i}`);
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleCopyClipboard = async () => {
    if (results.length === 0) return;
    const summary = generateTextSummary(results);

    const success = await copyTextToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setMessage({
        text: 'Unable to copy text automatically. Output logged to console.',
        type: 'error'
      });
      console.log('--- Summary Text ---\n', summary);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 text-canvas-text">
      {/* Tool Header */}
      <div className="flex items-center justify-between pb-2 border-b border-canvas-border">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-bespoke-sm bg-palette-red"></span>
          <h1 className="text-sm font-semibold tracking-tight text-canvas-text uppercase">
            Hero Profile Checker
          </h1>
        </div>
      </div>

      {/* Input Control Box */}
      <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
              Lineup Positions
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="btn-bespoke btn-surface text-[11px] px-2.5 py-1"
            >
              Clear Lineup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {POSITIONS.map((posLabel, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-palette-red-text">{posLabel.split(' ')[0]}</span>
                  <span className="text-canvas-muted font-mono text-[10px]">Pos {idx + 1}</span>
                </div>
                <input
                  type="text"
                  value={inputs[idx]}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  placeholder="ID or Dotabuff"
                  className="w-full bg-canvas-subtle text-canvas-text placeholder-canvas-muted/60 border border-canvas-border rounded-bespoke px-3 py-2 text-xs focus:outline-none focus:border-palette-red transition"
                />
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || heroMapLoading}
              className="btn-bespoke btn-red w-full font-medium text-xs py-2.5 px-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Fetching Hero Data...</span>
              ) : (
                <span>Get Most Played Heroes</span>
              )}
            </button>
          </div>
        </form>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-3 rounded-bespoke text-xs border ${
              message.type === 'error'
                ? 'bg-palette-red-subtle border-palette-red-border text-palette-red-text'
                : message.type === 'success'
                ? 'bg-palette-green-subtle border-palette-green-border text-palette-green-text'
                : 'bg-canvas-subtle border-canvas-border text-canvas-text'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
              Profile Analysis ({results.length})
            </span>

            <button
              onClick={handleCopyClipboard}
              className="btn-bespoke btn-surface text-xs px-3.5 py-1.5 font-medium flex items-center gap-1.5"
            >
              <span>{copied ? 'Copied Summary! ✅' : 'Copy Formatted Summary'}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {results.map((player, pIdx) => {
              return (
                <div
                  key={player.accountId + pIdx}
                  className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3.5"
                >
                  {/* Player Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-canvas-border">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-8 h-8 rounded-bespoke object-cover border border-canvas-borderLight flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://placehold.co/32x32/1e293b/FFFFFF?text=P'
                          );
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-bespoke-sm bg-palette-red-subtle border border-palette-red-border text-palette-red-text">
                            Pos {pIdx + 1}
                          </span>
                          <span className="text-sm font-semibold text-canvas-text truncate">
                            {player.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-canvas-muted mt-0.5">
                          ID: <span className="font-mono text-zinc-300">{player.accountId}</span> •{' '}
                          <a
                            href={`https://www.dotabuff.com/players/${player.accountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-palette-red-accent hover:underline"
                          >
                            Dotabuff
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center gap-2 bg-canvas-subtle px-2.5 py-1.5 rounded-bespoke border border-canvas-borderLight text-xs">
                      <img
                        src={player.rankUrl.url}
                        alt={player.rankText}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://placehold.co/24x24/27272a/FFFFFF?text=R'
                          );
                        }}
                      />
                      <span className="text-[11px] text-canvas-text font-medium">{player.rankText}</span>
                    </div>
                  </div>

                  {/* 3 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <StatColumn title="All-Time Heroes" data={player.allTime} />
                    <StatColumn title="Last Month Heroes" data={player.monthly} />
                    <StatColumn title="Recent Tournament Games" data={player.pro} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatColumnProps {
  title: string;
  data: {
    success: boolean;
    message?: string;
    heroes?: Array<{
      name: string;
      iconUrl: string;
      games: number;
      winrate: string;
    }>;
  };
}

const StatColumn: React.FC<StatColumnProps> = ({ title, data }) => {
  return (
    <div className="bg-canvas-subtle rounded-bespoke p-3 border border-canvas-border">
      <div className="text-[11px] font-semibold text-zinc-300 pb-2 mb-2 border-b border-canvas-border flex items-center justify-between">
        <span>{title}</span>
        {data.success && data.heroes && (
          <span className="text-[10px] text-canvas-muted font-mono">
            {data.heroes.length} heroes
          </span>
        )}
      </div>

      {data.success && data.heroes && data.heroes.length > 0 ? (
        <ul className="space-y-1.5">
          {data.heroes.map((hero, index) => {
            const wrBg = getWinrateColor(hero.winrate);

            return (
              <li
                key={index}
                className="flex items-center justify-between text-xs text-zinc-200 py-0.5"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1.5">
                  <span className="text-[10px] font-mono text-canvas-muted w-3 text-right">
                    {index + 1}
                  </span>
                  <img
                    src={hero.iconUrl}
                    alt={hero.name}
                    className="w-5 h-5 rounded-bespoke-sm object-cover border border-canvas-borderLight flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute(
                        'src',
                        'https://placehold.co/20x20/27272a/FFFFFF?text=?'
                      );
                    }}
                  />
                  <span className="text-[11px] font-medium truncate" title={hero.name}>
                    {hero.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-mono text-zinc-300 bg-canvas-card px-1.5 py-0.2 rounded-bespoke-sm border border-canvas-border">
                    {hero.games}g
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-bespoke-sm text-black text-center min-w-[36px]"
                    style={{ backgroundColor: wrBg }}
                  >
                    {hero.winrate}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="h-24 flex items-center justify-center text-center text-[11px] text-canvas-muted">
          {data.message || 'No match statistics available'}
        </div>
      )}
    </div>
  );
};
