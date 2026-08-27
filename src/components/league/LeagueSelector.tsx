import React from 'react';
import { useUserContext } from '../../context/UserContext';
import { Trophy, Settings, ShieldAlert } from 'lucide-react';

export const LeagueSelector: React.FC = () => {
  const {
    activeLeagueId,
    currentAdapter,
    currentProfile,
    openLeagueConfigModal
  } = useUserContext();

  const isConfigured = activeLeagueId && currentProfile?.captainName;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openLeagueConfigModal}
        className={`btn-bespoke px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 border transition rounded-bespoke ${
          activeLeagueId
            ? 'bg-palette-blue-subtle border-palette-blue-border text-palette-blue-text hover:bg-palette-blue-subtle/80'
            : 'bg-canvas-subtle border-canvas-border text-canvas-muted hover:text-canvas-text'
        }`}
        title="Configure League Profile"
      >
        {activeLeagueId && currentAdapter?.definition.logoUrl ? (
          <img
            src={currentAdapter.definition.logoUrl}
            alt={currentAdapter.definition.name}
            className="w-4 h-4 object-contain rounded-bespoke-sm"
          />
        ) : (
          <Trophy className="w-3.5 h-3.5 flex-shrink-0 text-palette-blue" />
        )}

        {activeLeagueId && currentAdapter ? (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-canvas-text">{currentAdapter.definition.shortName}</span>
            {isConfigured ? (
              <span className="text-[11px] opacity-80">
                Div {currentProfile.division} • {currentProfile.captainName}
              </span>
            ) : (
              <span className="text-[10px] text-palette-gold-text font-normal flex items-center gap-0.5">
                <ShieldAlert className="w-3 h-3" /> Setup Needed
              </span>
            )}
          </div>
        ) : (
          <span className="text-canvas-muted text-[11px]">Standalone Mode</span>
        )}
        <Settings className="w-3 h-3 ml-0.5 text-canvas-muted opacity-70 hover:opacity-100" />
      </button>
    </div>
  );
};
