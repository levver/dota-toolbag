import { useState, useEffect } from 'react';
import { ActiveTab } from './types';
import { Navigation } from './components/Navigation';
import { HeroStatsPuller } from './components/HeroStatsPuller';
import { VoiceReminder } from './components/VoiceReminder';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

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
    <div className="min-h-screen bg-canvas-bg text-canvas-text flex flex-col font-sans selection:bg-palette-purple selection:text-white">
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isTimerRunning={isTimerRunning}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
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

      <footer className="border-t border-canvas-border py-4 text-center text-xs text-canvas-muted">
        Dota Tools Suite
      </footer>
    </div>
  );
}

export default App;
