import { useState, useEffect } from 'react';
import { ActiveTab } from './types';
import { Navigation } from './components/Navigation';
import { HeroStatsPuller } from './components/HeroStatsPuller';
import { VoiceReminder } from './components/VoiceReminder';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Sync tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'reminder' || tabParam === 'stats') {
      setActiveTab(tabParam as ActiveTab);
    }
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  return (
    <div className="min-h-screen bg-tool-bg text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isTimerRunning={isTimerRunning}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
          <HeroStatsPuller />
        </div>

        <div className={activeTab === 'reminder' ? 'block' : 'hidden'}>
          <VoiceReminder
            isTimerRunning={isTimerRunning}
            setIsTimerRunning={setIsTimerRunning}
          />
        </div>
      </main>

      {/* Clean Utility Footer */}
      <footer className="border-t border-tool-border bg-tool-surface/50 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-slate-500">
          <span>Dota Tools Suite</span>
          <span className="font-mono">OpenDota & Web Audio</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
