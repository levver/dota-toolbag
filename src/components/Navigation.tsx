import React from 'react';
import { ActiveTab } from '../types';
import { Users, Timer, Layers } from 'lucide-react';

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
    <header className="border-b border-tool-border bg-tool-surface/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Title */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('stats')}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-100 tracking-tight">
                Dota Tools
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                v1.0
              </span>
            </div>
          </div>

          {/* Clean Segmented Tab Switcher */}
          <nav className="flex items-center bg-tool-bg p-1 rounded-lg border border-tool-border">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Hero Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('reminder')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
                activeTab === 'reminder'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Voice Reminder</span>
              {isTimerRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
