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

    // Update URL query parameters only on fetch press
    updateUrlParams(currentInputs);

    const uniqueIds = Array.from(new Set(profileIds));

    try {
      const profilePromises = uniqueIds.map((id) => fetchFullPlayerProfile(id, map));
      const fetchedResults = await Promise.all(profilePromises);

      setResults(fetchedResults);
      setMessage({
        text: `Processed ${fetchedResults.length} profile${fetchedResults.length > 1 ? 's' : ''}.`,
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
        text: 'Unable to copy text automatically. Output logged to console.',
        type: 'error'
      });
      console.log('--- Summary Text ---\n', summary);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 text-zinc-200">
      {/* Input Control Box */}
      <div className="bg-panel-card rounded border border-panel-border p-4 space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Player Profiles (1 - 5)
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {POSITIONS.map((posLabel, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-[11px] text-zinc-400 block truncate">
                  {posLabel}
                </label>
                <input
                  type="text"
                  value={inputs[idx]}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  placeholder="ID or URL"
                  className="w-full bg-zinc-900 text-zinc-100 placeholder-zinc-600 border border-zinc-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-500"
                />
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || heroMapLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs py-2 px-3 rounded border border-zinc-700 disabled:opacity-50 transition"
            >
              {isLoading ? 'Fetching Data...' : 'Get Most Played Heroes'}
            </button>
          </div>
        </form>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-2.5 rounded text-xs border ${
              message.type === 'error'
                ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                : message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Results ({results.length})
            </span>

            <button
              onClick={handleCopyClipboard}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition"
            >
              {copied ? 'Copied! ✅' : 'Copy All Results to Clipboard'}
            </button>
          </div>

          <div className="space-y-3">
            {results.map((player, pIdx) => {
              return (
                <div
                  key={player.accountId + pIdx}
                  className="bg-panel-card rounded border border-panel-border p-4 space-y-3"
                >
                  {/* Player Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-panel-borderSubtle">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-7 h-7 rounded object-cover border border-zinc-700 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://placehold.co/28x28/27272a/FFFFFF?text=P'
                          );
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                            P{pIdx + 1}
                          </span>
                          <span className="text-xs font-semibold text-zinc-100 truncate">
                            {player.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          ID: {player.accountId} •{' '}
                          <a
                            href={`https://www.dotabuff.com/players/${player.accountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-200 underline"
                          >
                            Dotabuff
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-xs">
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
                      <span className="text-[11px] text-zinc-300 font-medium">{player.rankText}</span>
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
    <div className="bg-panel-subtle rounded p-2.5 border border-panel-borderSubtle">
      <div className="text-[11px] font-semibold text-zinc-400 pb-1.5 mb-2 border-b border-panel-borderSubtle flex items-center justify-between">
        <span>{title}</span>
        {data.success && data.heroes && (
          <span className="text-[10px] text-zinc-500 font-mono">
            {data.heroes.length} heroes
          </span>
        )}
      </div>

      {data.success && data.heroes && data.heroes.length > 0 ? (
        <ul className="space-y-1">
          {data.heroes.map((hero, index) => {
            const wrBg = getWinrateColor(hero.winrate);

            return (
              <li
                key={index}
                className="flex items-center justify-between text-xs text-zinc-300"
              >
                <div className="flex items-center space-x-1.5 min-w-0 pr-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 w-3 text-right">
                    {index + 1}
                  </span>
                  <img
                    src={hero.iconUrl}
                    alt={hero.name}
                    className="w-5 h-5 rounded object-cover border border-zinc-700 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute(
                        'src',
                        'https://placehold.co/20x20/27272a/FFFFFF?text=?'
                      );
                    }}
                  />
                  <span className="text-[11px] truncate" title={hero.name}>
                    {hero.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1 rounded border border-zinc-800">
                    {hero.games}g
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold px-1 rounded text-black text-center min-w-[34px]"
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
        <div className="h-20 flex items-center justify-center text-center text-[11px] text-zinc-500">
          {data.message || 'No data'}
        </div>
      )}
    </div>
  );
};
