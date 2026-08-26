import React from 'react';
import { ActiveTab } from '../types';
import { BarChart3, Bell, Shield, Volume2 } from 'lucide-react';

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
    <header className="border-b border-dota-border bg-dota-card/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('stats')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center shadow-lg shadow-red-900/40 border border-red-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-wider font-sans flex items-center gap-1.5">
                DOTA <span className="text-red-500">TOOLS</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 -mt-1 font-medium tracking-wide">
                Tactical Suite & Timers
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-dota-dark/80 p-1 rounded-xl border border-dota-border">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Hero Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('reminder')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                activeTab === 'reminder'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Voice Reminder</span>
              {isTimerRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </nav>

          {/* Right utility items */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-dota-border rounded-full text-xs text-slate-400">
              <Volume2 className="w-3.5 h-3.5 text-red-400" />
              <span>Web Speech & Synthesizer</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
