import { HeroStatsSection } from '../../types';
import { getWinrateColor } from '../../utils/openDota';

interface StatColumnProps {
  title: string;
  data: HeroStatsSection;
}

export const StatColumn: React.FC<StatColumnProps> = ({ title, data }) => {
  return (
    <div className="bg-canvas-subtle rounded-bespoke p-3 border border-canvas-border">
      <div className="text-[11px] font-semibold text-zinc-300 pb-2 mb-2 border-b border-canvas-border">
        <span>{title}</span>
      </div>

      {data.success && data.heroes && data.heroes.length > 0 ? (
        <ul className="space-y-1.5">
          {data.heroes.map((hero, index) => {
            const wrBg = getWinrateColor(hero.winrate);

            return (
              <li
                key={index}
                className="flex items-center justify-between text-xs text-zinc-200 py-0.5"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1.5">
                  <span className="text-[10px] font-mono text-canvas-muted w-3 text-right">
                    {index + 1}
                  </span>
                  <img
                    src={hero.iconUrl}
                    alt={hero.name}
                    className="w-5 h-5 rounded-bespoke-sm object-cover border border-canvas-borderLight flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (hero.remoteIconUrl && target.src !== hero.remoteIconUrl) {
                        target.src = hero.remoteIconUrl;
                      } else {
                        target.src = 'https://placehold.co/20x20/27272a/FFFFFF?text=?';
                      }
                    }}
                  />
                  <span className="text-[11px] font-medium truncate" title={hero.name}>
                    {hero.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    {hero.games} ⚔
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-bespoke-sm text-black text-center min-w-[36px]"
                    style={{ backgroundColor: wrBg }}
                  >
                    {hero.winrate}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="h-24 flex items-center justify-center text-center text-[11px] text-canvas-muted">
          {data.message || 'No match statistics available'}
        </div>
      )}
    </div>
  );
};
