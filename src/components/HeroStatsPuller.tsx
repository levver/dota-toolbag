import React, { useState, useEffect } from 'react';
import { PlayerProfileResult } from '../types';
import {
  fetchHeroMap,
  fetchFullPlayerProfile,
  parseInputForAccountId,
  generateTextSummary,
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
  Users,
  AlertCircle,
  Sparkles,
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

  // Initialize hero map and parse URL parameters
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
          // Auto-trigger fetch if url params are present
          const validIds = initialInputs
            .map(parseInputForAccountId)
            .filter((id): id is string => id !== null && id.length > 0);

          if (validIds.length > 0) {
            executeFetch(validIds, map);
          }
        }
      } catch (err) {
        console.error('Failed to load hero map:', err);
        setMessage({
          text: 'Failed to load Dota 2 hero database from OpenDota. Please check your internet connection.',
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

    // Sync with URL params
    const params = new URLSearchParams(window.location.search);
    if (value.trim()) {
      params.set(`id${index + 1}`, value.trim());
    } else {
      params.delete(`id${index + 1}`);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const executeFetch = async (profileIds: string[], map = heroMap) => {
    setIsLoading(true);
    setMessage(null);
    setResults([]);

    const uniqueIds = Array.from(new Set(profileIds));

    try {
      const profilePromises = uniqueIds.map((id) => fetchFullPlayerProfile(id, map));
      const fetchedResults = await Promise.all(profilePromises);

      setResults(fetchedResults);
      setMessage({
        text: `Successfully processed ${fetchedResults.length} profile${fetchedResults.length > 1 ? 's' : ''}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage({
        text: 'An error occurred while fetching player data. OpenDota API may be experiencing rate limits.',
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

    executeFetch(validIds);
  };

  const handleClear = () => {
    setInputs(['', '', '', '', '']);
    setResults([]);
    setMessage(null);
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const handleLoadDemo = () => {
    // Top Pro Dota Players: Yatoro (321580797), bpk / Topson (94054712), Collapse (302214028), Mira (256155000), Miposhka (113331514)
    const demoIds = ['321580797', '94054712', '302214028', '256155000', '113331514'];
    setInputs(demoIds);
    executeFetch(demoIds);
  };

  const handleCopyClipboard = async () => {
    if (results.length === 0) return;
    const summary = generateTextSummary(results);

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setMessage({
        text: 'Failed to write to clipboard. Browser permission denied.',
        type: 'error'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Dota 2 Hero Profile Checker
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Analyze hero pools, tournament stats, and winrates for all 5 roles simultaneously using Account IDs or Dotabuff URLs.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-dota-card rounded-2xl p-6 border border-dota-border shadow-xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-red-500" />
                Team Lineup (5 Positions)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950/40 border border-red-800/40 hover:bg-red-900/40 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Team
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {POSITIONS.map((posName, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 truncate">
                    {posName}
                  </div>
                  <input
                    type="text"
                    value={inputs[idx]}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    placeholder={`ID or Dotabuff`}
                    className="w-full bg-dota-dark text-slate-100 placeholder-slate-600 border border-dota-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition duration-150"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || heroMapLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Pulling Hero Profiles...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Fetch Most Played Heroes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* System Message Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
              message.type === 'error'
                ? 'bg-red-950/40 border-red-800/60 text-red-300'
                : message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-dota-border">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" />
              Player Hero Stats ({results.length})
            </h2>

            <button
              onClick={handleCopyClipboard}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl border border-dota-border shadow-md flex items-center justify-center gap-2 transition duration-150"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy Formatted Summary</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {results.map((player, pIdx) => {
              const overallSuccess =
                player.allTime.success || player.monthly.success || player.pro.success;

              return (
                <div
                  key={player.accountId + pIdx}
                  className={`bg-dota-card rounded-2xl p-6 border ${
                    overallSuccess ? 'border-dota-border' : 'border-red-800/50 bg-red-950/10'
                  } shadow-xl space-y-6`}
                >
                  {/* Player Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center space-x-4 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-red-500 flex-shrink-0 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', 'https://placehold.co/48x48/1e293b/FFFFFF?text=P');
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wide bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                            Pos {pIdx + 1}
                          </span>
                          <h3 className="text-xl font-bold text-white truncate max-w-[200px] sm:max-w-md">
                            {player.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>ID: {player.accountId}</span>
                          <span>•</span>
                          <a
                            href={`https://www.dotabuff.com/players/${player.accountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            Dotabuff <ExternalLink className="w-3 h-3" />
                          </a>
                          <span>•</span>
                          <a
                            href={`https://www.opendota.com/players/${player.accountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            OpenDota <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center gap-2 bg-dota-dark/80 px-3.5 py-2 rounded-xl border border-dota-border">
                      <img
                        src={player.rankUrl.url}
                        alt={player.rankText}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', 'https://placehold.co/40x40/374151/FFFFFF?text=R');
                        }}
                      />
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Rank</div>
                        <div className="text-xs font-bold text-white">{player.rankText}</div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Stat Columns (All-Time, 30 Days, Tournament) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* All-Time Column */}
                    <StatColumn
                      title="All-Time Heroes"
                      data={player.allTime}
                    />

                    {/* Last Month Column */}
                    <StatColumn
                      title="Last Month (30 Days)"
                      data={player.monthly}
                    />

                    {/* Pro / Tournament Column */}
                    <StatColumn
                      title="Tournament Games (180 Days)"
                      data={player.pro}
                    />
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
    <div className="bg-dota-dark/60 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-2 mb-3 border-b border-slate-800 flex items-center justify-between">
          <span>{title}</span>
          {data.success && data.heroes && (
            <span className="text-[11px] font-normal text-slate-400">
              Top {data.heroes.length}
            </span>
          )}
        </h4>

        {data.success && data.heroes && data.heroes.length > 0 ? (
          <ul className="space-y-2">
            {data.heroes.map((hero, index) => {
              const wrBg = getWinrateColor(hero.winrate);

              return (
                <li
                  key={index}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/50 transition duration-150"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="text-xs font-semibold text-slate-500 w-4 text-right">
                      {index + 1}.
                    </span>
                    <img
                      src={hero.iconUrl}
                      alt={hero.name}
                      className="w-8 h-8 rounded-md object-cover border border-slate-700 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://placehold.co/32x32/374151/FFFFFF?text=?'
                        );
                      }}
                    />
                    <span className="text-xs font-medium text-slate-200 truncate" title={hero.name}>
                      {hero.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {hero.games}g
                    </span>
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded text-black text-center min-w-[42px]"
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
          <div className="h-40 flex items-center justify-center text-center p-4 text-xs text-slate-400 bg-slate-900/40 rounded-lg">
            {data.message || 'No match statistics available.'}
          </div>
        )}
      </div>
    </div>
  );
};
