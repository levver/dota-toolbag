import React from 'react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isTimerRunning?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isTimerRunning = false
}) => {
  return (
    <header className="border-b border-canvas-border bg-canvas-bg sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-13 py-2.5">
          {/* App Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('stats')}
          >
            <img
              src="/logo.png"
              alt="levver's toolbag"
              className="w-6 h-6 rounded-bespoke object-contain"
            />
            <span className="font-semibold text-sm text-canvas-text tracking-tight">
              levver's toolbag
            </span>
          </div>

          {/* Navigation Tabs with tool hues (1: Red, 2: Blue) */}
          <nav className="flex space-x-1.5 p-1 bg-canvas-card rounded-bespoke-lg border border-canvas-border">
            {/* Tool 1: Hero Stats (Red) */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`btn-bespoke px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-palette-red-subtle text-palette-red-text border border-palette-red-border shadow-sm'
                  : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTab === 'stats' ? 'bg-palette-red' : 'bg-canvas-border'
                }`}
              ></span>
              <span>Hero Stats</span>
            </button>

            {/* Tool 2: Voice & Sound Reminder (Blue) */}
            <button
              onClick={() => setActiveTab('reminder')}
              className={`btn-bespoke px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                activeTab === 'reminder'
                  ? 'bg-palette-blue-subtle text-palette-blue-text border border-palette-blue-border shadow-sm'
                  : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTab === 'reminder' ? 'bg-palette-blue' : 'bg-canvas-border'
                }`}
              ></span>
              <span>Timed Reminders</span>
              {isTimerRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
