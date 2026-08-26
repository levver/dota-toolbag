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
    <header className="border-b border-panel-border bg-panel-bg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Simple App Title */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">
              Dota Tools
            </span>
          </div>

          {/* Clean Functional Tabs */}
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Hero Stats
            </button>

            <button
              onClick={() => setActiveTab('reminder')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'reminder'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span>Timed Reminders</span>
              {isTimerRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
