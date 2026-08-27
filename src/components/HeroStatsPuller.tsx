import React, { useState, useEffect, useRef } from 'react';
import { PlayerProfileResult } from '../types';
import {
  fetchHeroMap,
  fetchFullPlayerProfile,
  parseInputForAccountId,
  copyTextToClipboard,
  generateTextSummary,
  HeroInfo,
} from '../utils/openDota';
import { ToolLayout } from './ToolLayout';
import { LineupInputs } from './stats/LineupInputs';
import { PlayerCard } from './stats/PlayerCard';
import { useUserContext } from '../context/UserContext';
import { getLeagueAdapter } from '../leagues/registry';

export const HeroStatsPuller: React.FC = () => {
  const { activeLeagueId, currentProfile, preferences } = useUserContext();
  const [inputs, setInputs] = useState<string[]>(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [heroMapLoading, setHeroMapLoading] = useState(true);
  const [results, setResults] = useState<Array<{ profile: PlayerProfileResult; positionIndex: number }>>([]);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [copied, setCopied] = useState(false);

  const heroMapRef = useRef<Record<number, HeroInfo>>({});

  useEffect(() => {
    fetchHeroMap()
      .then((map) => {
        heroMapRef.current = map;
        setHeroMapLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load hero map:', err);
        setHeroMapLoading(false);
        setMessage({
          text: 'Warning: Failed to load hero metadata. Names/icons may not resolve correctly.',
          type: 'error',
        });
      });

    const params = new URLSearchParams(window.location.search);
    const initialInputs = ['', '', '', '', ''];
    let hasUrlParams = false;

    for (let i = 1; i <= 5; i++) {
      const val = params.get(`id${i}`);
      if (val) {
        initialInputs[i - 1] = val;
        hasUrlParams = true;
      }
    }

    if (hasUrlParams) {
      setInputs(initialInputs);
      const cleaned = initialInputs.map((val) => parseInputForAccountId(val) || '');
      const valid = cleaned.filter((id) => id.length > 0);
      if (valid.length > 0) {
        fetchHeroMap().then((map) => {
          heroMapRef.current = map;
          executeFetch(initialInputs);
        });
      }
    }
  }, []);

  const updateUrlParams = (currentInputs: string[]) => {
    const params = new URLSearchParams(window.location.search);
    for (let i = 1; i <= 5; i++) {
      const rawVal = currentInputs[i - 1]?.trim() || '';
      const parsedId = parseInputForAccountId(rawVal);
      if (parsedId) {
        params.set(`id${i}`, parsedId);
      } else {
        params.delete(`id${i}`);
      }
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleInputChange = (index: number, val: string) => {
    const updated = [...inputs];
    updated[index] = val;
    setInputs(updated);
  };

  const executeFetch = async (inputsToFetch: string[]) => {
    setIsLoading(true);
    setMessage(null);
    setResults([]);

    const entriesWithPos = inputsToFetch
      .map((input, idx) => ({ raw: input.trim(), accountId: parseInputForAccountId(input), posIdx: idx }))
      .filter((e) => e.accountId !== null && e.accountId.length > 0);

    if (entriesWithPos.length === 0) {
      setMessage({ text: 'Please enter at least one valid Dota Account ID or Dotabuff URL.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      if (!heroMapRef.current || Object.keys(heroMapRef.current).length === 0) {
        heroMapRef.current = await fetchHeroMap();
      }

      const settled = await Promise.allSettled(
        entriesWithPos.map(async ({ accountId, posIdx }) => {
          const profile = await fetchFullPlayerProfile(accountId!, heroMapRef.current);
          return { profile, positionIndex: posIdx };
        })
      );

      const successful: Array<{ profile: PlayerProfileResult; positionIndex: number }> = [];
      const errors: string[] = [];

      settled.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          successful.push(res.value);
        } else {
          errors.push(entriesWithPos[i].raw);
        }
      });

      setResults(successful);

      if (successful.length > 0) {
        setMessage({
          text: `Retrieved hero statistics for ${successful.length} player(s).${
            errors.length > 0 ? ` (${errors.length} player(s) failed or private)` : ''
          }`,
          type: errors.length > 0 ? 'info' : 'success',
        });
      } else {
        setMessage({ text: 'Failed to retrieve data for the entered accounts.', type: 'error' });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: `Failed to retrieve data: ${error?.message || 'Unknown network error'}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams(inputs);
    executeFetch(inputs);
  };

  const handleClear = () => {
    setInputs(['', '', '', '', '']);
    setResults([]);
    setMessage(null);
    updateUrlParams(['', '', '', '', '']);
  };

  const handleCopyClipboard = async () => {
    if (results.length === 0) return;
    const profiles = results.map((r) => r.profile);
    const summary = generateTextSummary(profiles);
    const success = await copyTextToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setMessage({ text: 'Unable to copy text automatically. Output logged to console.', type: 'error' });
      console.log('--- Summary Text ---\n', summary);
    }
  };

  const handleDirectLoadCaptain = async (captainName: string) => {
    if (!captainName) return;
    const targetLeagueId = activeLeagueId || 'clarity';
    const adapter = getLeagueAdapter(targetLeagueId);
    if (!adapter) return;

    const prof = preferences.leagueProfiles[targetLeagueId] || currentProfile;
    const sheetUrl = prof?.sheetUrl;
    const division = prof?.division || adapter.definition.defaultDivision;

    if (!sheetUrl) {
      setMessage({ text: 'Please configure your Google Sheet URL in League Settings (top header).', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adapter.fetchTeam({
        division,
        captainName,
        sheetUrl
      });

      const orderedIds = result.players.map((p) => p.accountId || p.dotabuffUrl || '');
      setInputs(orderedIds);
      updateUrlParams(orderedIds);
      await executeFetch(orderedIds);
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ text: `Failed to load team: ${error?.message || 'Unknown error'}`, type: 'error' });
      setIsLoading(false);
    }
  };

  return (
    <ToolLayout title="Scouting" accentColor="red">
      <LineupInputs
        inputs={inputs}
        onChangeInput={handleInputChange}
        onClear={handleClear}
        onDirectLoadCaptain={handleDirectLoadCaptain}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        heroMapLoading={heroMapLoading}
        message={message}
      />

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
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {results.map(({ profile, positionIndex }) => (
              <PlayerCard key={profile.accountId + positionIndex} player={profile} positionIndex={positionIndex} />
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
