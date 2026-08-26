import React, { useState } from 'react';
import { AlertSoundType, ReminderEvent } from '../../types';
import { SOUND_PRESETS, parseTimeToSeconds } from '../../utils/audio';

interface AddReminderFormProps {
  onAddReminder: (reminder: ReminderEvent) => void;
  onPreviewSound: (type: AlertSoundType, text?: string) => void;
}

export const AddReminderForm: React.FC<AddReminderFormProps> = ({
  onAddReminder,
  onPreviewSound,
}) => {
  const [startTimeInput, setStartTimeInput] = useState('-00:30');
  const [reminderType, setReminderType] = useState<'single' | 'repeat'>('single');
  const [soundType, setSoundType] = useState<AlertSoundType>('speech');
  const [reminderText, setReminderText] = useState('');
  const [repeatCount, setRepeatCount] = useState<number>(5);
  const [repeatFreq, setRepeatFreq] = useState<number>(60);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = parseTimeToSeconds(startTimeInput);
    if (isNaN(startTime)) {
      setFeedbackMsg('Invalid start time format (e.g. -00:30, 02:00, or 75).');
      return;
    }

    if (soundType === 'speech' && !reminderText.trim()) {
      setFeedbackMsg('Please enter text to read.');
      return;
    }

    const soundOption = SOUND_PRESETS.find((s) => s.id === soundType);
    const labelText = reminderText.trim() || soundOption?.label || 'Beep Alert';

    const newReminder: ReminderEvent = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime,
      type: reminderType,
      soundType,
      text: labelText,
      enabled: true,
    };

    if (reminderType === 'repeat') {
      newReminder.repeatCount = Number(repeatCount) || 5;
      newReminder.repeatFrequency = Number(repeatFreq) || 60;
    }

    onAddReminder(newReminder);
    setReminderText('');
    setFeedbackMsg(null);
  };

  return (
    <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3.5">
      <div className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
        Add Custom Alert
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start Time */}
          <div>
            <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
              Start Time (e.g. -00:30, 02:00, or 75)
            </label>
            <input
              type="text"
              value={startTimeInput}
              onChange={(e) => setStartTimeInput(e.target.value)}
              required
              className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
              Schedule Type
            </label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value as 'single' | 'repeat')}
              className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
            >
              <option value="single">Single Event</option>
              <option value="repeat">Repeating Event</option>
            </select>
          </div>

          {/* Sound Alert Mode */}
          <div>
            <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
              Alert Sound Mode
            </label>
            <div className="flex gap-1.5">
              <select
                value={soundType}
                onChange={(e) => setSoundType(e.target.value as AlertSoundType)}
                className="flex-1 px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
              >
                <optgroup label="Voice">
                  <option value="speech">Read Text (Voice TTS)</option>
                </optgroup>
                <optgroup label="Preset Range of Beeps">
                  <option value="double_chime">Double Chime (Classic)</option>
                  <option value="single_beep">Single Beep (880Hz)</option>
                  <option value="high_ping">High Ping (1200Hz)</option>
                  <option value="low_tone">Low Tone (350Hz)</option>
                  <option value="triple_alert">Triple Ascending Beep</option>
                  <option value="warning_pulse">Warning Double Pulse</option>
                </optgroup>
              </select>
              <button
                type="button"
                onClick={() => onPreviewSound(soundType, reminderText)}
                className="btn-bespoke btn-surface px-2.5 py-1 text-[11px] font-medium"
                title="Audition selected sound effect"
              >
                Test
              </button>
            </div>
          </div>
        </div>

        {/* Repeat Options */}
        {reminderType === 'repeat' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-canvas-subtle rounded-bespoke border border-canvas-border">
            <div>
              <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                Repeat Count (times)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={repeatCount}
                onChange={(e) => setRepeatCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 bg-canvas-card border border-canvas-borderLight rounded-bespoke text-canvas-text text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
                Frequency Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="3600"
                value={repeatFreq}
                onChange={(e) => setRepeatFreq(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 bg-canvas-card border border-canvas-borderLight rounded-bespoke text-canvas-text text-xs"
              />
            </div>
          </div>
        )}

        {/* Text Input */}
        <div>
          <label className="block text-[11px] text-canvas-muted mb-1 font-medium">
            {soundType === 'speech' ? 'Spoken Text (TTS)' : 'Label / Description (Optional)'}
          </label>
          <input
            type="text"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            placeholder={soundType === 'speech' ? 'e.g. Check power rune' : 'e.g. Camp stack'}
            required={soundType === 'speech'}
            className="w-full px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
          />
        </div>

        {feedbackMsg && (
          <div className="text-[11px] text-palette-gold-text">{feedbackMsg}</div>
        )}

        <button
          type="submit"
          className="btn-bespoke btn-accent w-full font-medium text-xs py-2.5 px-4 flex items-center justify-center gap-2"
        >
          <span>+ Add Alert</span>
        </button>
      </form>
    </div>
  );
};
