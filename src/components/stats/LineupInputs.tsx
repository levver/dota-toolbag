import React, { useState, useEffect } from 'react';
import { POSITIONS } from '../../utils/openDota';
import { useUserContext } from '../../context/UserContext';
import { Trophy, Users, RefreshCw, Crosshair, ExternalLink } from 'lucide-react';

interface LineupInputsProps {
  inputs: string[];
  onChangeInput: (index: number, val: string) => void;
  onClear: () => void;
  onDirectLoadCaptain?: (captainName: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  heroMapLoading: boolean;
  message: { text: string; type: 'error' | 'success' | 'info' } | null;
  scoutedTeam?: {
    captainName: string;
    teamName?: string;
    teamDraftUrl?: string;
    challongeUrl?: string;
  } | null;
}

export const LineupInputs: React.FC<LineupInputsProps> = ({
  inputs,
  onChangeInput,
  onClear,
  onDirectLoadCaptain,
  onSubmit,
  isLoading,
  heroMapLoading,
  message,
  scoutedTeam,
}) => {
  const {
    activeLeagueId,
    currentAdapter,
    currentProfile,
    preferences,
  } = useUserContext();

  const [divisionCaptains, setDivisionCaptains] = useState<string[]>([]);
  const [isFetchingDivisionCaptains, setIsFetchingDivisionCaptains] = useState(false);
  const [activeCaptain, setActiveCaptain] = useState<string | null>(null);

  // Fetch available captains for active division
  useEffect(() => {
    if (!activeLeagueId || !currentAdapter?.fetchCaptainsList) {
      setDivisionCaptains([]);
      return;
    }

    const prof = preferences.leagueProfiles[activeLeagueId] || currentProfile;
    const sheet = prof?.sheetUrl;
    const div = prof?.division || currentAdapter.definition.defaultDivision;

    if (!sheet) {
      setDivisionCaptains([]);
      return;
    }

    let isMounted = true;
    setIsFetchingDivisionCaptains(true);

    currentAdapter
      .fetchCaptainsList({ division: div, sheetUrl: sheet })
      .then((caps) => {
        if (isMounted) {
          setDivisionCaptains(caps);
          setIsFetchingDivisionCaptains(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDivisionCaptains([]);
          setIsFetchingDivisionCaptains(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeLeagueId, currentAdapter, currentProfile?.division, currentProfile?.sheetUrl, preferences]);

  const isConfigured = activeLeagueId && currentProfile?.captainName;
  const opponentsList = divisionCaptains.filter(
    (cap) => cap.toLowerCase() !== (currentProfile?.captainName || '').toLowerCase()
  );

  const handleCaptainClick = (capName: string) => {
    setActiveCaptain(capName);
    if (onDirectLoadCaptain) {
      onDirectLoadCaptain(capName);
    }
  };

  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-4">
      {/* League Mode Action Bar */}
      {activeLeagueId && currentAdapter ? (
        <div className="space-y-3 p-3 bg-canvas-subtle border border-canvas-border rounded-bespoke text-xs">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-bespoke bg-palette-blue-subtle border border-palette-blue-border flex items-center justify-center flex-shrink-0">
                {currentAdapter.definition.logoUrl ? (
                  <img
                    src={currentAdapter.definition.logoUrl}
                    alt={currentAdapter.definition.name}
                    className="w-4 h-4 object-contain"
                  />
                ) : (
                  <Trophy className="w-3.5 h-3.5 text-palette-blue" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-canvas-text flex items-center gap-1.5 truncate">
                  <span>{currentAdapter.definition.shortName}</span>
                  <span className="text-[10px] font-mono bg-canvas-card px-1.5 py-0.5 rounded-bespoke-sm border border-canvas-border">
                    Div {currentProfile?.division || 1}
                  </span>
                  {currentProfile?.captainName && (
                    <span className="text-[11px] text-zinc-300 font-medium truncate">
                      • {currentProfile.captainName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConfigured && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleCaptainClick(currentProfile.captainName)}
                  className={`btn-bespoke text-[11px] px-3 py-1 font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition ${
                    activeCaptain?.toLowerCase() === currentProfile?.captainName?.toLowerCase()
                      ? 'bg-palette-blue text-white font-bold shadow-sm'
                      : 'btn-blue'
                  }`}
                  title="Directly load and scout your team"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Load My Team</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveCaptain(null);
                  onClear();
                }}
                className="btn-bespoke btn-surface text-[11px] px-2.5 py-1 text-canvas-muted hover:text-canvas-text"
                title="Clear current slots"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Opponent Buttons */}
          {opponentsList.length > 0 && (
            <div className="pt-2 border-t border-canvas-border space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-canvas-muted">
                <span className="flex items-center gap-1 font-medium">
                  <Crosshair className="w-3 h-3 text-palette-blue" />
                  <span>Scout Opponent:</span>
                </span>
                {isFetchingDivisionCaptains && (
                  <span className="text-[10px] text-palette-blue flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Loading...</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {opponentsList.map((opp) => {
                  const isSelected = activeCaptain?.toLowerCase() === opp.toLowerCase();
                  return (
                    <button
                      key={opp}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleCaptainClick(opp)}
                      className={`btn-bespoke px-2.5 py-1 text-xs font-medium rounded-bespoke border transition disabled:opacity-50 ${
                        isSelected
                          ? 'bg-palette-blue text-white border-palette-blue shadow-xs font-bold'
                          : 'bg-canvas-card border-canvas-border text-canvas-text hover:border-palette-blue-border hover:text-palette-blue'
                      }`}
                    >
                      {opp}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scouted Team Metadata & Quick Links */}
          {scoutedTeam && (
            <div className="pt-2.5 border-t border-canvas-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-canvas-muted text-[11px] font-medium">Scouted:</span>
                <span className="font-semibold text-canvas-text">{scoutedTeam.captainName}</span>
                {scoutedTeam.teamName && (
                  <span className="text-palette-blue text-[11px] font-medium bg-palette-blue-subtle px-2 py-0.5 rounded-bespoke border border-palette-blue-border">
                    {scoutedTeam.teamName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {scoutedTeam.teamDraftUrl && (
                  <a
                    href={scoutedTeam.teamDraftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-bespoke text-[11px] px-2.5 py-1 bg-palette-blue text-white hover:bg-palette-blue-hover font-medium flex items-center gap-1.5 shadow-xs transition"
                    title="Open Dotabuff drafts for scouted team"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Team Drafts</span>
                  </a>
                )}

                {scoutedTeam.challongeUrl && (
                  <a
                    href={scoutedTeam.challongeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-bespoke btn-surface text-[11px] px-2.5 py-1 text-canvas-text hover:text-palette-blue font-medium flex items-center gap-1.5 border border-canvas-border transition"
                    title="Open Challonge tournament bracket"
                  >
                    <Trophy className="w-3 h-3 text-palette-gold" />
                    <span>Challonge</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Loading Indicator in League Mode */}
          {isLoading && (
            <div className="pt-2 flex items-center justify-center space-x-2 text-palette-blue text-xs font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Scouting Lineup Profiles...</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Main 5-Position Input Form (Shown ONLY in Standalone Mode) */}
      {!activeLeagueId && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {POSITIONS.map((posLabel, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-palette-blue">{posLabel.split(' ')[0]}</span>
                  <span className="text-canvas-muted font-mono text-[10px]">Pos {idx + 1}</span>
                </div>
                <input
                  type="text"
                  value={inputs[idx]}
                  onChange={(e) => onChangeInput(idx, e.target.value)}
                  placeholder="ID or Dotabuff"
                  className="w-full bg-canvas-subtle text-canvas-text placeholder-canvas-muted/60 border border-canvas-border rounded-bespoke px-3 py-2 text-xs focus:outline-none focus:border-palette-blue transition"
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
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scouting Lineup...</span>
                </>
              ) : (
                <span>Scout Lineup</span>
              )}
            </button>
          </div>
        </form>
      )}

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
  );
};
