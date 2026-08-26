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
import {
  Search,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Info
} from 'lucide-react';

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

        // Check URL search parameters (id1, id2, etc.)
        const params = new URLSearchParams(window.location.search);
        const initialInputs = ['', '', '', '', ''];
        let hasUrlIds = false;

        for (let i = 0; i < 5; i++) {
          const val = params.get(`id${i + 1}`);
          if (val) {
            initialInputs[i] = val;
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
    // Note: Do NOT update URL here; only update URL when Fetch / submit is pressed!
  };

  const updateUrlParams = (currentInputs: string[]) => {
    const params = new URLSearchParams(window.location.search);
    for (let i = 0; i < 5; i++) {
      const val = currentInputs[i]?.trim();
      if (val) {
        params.set(`id${i + 1}`, val);
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

    // Update URL query parameters on fetch press
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

    executeFetch(validIds, heroMap, inputs);
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
        text: 'Unable to copy text to clipboard automatically. Check console for output.',
        type: 'error'
      });
      console.log('--- Summary Text ---\n', summary);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-tool-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Hero Profile Checker
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query player hero pools by Account ID or Dotabuff URL across all 5 positions.
          </p>
        </div>
      </div>

      {/* Input Control Box */}
      <div className="bg-tool-card rounded-xl p-5 border border-tool-border shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Player Slots
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {POSITIONS.map((posLabel, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 block truncate">
                  {posLabel}
                </label>
                <input
                  type="text"
                  value={inputs[idx]}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  placeholder="ID or Dotabuff"
                  className="w-full bg-tool-bg text-slate-100 placeholder-slate-600 border border-tool-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            ))}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading || heroMapLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Fetching Profiles...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Get Most Played Heroes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2.5 border ${
              message.type === 'error'
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-300'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Results ({results.length})
            </h2>

            <button
              onClick={handleCopyClipboard}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy All Results to Clipboard</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {results.map((player, pIdx) => {
              const overallSuccess =
                player.allTime.success || player.monthly.success || player.pro.success;

              return (
                <div
                  key={player.accountId + pIdx}
                  className={`bg-tool-card rounded-xl p-4 sm:p-5 border ${
                    overallSuccess ? 'border-tool-border' : 'border-rose-900/60 bg-rose-950/10'
                  } space-y-4`}
                >
                  {/* Player Details Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tool-borderSubtle">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-9 h-9 rounded-md object-cover border border-slate-700 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://placehold.co/36x36/1e293b/FFFFFF?text=P'
                          );
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            Slot {pIdx + 1}
                          </span>
                          <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>ID: {player.accountId}</span>
                          <span>•</span>
                          <a
                            href={`https://www.dotabuff.com/players/${player.accountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                          >
                            Dotabuff <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center gap-2 bg-tool-bg px-2.5 py-1.5 rounded-lg border border-tool-borderSubtle">
                      <img
                        src={player.rankUrl.url}
                        alt={player.rankText}
                        className="w-7 h-7 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://placehold.co/28x28/334155/FFFFFF?text=R'
                          );
                        }}
                      />
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-slate-200">
                          {player.rankText}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    <div className="bg-tool-bg rounded-lg p-3 border border-tool-borderSubtle flex flex-col justify-between">
      <div>
        <div className="text-xs font-semibold text-slate-300 pb-2 mb-2 border-b border-tool-borderSubtle flex items-center justify-between">
          <span>{title}</span>
          {data.success && data.heroes && (
            <span className="text-[10px] text-slate-500 font-mono">
              Top {data.heroes.length}
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
                  className="flex items-center justify-between py-0.5 text-xs text-slate-300 hover:text-white"
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <span className="text-[11px] font-mono text-slate-500 w-3.5 text-right">
                      {index + 1}.
                    </span>
                    <img
                      src={hero.iconUrl}
                      alt={hero.name}
                      className="w-6 h-6 rounded object-cover border border-slate-700 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://placehold.co/24x24/334155/FFFFFF?text=?'
                        );
                      }}
                    />
                    <span className="text-xs truncate font-medium" title={hero.name}>
                      {hero.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      {hero.games}g
                    </span>
                    <span
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded text-black text-center min-w-[38px]"
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
          <div className="h-28 flex items-center justify-center text-center p-2 text-[11px] text-slate-500">
            {data.message || 'No data'}
          </div>
        )}
      </div>
    </div>
  );
};
