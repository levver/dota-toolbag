import React from 'react';
import { formatTime } from '../../utils/audio';

interface ClockControlsProps {
  currentTime: number;
  isTimerRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onAdjustTime: (delta: number) => void;
  onSetZero: () => void;
}

export const ClockControls: React.FC<ClockControlsProps> = ({
  currentTime,
  isTimerRunning,
  onStart,
  onPause,
  onReset,
  onAdjustTime,
  onSetZero,
}) => {
  const isPreGame = currentTime < 0;

  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-5">
      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
            Match Clock
          </span>
          <span className="text-[11px] text-palette-blue-text font-medium">
            ({isPreGame ? 'Pre-game' : 'Game time'})
          </span>
        </div>

        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-bespoke border ${
            isTimerRunning
              ? 'bg-palette-blue-subtle text-palette-blue-text border-palette-blue-border'
              : 'bg-canvas-subtle text-canvas-muted border-canvas-border'
          }`}
        >
          {isTimerRunning ? 'Clock Running' : 'Clock Paused'}
        </span>
      </div>

      {/* Digital Clock */}
      <div className="py-4 text-center">
        <div
          className={`font-mono font-bold tracking-wider text-5xl sm:text-6xl tabular-nums select-none ${
            isPreGame ? 'text-canvas-text' : 'text-palette-blue-text'
          }`}
        >
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-canvas-border">
        <button
          onClick={isTimerRunning ? onPause : onStart}
          className={`btn-bespoke px-5 py-2 font-medium text-xs text-white ${
            isTimerRunning
              ? 'bg-amber-700 hover:bg-amber-600 border border-amber-500'
              : 'btn-accent'
          }`}
        >
          {isTimerRunning ? 'Pause Clock' : 'Start Match Clock'}
        </button>

        <button
          onClick={onReset}
          className="btn-bespoke btn-surface px-3.5 py-2 text-xs font-medium"
        >
          Reset (-00:30)
        </button>

        <div className="flex items-center space-x-1 border border-canvas-borderLight rounded-bespoke bg-canvas-subtle px-1.5 py-1">
          <button
            onClick={() => onAdjustTime(-10)}
            className="btn-bespoke px-2 py-0.5 text-xs font-mono text-canvas-muted hover:text-canvas-text"
            title="Subtract 10 seconds"
          >
            -10s
          </button>
          <button
            onClick={onSetZero}
            className="btn-bespoke px-2.5 py-0.5 text-xs font-mono text-palette-blue-text font-bold hover:bg-canvas-card"
            title="Set to 00:00"
          >
            00:00
          </button>
          <button
            onClick={() => onAdjustTime(10)}
            className="btn-bespoke px-2 py-0.5 text-xs font-mono text-canvas-muted hover:text-canvas-text"
            title="Add 10 seconds"
          >
            +10s
          </button>
        </div>
      </div>
    </div>
  );
};
