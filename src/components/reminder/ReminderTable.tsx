import React from 'react';
import { AlertSoundType, ReminderEvent } from '../../types';
import { ReminderRow } from './ReminderRow';

interface ReminderTableProps {
  reminders: ReminderEvent[];
  currentTime: number;
  onUpdateReminder: (updated: ReminderEvent) => void;
  onDeleteReminder: (id: string) => void;
  onClearAll: () => void;
  onPreviewSound: (type: AlertSoundType, text?: string) => void;
}

export const ReminderTable: React.FC<ReminderTableProps> = ({
  reminders,
  currentTime,
  onUpdateReminder,
  onDeleteReminder,
  onClearAll,
  onPreviewSound,
}) => {
  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-canvas-border">
        <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
          Scheduled Alerts ({reminders.length})
        </span>
        {reminders.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="btn-bespoke btn-surface text-[11px] px-2.5 py-1 font-medium text-canvas-muted hover:text-palette-red transition"
          >
            Clear all
          </button>
        )}
      </div>

      {reminders.length === 0 ? (
        <div className="py-6 text-center text-canvas-muted text-xs">
          No scheduled alerts.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {reminders.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              currentTime={currentTime}
              onUpdateReminder={onUpdateReminder}
              onDeleteReminder={onDeleteReminder}
              onPreviewSound={onPreviewSound}
            />
          ))}
        </div>
      )}
    </div>
  );
};
