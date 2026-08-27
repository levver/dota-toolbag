import React, { useState, useEffect } from 'react';
import { LeaguePlayerItem, LeagueTeamResult } from '../../leagues/types';
import { getLeagueAdapter } from '../../leagues/registry';
import { useUserContext } from '../../context/UserContext';
import { POSITIONS } from '../../utils/openDota';
import { storage } from '../../utils/storage';
import { X, Trophy, ArrowRight, Check, ExternalLink, RefreshCw, UserCheck } from 'lucide-react';

interface ClarityImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLineup: (orderedAccountIds: string[]) => void;
  initialCaptainName?: string;
  initialDivision?: number | string;
}

export const ClarityImportModal: React.FC<ClarityImportModalProps> = ({
  isOpen,
  onClose,
  onApplyLineup,
  initialCaptainName,
  initialDivision
}) => {
  const {
    activeLeagueId,
    currentProfile,
    updateLeagueProfile,
    addRecentOpponent,
    preferences
  } = useUserContext();

  const targetLeagueId = activeLeagueId || 'clarity';
  const adapter = getLeagueAdapter(targetLeagueId);

  const [sheetUrl, setSheetUrl] = useState('');
  const [division, setDivision] = useState<number | string>(1);
  const [captainName, setCaptainName] = useState('');
  const [step, setStep] = useState<'input' | 'positions'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamResult, setTeamResult] = useState<LeagueTeamResult | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<LeaguePlayerItem[]>([]);

  // Captains list for division
  const [captainsList, setCaptainsList] = useState<string[]>([]);
  const [isFetchingCaptains, setIsFetchingCaptains] = useState(false);

  // Initialize state once when modal opens (no infinite loop dependencies)
  useEffect(() => {
    if (!isOpen) return;

    const prof = preferences.leagueProfiles[targetLeagueId] || currentProfile;
    const initialSheet = prof?.sheetUrl || storage.get<string>('clarity_last_sheet_url', '');
    const initialDiv = initialDivision ?? prof?.division ?? adapter?.definition.defaultDivision ?? 1;
    const initialCap = initialCaptainName ?? prof?.captainName ?? '';

    setSheetUrl(initialSheet);
    setDivision(initialDiv);
    setCaptainName(initialCap);
    setStep('input');
    setErrorMessage(null);

    // If initialCaptainName and sheetUrl are present, auto-load immediately!
    if (initialCap && initialSheet && adapter) {
      setIsLoading(true);
      adapter
        .fetchTeam({
          division: initialDiv,
          captainName: initialCap,
          sheetUrl: initialSheet
        })
        .then((result) => {
          setTeamResult(result);
          setAssignedPlayers(result.players);
          setStep('positions');
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          const error = err as Error;
          setErrorMessage(error?.message || 'Failed to locate team.');
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Fetch captains list when division or sheetUrl changes
  useEffect(() => {
    if (!isOpen || !adapter?.fetchCaptainsList || !sheetUrl.trim()) {
      setCaptainsList([]);
      return;
    }

    let isMounted = true;
    setIsFetchingCaptains(true);

    adapter
      .fetchCaptainsList({ division, sheetUrl: sheetUrl.trim() })
      .then((caps) => {
        if (isMounted) {
          setCaptainsList(caps);
          setIsFetchingCaptains(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCaptainsList([]);
          setIsFetchingCaptains(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, division, sheetUrl]);

  if (!isOpen) return null;

  const handleFetchTeam = async (e?: React.FormEvent, captainOverride?: string) => {
    if (e) e.preventDefault();
    if (!adapter) {
      setErrorMessage('No league adapter available.');
      return;
    }

    const capToFetch = (captainOverride || captainName).trim();
    if (!capToFetch) {
      setErrorMessage('Please select or enter a captain name.');
      return;
    }

    if (!sheetUrl.trim()) {
      setErrorMessage('Please enter the Google Sheet URL.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      storage.set('clarity_last_sheet_url', sheetUrl.trim());
      updateLeagueProfile(targetLeagueId, {
        sheetUrl: sheetUrl.trim(),
        division,
        captainName: capToFetch
      });

      const result = await adapter.fetchTeam({
        division,
        captainName: capToFetch,
        sheetUrl: sheetUrl.trim()
      });

      addRecentOpponent(targetLeagueId, capToFetch);
      setTeamResult(result);
      setAssignedPlayers(result.players);
      setStep('positions');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error?.message || 'Failed to extract team from sheet. Please check the captain name and division.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionChange = (playerIndex: number, newPosition: number) => {
    const updated = [...assignedPlayers];
    const existingIndex = updated.findIndex((p) => p.assignedPosition === newPosition);

    if (existingIndex !== -1 && existingIndex !== playerIndex) {
      const oldPos = updated[playerIndex].assignedPosition;
      updated[existingIndex].assignedPosition = oldPos;
    }

    updated[playerIndex].assignedPosition = newPosition;
    setAssignedPlayers(updated);
  };

  const handleApply = () => {
    const sorted = [...assignedPlayers].sort((a, b) => a.assignedPosition - b.assignedPosition);
    const orderedIds = [0, 1, 2, 3, 4].map((i) => {
      const p = sorted.find((player) => player.assignedPosition === i + 1);
      return p?.accountId || p?.dotabuffUrl || '';
    });

    onApplyLineup(orderedIds);
    onClose();
  };

  const resetModal = () => {
    setStep('input');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-canvas-card border border-canvas-border rounded-bespoke-lg w-full max-w-lg shadow-2xl overflow-hidden text-canvas-text flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-canvas-border bg-canvas-subtle">
          <div className="flex items-center space-x-2.5">
            {adapter?.definition.logoUrl ? (
              <img
                src={adapter.definition.logoUrl}
                alt={adapter.definition.name}
                className="w-5 h-5 object-contain rounded-bespoke-sm"
              />
            ) : (
              <Trophy className="w-5 h-5 text-palette-blue" />
            )}
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              {adapter ? `${adapter.definition.name} - Lineup Import` : 'Import Lineup'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-bespoke text-canvas-muted hover:text-canvas-text hover:bg-canvas-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {isLoading && step === 'input' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-palette-blue animate-spin" />
              <p className="text-xs text-canvas-muted">Loading team lineup from sheet...</p>
            </div>
          ) : step === 'input' ? (
            <form onSubmit={(e) => handleFetchTeam(e)} className="space-y-4">
              {/* Sheet URL */}
              {adapter?.definition.requiresSheetUrl && (
                <div>
                  <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                    Google Sheet URL (Publicly shared view link)
                  </label>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
                  />
                </div>
              )}

              {/* Division Selector */}
              <div>
                <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                  Division
                </label>
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${
                      (adapter?.definition.divisions || [1, 2, 3, 4]).length
                    }, minmax(0, 1fr))`
                  }}
                >
                  {(adapter?.definition.divisions || [
                    { id: 1, label: 'Div 1' },
                    { id: 2, label: 'Div 2' },
                    { id: 3, label: 'Div 3' },
                    { id: 4, label: 'Div 4' }
                  ]).map((div) => (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => setDivision(div.id)}
                      className={`btn-bespoke py-1.5 text-xs font-medium border transition ${
                        String(division) === String(div.id)
                          ? 'bg-palette-blue-subtle text-palette-blue-text border-palette-blue-border shadow-xs font-semibold'
                          : 'bg-canvas-subtle text-canvas-muted border-canvas-border hover:text-canvas-text'
                      }`}
                    >
                      {div.label.replace('Division ', 'Div ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Captain Name Choices */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-canvas-muted font-medium flex items-center gap-1.5">
                    <span>Captain Name</span>
                    {isFetchingCaptains && (
                      <span className="text-[10px] text-palette-blue flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>Detecting active captains...</span>
                      </span>
                    )}
                  </label>
                  {captainsList.length > 0 && (
                    <span className="text-[10px] text-canvas-muted">
                      {captainsList.length} active teams in Div {division}
                    </span>
                  )}
                </div>

                {captainsList.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-canvas-subtle border border-canvas-border rounded-bespoke">
                      {captainsList.map((cap) => {
                        const isChosen = captainName.toLowerCase() === cap.toLowerCase();
                        return (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => {
                              setCaptainName(cap);
                              handleFetchTeam(undefined, cap);
                            }}
                            className={`btn-bespoke px-2 py-1.5 text-left text-xs font-medium border rounded-bespoke transition flex items-center justify-between ${
                              isChosen
                                ? 'bg-palette-blue text-white border-palette-blue shadow-xs font-bold'
                                : 'bg-canvas-card border-canvas-border text-canvas-muted hover:text-canvas-text hover:border-palette-blue-border'
                            }`}
                          >
                            <span className="truncate">{cap}</span>
                            {isChosen && <UserCheck className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={captainName}
                      onChange={(e) => setCaptainName(e.target.value)}
                      placeholder="Or enter custom captain name..."
                      className="w-full px-3 py-1.5 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    placeholder="e.g. Tanaka, levver, Notre Daan..."
                    className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
                  />
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-bespoke text-xs bg-palette-red-subtle border border-palette-red-border text-palette-red-text leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-bespoke btn-blue w-full font-medium text-xs py-2.5 px-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Locating Team & Lineup...</span>
                  </>
                ) : (
                  <>
                    <span>Locate Team & Extract Lineup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-canvas-border text-xs">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-canvas-text">
                      {teamResult?.captainName}
                    </span>
                    {teamResult?.teamName && (
                      <span className="text-palette-blue text-[11px] font-medium bg-palette-blue-subtle px-1.5 py-0.5 rounded-bespoke border border-palette-blue-border">
                        {teamResult.teamName}
                      </span>
                    )}
                    <span className="text-[11px] text-canvas-muted ml-1">
                      (Division {teamResult?.division})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {teamResult?.teamDraftUrl && (
                    <a
                      href={teamResult.teamDraftUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-palette-blue hover:underline flex items-center gap-1"
                      title="Open team drafts on Dotabuff"
                    >
                      <span>Drafts</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  {teamResult?.challongeUrl && (
                    <a
                      href={teamResult.challongeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-palette-gold-text hover:underline flex items-center gap-1"
                      title="Open Challonge tournament bracket"
                    >
                      <span>Challonge</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={resetModal}
                    className="text-[11px] text-canvas-muted hover:text-canvas-text ml-1"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-canvas-muted leading-tight">
                Assign each player to their lineup position (Pos 1–5):
              </div>

              <div className="space-y-2.5">
                {assignedPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 bg-canvas-subtle rounded-bespoke border border-canvas-border text-xs"
                  >
                    {/* Position Selector */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                      <select
                        value={player.assignedPosition}
                        onChange={(e) => handlePositionChange(idx, parseInt(e.target.value, 10))}
                        className="bg-canvas-card border border-palette-blue-border text-palette-blue-text rounded-bespoke px-2 py-1 text-xs font-bold focus:outline-none focus:border-palette-blue flex-shrink-0"
                      >
                        {POSITIONS.map((pos, pIndex) => (
                          <option key={pIndex + 1} value={pIndex + 1}>
                            Pos {pIndex + 1} ({pos.split(' ')[0]})
                          </option>
                        ))}
                      </select>

                      {/* Player Info */}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-canvas-text truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-mono uppercase bg-palette-blue-subtle text-palette-blue-text px-1 rounded-bespoke-sm border border-palette-blue-border">
                              Captain
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-canvas-muted mt-0.5 flex items-center gap-1.5">
                          {player.accountId ? (
                            <>
                              <span>ID: <span className="font-mono text-zinc-300">{player.accountId}</span></span>
                              {player.dotabuffUrl && (
                                <a
                                  href={player.dotabuffUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-palette-blue hover:underline flex items-center gap-0.5 ml-1"
                                >
                                  <span>DB</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </>
                          ) : player.dotabuffUrl ? (
                            <a
                              href={player.dotabuffUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-palette-blue hover:underline flex items-center gap-0.5"
                            >
                              <span>DB Profile</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-canvas-muted">No ID in sheet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge / MMR */}
                    <div className="flex items-center gap-1.5 bg-canvas-card px-2.5 py-1 rounded-bespoke border border-canvas-borderLight text-xs flex-shrink-0">
                      <span className="text-[11px] text-zinc-200 font-medium">
                        {player.rankText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="btn-bespoke btn-blue w-full font-medium text-xs py-2.5 px-4 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Lineup & Scout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
