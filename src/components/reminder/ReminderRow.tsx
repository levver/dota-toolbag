import React, { useState } from 'react';
import { AlertSoundType, ReminderEvent } from '../../types';
import { formatTimeSimple, parseTimeToSeconds } from '../../utils/audio';
import {
  BellRing,
  Radio,
  Zap,
  Activity,
  ChevronsUp,
  AlertTriangle,
  Volume2,
} from 'lucide-react';

export const BeepIcon: React.FC<{ soundType: AlertSoundType; className?: string }> = ({
  soundType,
  className = 'w-3.5 h-3.5 text-palette-blue-accent flex-shrink-0',
}) => {
  switch (soundType) {
    case 'double_chime':
      return <BellRing className={className} />;
    case 'single_beep':
      return <Radio className={className} />;
    case 'high_ping':
      return <Zap className={className} />;
    case 'low_tone':
      return <Activity className={className} />;
    case 'triple_alert':
      return <ChevronsUp className={className} />;
    case 'warning_pulse':
      return <AlertTriangle className={className} />;
    default:
      return <Volume2 className={className} />;
  }
};

interface ReminderRowProps {
  reminder: ReminderEvent;
  currentTime: number;
  onUpdateReminder: (updated: ReminderEvent) => void;
  onDeleteReminder: (id: string) => void;
  onPreviewSound: (type: AlertSoundType, text?: string) => void;
}

export const ReminderRow: React.FC<ReminderRowProps> = ({
  reminder,
  currentTime,
  onUpdateReminder,
  onDeleteReminder,
  onPreviewSound,
}) => {
  const [editingField, setEditingField] = useState<'time' | 'sound' | 'text' | null>(null);
  const [editTimeValue, setEditTimeValue] = useState(formatTimeSimple(reminder.startTime));
  const [editTextValue, setEditTextValue] = useState(reminder.text || '');

  const isPast = currentTime > reminder.startTime;

  const handleSaveTime = () => {
    const parsed = parseTimeToSeconds(editTimeValue);
    if (!isNaN(parsed)) {
      onUpdateReminder({ ...reminder, startTime: parsed });
    }
    setEditingField(null);
  };

  const handleSaveText = () => {
    const trimmed = editTextValue.trim();
    if (trimmed) {
      onUpdateReminder({ ...reminder, text: trimmed });
    }
    setEditingField(null);
  };

  const handleUpdateSound = (newSound: AlertSoundType) => {
    onUpdateReminder({ ...reminder, soundType: newSound });
    setEditingField(null);
    onPreviewSound(newSound, reminder.text);
  };

  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-bespoke border text-xs transition ${
        isPast
          ? 'bg-canvas-bg/50 border-canvas-border text-canvas-muted'
          : 'bg-canvas-subtle border-canvas-border text-canvas-text'
      }`}
    >
      <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
        {/* Editable Timing */}
        {editingField === 'time' ? (
          <input
            type="text"
            autoFocus
            value={editTimeValue}
            onChange={(e) => setEditTimeValue(e.target.value)}
            onBlur={handleSaveTime}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTime();
              if (e.key === 'Escape') setEditingField(null);
            }}
            className="font-mono text-[11px] px-1.5 py-0.5 w-16 rounded-bespoke-sm bg-canvas-card border border-palette-blue text-palette-blue-text focus:outline-none flex-shrink-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditTimeValue(formatTimeSimple(reminder.startTime));
              setEditingField('time');
            }}
            title="Click to edit timing"
            className="font-mono text-[11px] px-2 py-0.5 rounded-bespoke-sm bg-canvas-card border border-canvas-borderLight text-palette-blue-text hover:border-palette-blue flex-shrink-0 font-medium transition cursor-pointer"
          >
            {formatTimeSimple(reminder.startTime)}
          </button>
        )}

        {/* Editable Sound Type */}
        {editingField === 'sound' ? (
          <select
            autoFocus
            value={reminder.soundType}
            onChange={(e) => handleUpdateSound(e.target.value as AlertSoundType)}
            onBlur={() => setEditingField(null)}
            className="bg-canvas-card border border-palette-blue rounded-bespoke-sm px-1.5 py-0.5 text-[11px] text-canvas-text focus:outline-none flex-shrink-0"
          >
            <option value="speech">Voice (TTS)</option>
            <option value="double_chime">Double Chime</option>
            <option value="single_beep">Single Beep</option>
            <option value="high_ping">High Ping</option>
            <option value="low_tone">Low Tone</option>
            <option value="triple_alert">Triple Beep</option>
            <option value="warning_pulse">Warning Pulse</option>
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditingField('sound')}
            title="Click to change alert sound"
            className="p-1 rounded-bespoke-sm hover:bg-canvas-card border border-transparent hover:border-canvas-border transition flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            {reminder.soundType === 'speech' ? (
              <span className="text-[10px] font-mono text-palette-blue-text px-1 py-0.2 rounded-bespoke-sm bg-canvas-card border border-canvas-borderLight">
                TTS
              </span>
            ) : (
              <BeepIcon soundType={reminder.soundType} />
            )}
          </button>
        )}

        {/* Editable Text */}
        <div className="min-w-0 flex-1">
          {editingField === 'text' ? (
            <input
              type="text"
              autoFocus
              value={editTextValue}
              onChange={(e) => setEditTextValue(e.target.value)}
              onBlur={handleSaveText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText();
                if (e.key === 'Escape') setEditingField(null);
              }}
              className="w-full px-2 py-0.5 bg-canvas-card border border-palette-blue rounded-bespoke-sm text-canvas-text text-xs focus:outline-none"
            />
          ) : (
            <div
              onClick={() => {
                setEditTextValue(reminder.text || '');
                setEditingField('text');
              }}
              title="Click to edit alert text"
              className="cursor-pointer transition group"
            >
              {reminder.soundType === 'speech' ? (
                <span className="italic text-canvas-text font-normal truncate block group-hover:text-palette-blue-text">
                  "{reminder.text}"
                </span>
              ) : (
                <span className="text-canvas-text font-medium truncate block group-hover:text-palette-blue-text">
                  {reminder.text}
                </span>
              )}
              {reminder.type === 'repeat' && (
                <span className="text-[10px] text-canvas-muted">
                  {reminder.repeatCount}× every {reminder.repeatFrequency}s
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1.5 flex-shrink-0">
        <button
          onClick={() => onPreviewSound(reminder.soundType, reminder.text)}
          className="btn-bespoke btn-surface px-2 py-0.5 text-[10px]"
          title="Test alert sound"
        >
          Play
        </button>
        <button
          onClick={() => onDeleteReminder(reminder.id)}
          className="px-1.5 py-0.5 text-canvas-muted hover:text-palette-red text-[10px]"
          title="Delete reminder"
        >
          Remove
        </button>
      </div>
    </div>
  );
};
