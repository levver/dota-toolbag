import React, { useState, useEffect } from 'react';
import { useUserContext } from '../../context/UserContext';
import { AVAILABLE_LEAGUES, getLeagueDefinition, getLeagueAdapter } from '../../leagues/registry';
import { Trophy, X, Check, Globe, RefreshCw, UserCheck } from 'lucide-react';

export const LeagueConfigModal: React.FC = () => {
  const {
    activeLeagueId,
    preferences,
    setActiveLeague,
    updateLeagueProfile,
    isLeagueConfigModalOpen,
    closeLeagueConfigModal
  } = useUserContext();

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(activeLeagueId);
  const [division, setDivision] = useState<number | string>(1);
  const [captainName, setCaptainName] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');

  // Auto-discovered captains for the selected division
  const [captainsList, setCaptainsList] = useState<string[]>([]);
  const [isFetchingCaptains, setIsFetchingCaptains] = useState(false);
  const [captainsError, setCaptainsError] = useState<string | null>(null);

  useEffect(() => {
    if (isLeagueConfigModalOpen) {
      setSelectedLeagueId(activeLeagueId);
      const targetLeagueId = activeLeagueId || 'clarity';
      const prof = preferences.leagueProfiles[targetLeagueId];
      const def = getLeagueDefinition(targetLeagueId);

      setDivision(prof?.division ?? def?.defaultDivision ?? 1);
      setCaptainName(prof?.captainName ?? '');
      setSheetUrl(prof?.sheetUrl ?? def?.defaultSheetUrl ?? '');
    }
  }, [isLeagueConfigModalOpen, activeLeagueId, preferences]);

  // Automatically fetch captains whenever league, division, or sheetUrl changes
  useEffect(() => {
    if (!isLeagueConfigModalOpen || !selectedLeagueId) {
      setCaptainsList([]);
      return;
    }

    const adapter = getLeagueAdapter(selectedLeagueId);
    if (!adapter || !adapter.fetchCaptainsList || !sheetUrl.trim()) {
      setCaptainsList([]);
      return;
    }

    let isMounted = true;
    setIsFetchingCaptains(true);
    setCaptainsError(null);

    adapter
      .fetchCaptainsList({ division, sheetUrl: sheetUrl.trim() })
      .then((captains) => {
        if (isMounted) {
          setCaptainsList(captains);
          setIsFetchingCaptains(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const error = err as Error;
          setCaptainsError(error?.message || 'Failed to load captains');
          setIsFetchingCaptains(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isLeagueConfigModalOpen, selectedLeagueId, division, sheetUrl]);

  if (!isLeagueConfigModalOpen) return null;

  const currentDef = getLeagueDefinition(selectedLeagueId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeagueId) {
      updateLeagueProfile(selectedLeagueId, {
        division,
        captainName: captainName.trim(),
        sheetUrl: sheetUrl.trim()
      });
      setActiveLeague(selectedLeagueId);
    } else {
      setActiveLeague(null);
    }
    closeLeagueConfigModal();
  };

  const handleSelectLeague = (leagueId: string | null) => {
    const def = getLeagueDefinition(leagueId);
    if (def?.isPlaceholder) return; // Prevent selecting placeholder

    setSelectedLeagueId(leagueId);
    if (leagueId) {
      const prof = preferences.leagueProfiles[leagueId];
      setDivision(prof?.division ?? def?.defaultDivision ?? 1);
      setCaptainName(prof?.captainName ?? '');
      setSheetUrl(prof?.sheetUrl ?? def?.defaultSheetUrl ?? '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-canvas-card border border-canvas-border rounded-bespoke-lg w-full max-w-lg shadow-2xl overflow-hidden text-canvas-text flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-canvas-border bg-canvas-subtle">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-5 h-5 text-palette-blue" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              League Settings & Profile
            </h2>
          </div>
          <button
            onClick={closeLeagueConfigModal}
            className="p-1 rounded-bespoke text-canvas-muted hover:text-canvas-text hover:bg-canvas-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          {/* League Selection Cards */}
          <div>
            <label className="block text-[11px] text-canvas-muted mb-2 font-medium">
              Select Active League Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AVAILABLE_LEAGUES.map((league) => {
                const isSelected = selectedLeagueId === league.id;
                const isPlaceholder = league.isPlaceholder;

                return (
                  <button
                    key={league.id}
                    type="button"
                    disabled={isPlaceholder}
                    onClick={() => handleSelectLeague(league.id)}
                    className={`btn-bespoke p-3 text-left border rounded-bespoke transition flex flex-col justify-between relative ${
                      isPlaceholder
                        ? 'opacity-60 cursor-not-allowed bg-canvas-subtle border-canvas-border'
                        : isSelected
                        ? 'bg-palette-blue-subtle border-palette-blue-border text-canvas-text shadow-xs'
                        : 'bg-canvas-subtle border-canvas-border text-canvas-muted hover:text-canvas-text'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {league.logoUrl ? (
                            <img
                              src={league.logoUrl}
                              alt={league.name}
                              className="w-5 h-5 object-contain rounded-bespoke-sm"
                            />
                          ) : (
                            <Trophy className="w-4 h-4 text-palette-blue" />
                          )}
                          <span className="text-xs font-semibold text-canvas-text">
                            {league.shortName}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-palette-blue" />}
                        {isPlaceholder && (
                          <span className="text-[9px] uppercase font-mono px-1 py-0.5 bg-canvas-card text-canvas-muted rounded-bespoke-sm border border-canvas-border">
                            Soon
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-canvas-muted leading-tight block">
                        {league.name}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Standalone Option */}
              <button
                type="button"
                onClick={() => handleSelectLeague(null)}
                className={`btn-bespoke p-3 text-left border rounded-bespoke transition flex flex-col justify-between ${
                  selectedLeagueId === null
                    ? 'bg-canvas-card border-palette-blue-border text-canvas-text shadow-xs ring-1 ring-palette-blue/40'
                    : 'bg-canvas-subtle border-canvas-border text-canvas-muted hover:text-canvas-text'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-canvas-text">Standalone</span>
                    {selectedLeagueId === null && <Check className="w-3.5 h-3.5 text-palette-blue" />}
                  </div>
                  <span className="text-[10px] text-canvas-muted leading-tight block">
                    Manual Scouting
                  </span>
                </div>
              </button>
            </div>
          </div>

          {selectedLeagueId && currentDef && (
            <div className="space-y-4 pt-2 border-t border-canvas-border">
              {/* Sheet URL for Clarity */}
              {currentDef.requiresSheetUrl && (
                <div>
                  <label className="block text-[11px] text-canvas-muted mb-1 font-medium flex items-center justify-between">
                    <span>Google Sheet URL (Draft Sheet)</span>
                    <Globe className="w-3 h-3 text-canvas-muted" />
                  </label>
                  <input
                    type="url"
                    required
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
                  />
                  <p className="text-[10px] text-canvas-muted mt-1">
                    Saved in browser cookies so you won't need to re-enter it.
                  </p>
                </div>
              )}

              {/* Division Selector */}
              <div>
                <label className="block text-[11px] text-canvas-muted mb-1.5 font-medium">
                  Select Division
                </label>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${currentDef.divisions.length}, minmax(0, 1fr))` }}>
                  {currentDef.divisions.map((div) => (
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

              {/* Captain Name Choices (Auto-discovered from division) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-canvas-muted font-medium flex items-center gap-1.5">
                    <span>Your Captain Name</span>
                    {isFetchingCaptains && (
                      <span className="text-[10px] text-palette-blue flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>Loading active captains...</span>
                      </span>
                    )}
                  </label>
                  {captainsList.length > 0 && (
                    <span className="text-[10px] text-canvas-muted">
                      {captainsList.length} captains detected
                    </span>
                  )}
                </div>

                {/* Captain Name Choices */}
                {captainsList.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-canvas-subtle border border-canvas-border rounded-bespoke">
                      {captainsList.map((cap) => {
                        const isChosen = captainName.toLowerCase() === cap.toLowerCase();
                        return (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => setCaptainName(cap)}
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
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    placeholder={
                      isFetchingCaptains
                        ? 'Fetching active captains from sheet...'
                        : 'e.g. Tanaka, levver, Notre Daan...'
                    }
                    className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
                  />
                )}

                {captainsError && !isFetchingCaptains && (
                  <p className="text-[10px] text-palette-gold-text mt-1">
                    Note: Could not auto-detect captains from sheet. You can type the captain name manually.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="btn-bespoke btn-blue w-full font-medium text-xs py-2.5 px-4 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
