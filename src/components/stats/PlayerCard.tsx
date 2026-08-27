import React from 'react';
import { PlayerProfileResult } from '../../types';
import { StatColumn } from './StatColumn';

interface PlayerCardProps {
  player: PlayerProfileResult;
  positionIndex: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, positionIndex }) => {
  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3.5">
      {/* Player Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-canvas-border">
        <div className="flex items-center space-x-3 min-w-0">
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="w-8 h-8 rounded-bespoke object-cover border border-canvas-borderLight flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute(
                'src',
                'https://placehold.co/32x32/1e293b/FFFFFF?text=P'
              );
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-bespoke-sm bg-palette-red-subtle border border-palette-red-border text-palette-red-text">
                Pos {positionIndex + 1}
              </span>
              <span className="text-sm font-semibold text-canvas-text truncate">
                {player.name}
              </span>
            </div>
            <div className="text-[11px] text-canvas-muted mt-0.5">
              ID: <span className="font-mono text-zinc-300">{player.accountId}</span> •{' '}
              <a
                href={`https://www.dotabuff.com/players/${player.accountId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-palette-red-accent hover:underline"
              >
                Dotabuff
              </a>
            </div>
          </div>
        </div>

        {/* Rank Badge */}
        <div className="flex items-center gap-2 bg-canvas-subtle px-2.5 py-1.5 rounded-bespoke border border-canvas-borderLight text-xs">
          <img
            src={player.rankUrl.url}
            alt={player.rankText}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (player.rankUrl.fallbackUrl && target.src !== player.rankUrl.fallbackUrl) {
                target.src = player.rankUrl.fallbackUrl;
              } else {
                target.src = 'https://placehold.co/24x24/27272a/FFFFFF?text=R';
              }
            }}
          />
          <span className="text-[11px] text-canvas-text font-medium">{player.rankText}</span>
        </div>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatColumn title="All-Time Heroes" data={player.allTime} />
        <StatColumn title="Last Month Heroes" data={player.monthly} />
        <StatColumn title="Recent Tournament Games (All teams)" data={player.pro} />
      </div>
    </div>
  );
};
