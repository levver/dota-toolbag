import { useState, useEffect } from 'react';
import { ActiveTab } from './types';
import { Navigation } from './components/Navigation';
import { HeroStatsPuller } from './components/HeroStatsPuller';
import { VoiceReminder } from './components/VoiceReminder';
import { Shield } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Sync tab from URL
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
    <div className="min-h-screen bg-dota-dark text-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Shared Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isTimerRunning={isTimerRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* We keep VoiceReminder rendered (hidden when inactive) so running timers and Web Audio are NOT destroyed when switching tabs! */}
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

      {/* Shared Modern Footer */}
      <footer className="border-t border-dota-border bg-dota-card/50 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span>Dota 2 Tactical Suite • Consolidated Web App</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Powered by OpenDota & Web Audio APIs</span>
            <span>•</span>
            <span className="text-slate-400 font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
