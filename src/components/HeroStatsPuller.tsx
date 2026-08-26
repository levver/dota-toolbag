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
import { ClarityImportModal } from './stats/ClarityImportModal';

export const HeroStatsPuller: React.FC = () => {
  const [inputs, setInputs] = useState<string[]>(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [heroMapLoading, setHeroMapLoading] = useState(true);
  const [results, setResults] = useState<PlayerProfileResult[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

    const parsedIds = inputsToFetch.map((input) => parseInputForAccountId(input));
    const validIds = parsedIds.filter((id): id is string => id !== null && id.length > 0);

    if (validIds.length === 0) {
      setMessage({ text: 'Please enter at least one valid Dota Account ID or Dotabuff URL.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const profiles = await Promise.all(
        validIds.map((id) => fetchFullPlayerProfile(id, heroMapRef.current))
      );
      setResults(profiles);
      setMessage({ text: `Successfully retrieved hero statistics for ${profiles.length} player(s).`, type: 'success' });
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
    const summary = generateTextSummary(results);
    const success = await copyTextToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setMessage({ text: 'Unable to copy text automatically. Output logged to console.', type: 'error' });
      console.log('--- Summary Text ---\n', summary);
    }
  };

  const handleApplyClarityLineup = (orderedIds: string[]) => {
    setInputs(orderedIds);
    updateUrlParams(orderedIds);
    executeFetch(orderedIds);
  };

  return (
    <ToolLayout title="Scouting" accentColor="red">
      <LineupInputs
        inputs={inputs}
        onChangeInput={handleInputChange}
        onClear={handleClear}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        heroMapLoading={heroMapLoading}
        message={message}
      />

      {/* Clarity Draft Sheet Import Modal */}
      <ClarityImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyLineup={handleApplyClarityLineup}
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
              <span>{copied ? 'Copied Summary! ✅' : 'Copy Formatted Summary'}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {results.map((player, pIdx) => (
              <PlayerCard key={player.accountId + pIdx} player={player} positionIndex={pIdx} />
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};
