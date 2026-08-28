import React from 'react';
import { TOOLS, TOOL_ACCENT_MAP } from '../config/tools';
import { useTimerContext } from '../context/TimerContext';
import { LeagueSelector } from './league/LeagueSelector';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { isTimerRunning } = useTimerContext();

  return (
    <header className="border-b border-canvas-border bg-canvas-bg sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-13 py-2.5">
          {/* App Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab(TOOLS[0].id)}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="levver's toolbag"
              className="w-6 h-6 rounded-bespoke object-contain"
            />
            <span className="font-semibold text-sm text-canvas-text tracking-tight hidden sm:inline">
              levver's toolbag
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <LeagueSelector />

            {/* Dynamic Navigation Tabs from Registry */}
            <nav className="flex space-x-1.5 p-1 bg-canvas-card rounded-bespoke-lg border border-canvas-border">
            {TOOLS.map((tool) => {
              const isActive = activeTab === tool.id;
              const accent = TOOL_ACCENT_MAP[tool.accentColor];

              const activeStyle = isActive
                ? {
                    backgroundColor: accent.subtle,
                    borderColor: accent.border,
                    color: accent.text,
                  }
                : undefined;

              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  style={activeStyle}
                  className={`btn-bespoke px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                    isActive
                      ? 'shadow-sm'
                      : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle border-transparent'
                  }`}
                >
                  <span
                    style={{ backgroundColor: isActive ? accent.solid : undefined }}
                    className={`w-1.5 h-1.5 rounded-full ${!isActive ? 'bg-canvas-border' : ''}`}
                  ></span>
                  <span>{tool.navLabel}</span>
                  {tool.id === 'reminder' && isTimerRunning && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  </header>
);
};
