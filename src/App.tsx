import { useState, useEffect } from 'react';
import { TOOLS } from './config/tools';
import { Navigation } from './components/Navigation';
import { TimerProvider } from './context/TimerContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>(TOOLS[0].id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TOOLS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tabId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  return (
    <div className="min-h-screen bg-canvas-bg text-canvas-text flex flex-col font-sans selection:bg-palette-blue selection:text-white">
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {TOOLS.map((tool) => {
          const Component = tool.component;
          return (
            <div
              key={tool.id}
              className={activeTab === tool.id ? 'block' : 'hidden'}
            >
              <Component />
            </div>
          );
        })}
      </main>

      <footer className="border-t border-canvas-border py-4 text-center text-xs text-canvas-muted">
        levver's toolbag
      </footer>
    </div>
  );
}

export function App() {
  return (
    <TimerProvider>
      <AppContent />
    </TimerProvider>
  );
}

export default App;
