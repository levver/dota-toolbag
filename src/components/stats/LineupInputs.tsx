import React from 'react';
import { POSITIONS } from '../../utils/openDota';
import { FileSpreadsheet } from 'lucide-react';

interface LineupInputsProps {
  inputs: string[];
  onChangeInput: (index: number, val: string) => void;
  onClear: () => void;
  onOpenImportModal: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  heroMapLoading: boolean;
  message: { text: string; type: 'error' | 'success' | 'info' } | null;
}

export const LineupInputs: React.FC<LineupInputsProps> = ({
  inputs,
  onChangeInput,
  onClear,
  onOpenImportModal,
  onSubmit,
  isLoading,
  heroMapLoading,
  message,
}) => {
  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
            Lineup Positions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="btn-bespoke btn-surface text-[11px] px-2.5 py-1 font-medium text-palette-red-text border border-palette-red-border hover:bg-palette-red-subtle/40 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import from Clarity Draft Sheet</span>
            </button>
            <button
              type="button"
              onClick={onClear}
              className="btn-bespoke btn-surface text-[11px] px-2.5 py-1 font-medium"
            >
              Clear Lineup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {POSITIONS.map((posLabel, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-palette-red-text">{posLabel.split(' ')[0]}</span>
                <span className="text-canvas-muted font-mono text-[10px]">Pos {idx + 1}</span>
              </div>
              <input
                type="text"
                value={inputs[idx]}
                onChange={(e) => onChangeInput(idx, e.target.value)}
                placeholder="ID or Dotabuff"
                className="w-full bg-canvas-subtle text-canvas-text placeholder-canvas-muted/60 border border-canvas-border rounded-bespoke px-3 py-2 text-xs focus:outline-none focus:border-palette-red transition"
              />
            </div>
          ))}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || heroMapLoading}
            className="btn-bespoke btn-accent w-full font-medium text-xs py-2.5 px-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Scouting...</span>
            ) : (
              <span>Scout</span>
            )}
          </button>
        </div>
      </form>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-3 rounded-bespoke text-xs border ${
            message.type === 'error'
              ? 'bg-palette-red-subtle border-palette-red-border text-palette-red-text'
              : message.type === 'success'
              ? 'bg-palette-green-subtle border-palette-green-border text-palette-green-text'
              : 'bg-canvas-subtle border-canvas-border text-canvas-text'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
