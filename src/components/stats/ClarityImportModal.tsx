import React, { useState } from 'react';
import { ClarityPlayerItem, ClarityTeamResult, importTeamFromClaritySheet } from '../../utils/claritySheet';
import { POSITIONS } from '../../utils/openDota';
import { X, FileSpreadsheet, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { storage } from '../../utils/storage';

interface ClarityImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLineup: (orderedAccountIds: string[]) => void;
}

export const ClarityImportModal: React.FC<ClarityImportModalProps> = ({
  isOpen,
  onClose,
  onApplyLineup,
}) => {
  const [sheetUrl, setSheetUrl] = useState(() => {
    return storage.get<string>('clarity_last_sheet_url', '');
  });
  const [division, setDivision] = useState<number>(1);
  const [captainName, setCaptainName] = useState('');
  const [step, setStep] = useState<'input' | 'positions'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamResult, setTeamResult] = useState<ClarityTeamResult | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<ClarityPlayerItem[]>([]);

  if (!isOpen) return null;

  const handleFetchTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      storage.set('clarity_last_sheet_url', sheetUrl.trim());
      const result = await importTeamFromClaritySheet(sheetUrl, division, captainName);
      setTeamResult(result);
      setAssignedPlayers(result.players);
      setStep('positions');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error?.message || 'Failed to extract team from sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionChange = (playerIndex: number, newPosition: number) => {
    const updated = [...assignedPlayers];
    const existingIndex = updated.findIndex((p) => p.assignedPosition === newPosition);

    if (existingIndex !== -1 && existingIndex !== playerIndex) {
      // Swap positions
      const oldPos = updated[playerIndex].assignedPosition;
      updated[existingIndex].assignedPosition = oldPos;
    }

    updated[playerIndex].assignedPosition = newPosition;
    setAssignedPlayers(updated);
  };

  const handleManualIdChange = (playerIndex: number, val: string) => {
    const updated = [...assignedPlayers];
    const trimmed = val.trim();
    updated[playerIndex].accountId = trimmed || null;
    updated[playerIndex].dotabuffUrl = trimmed.startsWith('http') ? trimmed : (trimmed ? `https://www.dotabuff.com/players/${trimmed}` : '');
    setAssignedPlayers(updated);
  };

  const handleApply = () => {
    // Sort players by position (1 to 5)
    const sorted = [...assignedPlayers].sort((a, b) => a.assignedPosition - b.assignedPosition);
    const orderedIds = [0, 1, 2, 3, 4].map((i) => {
      const p = sorted.find((player) => player.assignedPosition === i + 1);
      return p?.accountId || p?.dotabuffUrl || '';
    });

    onApplyLineup(orderedIds);
    onClose();
  };

  const resetModal = () => {
    setStep('input');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-canvas-card border border-canvas-border rounded-bespoke-lg w-full max-w-lg shadow-2xl overflow-hidden text-canvas-text flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-canvas-border bg-canvas-subtle">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-palette-red-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Import from Clarity Draft Sheet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-bespoke text-canvas-muted hover:text-canvas-text hover:bg-canvas-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {step === 'input' ? (
            <form onSubmit={handleFetchTeam} className="space-y-4">
              {/* Sheet URL */}
              <div>
                <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                  Google Sheet URL (Publicly shared view link)
                </label>
                <input
                  type="url"
                  required
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-red transition"
                />
              </div>

              {/* Division Selector */}
              <div>
                <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                  Division
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((divNum) => (
                    <button
                      key={divNum}
                      type="button"
                      onClick={() => setDivision(divNum)}
                      className={`btn-bespoke py-1.5 text-xs font-medium border transition ${
                        division === divNum
                          ? 'bg-palette-red-subtle text-palette-red-text border-palette-red-border shadow-xs'
                          : 'bg-canvas-subtle text-canvas-muted border-canvas-border hover:text-canvas-text'
                      }`}
                    >
                      Div {divNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* Captain Name */}
              <div>
                <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                  Captain Name (Bolded name above the 5-player group)
                </label>
                <input
                  type="text"
                  required
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="e.g. Tanaka, levver, Notre Daan..."
                  className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-red transition"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-bespoke text-xs bg-palette-red-subtle border border-palette-red-border text-palette-red-text leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-bespoke btn-red w-full font-medium text-xs py-2.5 px-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Fetching Sheet & Parsing Lineup...</span>
                ) : (
                  <>
                    <span>Locate Team & Extract Lineup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-canvas-border text-xs">
                <div>
                  <span className="font-semibold text-canvas-text">
                    Team: {teamResult?.captainName}
                  </span>
                  <span className="text-[11px] text-canvas-muted ml-2">
                    (Division {teamResult?.division})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="text-[11px] text-palette-red-text hover:underline"
                >
                  Change Captain / Division
                </button>
              </div>

              <div className="text-[11px] text-canvas-muted leading-tight">
                Assign each player to their lineup position (Pos 1–5):
              </div>

              <div className="space-y-2.5">
                {assignedPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 bg-canvas-subtle rounded-bespoke border border-canvas-border text-xs"
                  >
                    {/* Position Selector */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                      <select
                        value={player.assignedPosition}
                        onChange={(e) => handlePositionChange(idx, parseInt(e.target.value, 10))}
                        className="bg-canvas-card border border-palette-red-border text-palette-red-text rounded-bespoke px-2 py-1 text-xs font-bold focus:outline-none focus:border-palette-red flex-shrink-0"
                      >
                        {POSITIONS.map((pos, pIndex) => (
                          <option key={pIndex + 1} value={pIndex + 1}>
                            Pos {pIndex + 1} ({pos.split(' ')[0]})
                          </option>
                        ))}
                      </select>

                      {/* Player Info */}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-canvas-text truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-mono uppercase bg-palette-red-subtle text-palette-red-text px-1 rounded-bespoke-sm border border-palette-red-border">
                              Captain
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-canvas-muted mt-0.5 flex items-center gap-1.5">
                          {player.accountId ? (
                            <>
                              <span>ID: <span className="font-mono text-zinc-300">{player.accountId}</span></span>
                              {player.dotabuffUrl && (
                                <a
                                  href={player.dotabuffUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-palette-red-accent hover:underline flex items-center gap-0.5 ml-1"
                                >
                                  <span>DB</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </>
                          ) : (
                            <input
                              type="text"
                              placeholder="Paste Dotabuff URL or Account ID"
                              onChange={(e) => handleManualIdChange(idx, e.target.value)}
                              className="w-full max-w-[200px] px-1.5 py-0.5 bg-canvas-card border border-palette-gold rounded-bespoke-sm text-[10px] text-canvas-text placeholder-canvas-muted focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rank Badge / MMR */}
                    <div className="flex items-center gap-1.5 bg-canvas-card px-2.5 py-1 rounded-bespoke border border-canvas-borderLight text-xs flex-shrink-0">
                      <span className="text-[11px] text-zinc-200 font-medium">
                        {player.rankText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="btn-bespoke btn-red w-full font-medium text-xs py-2.5 px-4 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Lineup & Scout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
