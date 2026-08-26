import React, { useState, useEffect, useRef } from 'react';
import { ReminderEvent, PresetConfig, AlertSoundType } from '../types';
import {
  playBeepSound,
  speakText,
  formatTime,
  formatTimeSimple,
  parseTimeToSeconds,
  ensureAudioContext,
  SOUND_PRESETS
} from '../utils/audio';
import { ToolLayout } from './ToolLayout';

interface VoiceReminderProps {
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
}

const BUILT_IN_PRESETS: PresetConfig[] = [
  {
    name: 'Dota 2 Macro (Voice + Beeps)',
    description: 'Voice callouts for runes, tormentor, and neutral items; high pings for camp stacks.',
    isBuiltIn: true,
    reminders: [
      { id: 'bounty_start', startTime: -5, type: 'single', soundType: 'speech', text: 'Bounty runes now' },
      { id: 'water_rune_2', startTime: 110, type: 'single', soundType: 'speech', text: 'Water rune in 10 seconds' },
      { id: 'bounty_3', startTime: 170, type: 'single', soundType: 'speech', text: 'Lotus pool and bounty rune' },
      { id: 'water_rune_4', startTime: 230, type: 'single', soundType: 'speech', text: 'Water rune in 10 seconds' },
      { id: 'power_rune_6', startTime: 350, type: 'single', soundType: 'speech', text: 'Power rune in 10 seconds' },
      { id: 'neutrals_t1', startTime: 410, type: 'single', soundType: 'speech', text: 'Tier 1 neutrals available' },
      { id: 'wisdom_rune_7', startTime: 410, type: 'single', soundType: 'warning_pulse', text: 'Wisdom runes' },
      { id: 'stacking_sub', startTime: 50, type: 'repeat', soundType: 'high_ping', repeatCount: 15, repeatFrequency: 60, text: 'Stack camp' },
      { id: 'lotus_repeat', startTime: 170, type: 'repeat', soundType: 'double_chime', repeatCount: 10, repeatFrequency: 180, text: 'Lotus pool' },
      { id: 'power_repeat', startTime: 470, type: 'repeat', soundType: 'speech', repeatCount: 15, repeatFrequency: 120, text: 'Check power rune' },
      { id: 'wisdom_repeat', startTime: 830, type: 'repeat', soundType: 'warning_pulse', repeatCount: 6, repeatFrequency: 420, text: 'Wisdom rune in 10 seconds' },
      { id: 'neutrals_t2', startTime: 1010, type: 'single', soundType: 'speech', text: 'Tier 2 neutrals available' },
      { id: 'tormentor_20', startTime: 1190, type: 'single', soundType: 'triple_alert', text: 'Tormentor ready at 20 minutes' },
      { id: 'neutrals_t3', startTime: 1610, type: 'single', soundType: 'speech', text: 'Tier 3 neutrals available' },
      { id: 'neutrals_t4', startTime: 2210, type: 'single', soundType: 'speech', text: 'Tier 4 neutrals available' },
      { id: 'neutrals_t5', startTime: 3590, type: 'single', soundType: 'triple_alert', text: 'Tier 5 neutrals available' }
    ]
  },
  {
    name: 'All Beeps & Chimes (No Voice)',
    description: 'Pure audio cues using chimes, pings, and pulses without text-to-speech reading.',
    isBuiltIn: true,
    reminders: [
      { id: 'b_start', startTime: -5, type: 'single', soundType: 'double_chime', text: 'Bounties' },
      { id: 'w_2', startTime: 110, type: 'single', soundType: 'high_ping', text: 'Water Rune 2m' },
      { id: 'lotus_3', startTime: 170, type: 'single', soundType: 'single_beep', text: 'Lotus 3m' },
      { id: 'w_4', startTime: 230, type: 'single', soundType: 'high_ping', text: 'Water Rune 4m' },
      { id: 'p_6', startTime: 350, type: 'single', soundType: 'double_chime', text: 'Power Rune 6m' },
      { id: 'p_rep', startTime: 470, type: 'repeat', soundType: 'double_chime', repeatCount: 15, repeatFrequency: 120, text: 'Power Runes' },
      { id: 'stack_rep', startTime: 50, type: 'repeat', soundType: 'high_ping', repeatCount: 20, repeatFrequency: 60, text: 'Stack :53' },
      { id: 'torm_20', startTime: 1190, type: 'single', soundType: 'warning_pulse', text: 'Tormentor 20m' }
    ]
  }
];

export const VoiceReminder: React.FC<VoiceReminderProps> = ({
  isTimerRunning,
  setIsTimerRunning
}) => {
  const [currentTime, setCurrentTime] = useState<number>(-30.0);
  const [reminders, setReminders] = useState<ReminderEvent[]>([]);
  const [customPresets, setCustomPresets] = useState<Record<string, ReminderEvent[]>>({});
  const [newPresetName, setNewPresetName] = useState('');

  // Form State
  const [startTimeInput, setStartTimeInput] = useState('-00:30');
  const [reminderType, setReminderType] = useState<'single' | 'repeat'>('single');
  const [soundType, setSoundType] = useState<AlertSoundType>('speech');
  const [reminderText, setReminderText] = useState('');
  const [repeatCount, setRepeatCount] = useState<number>(5);
  const [repeatFreq, setRepeatFreq] = useState<number>(60);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(-30.0);
  const remindersRef = useRef<ReminderEvent[]>([]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    try {
      const storedReminders = localStorage.getItem('voice_reminders');
      if (storedReminders) {
        const parsed = JSON.parse(storedReminders);
        const normalized = parsed.map((r: ReminderEvent) => ({
          ...r,
          soundType: r.soundType || 'speech'
        }));
        setReminders(normalized);
      } else {
        setReminders(BUILT_IN_PRESETS[0].reminders);
      }

      const storedPresets = localStorage.getItem('voice_reminder_presets');
      if (storedPresets) {
        setCustomPresets(JSON.parse(storedPresets));
      }
    } catch (e) {
      console.warn('Failed to parse localStorage reminders:', e);
    }
  }, []);

  const saveRemindersToStorage = (updated: ReminderEvent[]) => {
    setReminders(updated);
    try {
      localStorage.setItem('voice_reminders', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  };

  const getReminderTriggerTimes = (reminder: ReminderEvent): number[] => {
    const times = [reminder.startTime];
    if (reminder.type === 'repeat' && reminder.repeatCount && reminder.repeatFrequency) {
      for (let i = 1; i <= reminder.repeatCount; i++) {
        times.push(reminder.startTime + i * reminder.repeatFrequency);
      }
    }
    return times;
  };

  const triggerAlert = (reminder: ReminderEvent) => {
    ensureAudioContext();
    if (reminder.soundType === 'speech') {
      playBeepSound('double_chime', 0.15);
      if (reminder.text) {
        setTimeout(() => speakText(reminder.text || ''), 250);
      }
    } else {
      playBeepSound(reminder.soundType, 0.25);
    }
  };

  const checkAndTriggerAlerts = (prevTime: number, nextTime: number) => {
    remindersRef.current.forEach((reminder) => {
      if (reminder.enabled === false) return;
      const triggerTimes = getReminderTriggerTimes(reminder);

      triggerTimes.forEach((t) => {
        if (prevTime < t && nextTime >= t) {
          triggerAlert(reminder);
        }
      });
    });
  };

  const tick = (now: number) => {
    if (!lastTickTimeRef.current) {
      lastTickTimeRef.current = now;
    }

    const deltaSecs = (now - lastTickTimeRef.current) / 1000;
    lastTickTimeRef.current = now;

    const prev = currentTimeRef.current;
    const next = prev + deltaSecs;

    checkAndTriggerAlerts(prev, next);

    currentTimeRef.current = next;
    setCurrentTime(next);

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleStart = () => {
    ensureAudioContext();
    setIsTimerRunning(true);
    lastTickTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handlePause = () => {
    setIsTimerRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastTickTimeRef.current = null;
  };

  const handleReset = () => {
    handlePause();
    currentTimeRef.current = -30.0;
    setCurrentTime(-30.0);
  };

  const handleAdjustTime = (delta: number) => {
    const next = currentTime + delta;
    currentTimeRef.current = next;
    setCurrentTime(next);
  };

  const handleSetZero = () => {
    currentTimeRef.current = 0.0;
    setCurrentTime(0.0);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleAddReminder = (e: React.FormEvent) => {
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
      enabled: true
    };

    if (reminderType === 'repeat') {
      newReminder.repeatCount = Number(repeatCount) || 5;
      newReminder.repeatFrequency = Number(repeatFreq) || 60;
    }

    const updated = [...reminders, newReminder].sort((a, b) => a.startTime - b.startTime);
    saveRemindersToStorage(updated);

    setReminderText('');
    setFeedbackMsg(null);
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    saveRemindersToStorage(updated);
  };

  const handleClearAllReminders = () => {
    if (window.confirm('Clear all scheduled alerts?')) {
      saveRemindersToStorage([]);
    }
  };

  const handleLoadPresetConfig = (presetReminders: ReminderEvent[], presetName: string) => {
    saveRemindersToStorage(presetReminders);
    setFeedbackMsg(`Loaded configuration "${presetName}".`);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleSaveCustomPreset = () => {
    const name = newPresetName.trim();
    if (!name) {
      alert('Please enter a configuration name.');
      return;
    }
    if (reminders.length === 0) {
      alert('Cannot save an empty configuration.');
      return;
    }

    const updatedPresets = { ...customPresets, [name]: [...reminders] };
    setCustomPresets(updatedPresets);
    localStorage.setItem('voice_reminder_presets', JSON.stringify(updatedPresets));
    setNewPresetName('');
  };

  const handleDeleteCustomPreset = (name: string) => {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    localStorage.setItem('voice_reminder_presets', JSON.stringify(updated));
  };

  const handlePreviewSound = (type: AlertSoundType, sampleText?: string) => {
    ensureAudioContext();
    if (type === 'speech') {
      const textToSpeak = sampleText?.trim() || 'Sample speech alert';
      playBeepSound('double_chime', 0.15);
      setTimeout(() => speakText(textToSpeak), 250);
    } else {
      playBeepSound(type, 0.25);
    }
  };

  const isPreGame = currentTime < 0;

  return (
    <ToolLayout title="Timed Voice & Sound Reminder" accentColor="blue">
      {/* Clock Section */}
      <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-5">
        <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
              Match Clock
            </span>
            <span className="text-[11px] text-palette-blue-text font-mono">
              ({isPreGame ? 'Pre-game' : 'Game time'})
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-bespoke border font-mono ${
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
            onClick={isTimerRunning ? handlePause : handleStart}
            className={`btn-bespoke px-5 py-2 font-medium text-xs text-white ${
              isTimerRunning
                ? 'bg-amber-700 hover:bg-amber-600 border border-amber-500'
                : 'btn-blue'
            }`}
          >
            {isTimerRunning ? 'Pause Clock' : 'Start Match Clock'}
          </button>

          <button
            onClick={handleReset}
            className="btn-bespoke btn-surface px-3.5 py-2 text-xs font-medium"
          >
            Reset (-00:30)
          </button>

          <div className="flex items-center space-x-1 border border-canvas-borderLight rounded-bespoke bg-canvas-subtle px-1.5 py-1">
            <button
              onClick={() => handleAdjustTime(-10)}
              className="btn-bespoke px-2 py-0.5 text-xs font-mono text-canvas-muted hover:text-canvas-text"
              title="Subtract 10 seconds"
            >
              -10s
            </button>
            <button
              onClick={handleSetZero}
              className="btn-bespoke px-2.5 py-0.5 text-xs font-mono text-palette-blue-text font-bold hover:bg-canvas-card"
              title="Set to 00:00"
            >
              00:00
            </button>
            <button
              onClick={() => handleAdjustTime(10)}
              className="btn-bespoke px-2 py-0.5 text-xs font-mono text-canvas-muted hover:text-canvas-text"
              title="Add 10 seconds"
            >
              +10s
            </button>
          </div>
        </div>
      </div>

      {/* Add Reminder Form */}
      <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3.5">
        <div className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
          Add Custom Alert
        </div>

        <form onSubmit={handleAddReminder} className="space-y-3.5">
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
                  onClick={() => handlePreviewSound(soundType, reminderText)}
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
            <div className="text-[11px] text-palette-gold-text">
              {feedbackMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-bespoke btn-blue w-full py-2 font-medium text-xs flex items-center justify-center gap-1.5"
          >
            <span>+ Add Alert</span>
          </button>
        </form>
      </div>

      {/* Scheduled Reminders List */}
      <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-canvas-border">
          <span className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
            Scheduled Alerts ({reminders.length})
          </span>
          {reminders.length > 0 && (
            <button
              onClick={handleClearAllReminders}
              className="text-[11px] text-canvas-muted hover:text-palette-red transition"
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
            {reminders.map((r) => {
              const isPast = currentTime > r.startTime;
              const soundMeta = SOUND_PRESETS.find((s) => s.id === r.soundType);

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-2.5 rounded-bespoke border text-xs transition ${
                    isPast
                      ? 'bg-canvas-bg/50 border-canvas-border text-canvas-muted'
                      : 'bg-canvas-subtle border-canvas-border text-canvas-text'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-bespoke-sm bg-canvas-card border border-canvas-borderLight text-palette-blue-text flex-shrink-0 font-medium">
                      {formatTimeSimple(r.startTime)}
                    </span>

                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-bespoke-sm border font-mono flex-shrink-0 ${
                        r.soundType === 'speech'
                          ? 'bg-palette-blue-subtle border-palette-blue-border text-palette-blue-text'
                          : 'bg-canvas-card border-canvas-borderLight text-zinc-300'
                      }`}
                    >
                      {soundMeta ? soundMeta.label.split(' ')[0] : 'Sound'}
                    </span>

                    <div className="min-w-0">
                      <span className="truncate block font-medium">
                        "{r.text}"
                      </span>
                      {r.type === 'repeat' && (
                        <span className="text-[10px] text-canvas-muted">
                          {r.repeatCount}× every {r.repeatFrequency}s
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => handlePreviewSound(r.soundType, r.text)}
                      className="btn-bespoke btn-surface px-2 py-0.5 text-[10px]"
                      title="Test alert sound"
                    >
                      Play
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(r.id)}
                      className="px-1.5 py-0.5 text-canvas-muted hover:text-palette-red text-[10px]"
                      title="Delete reminder"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified Saved Configurations & Presets Section */}
      <div className="bg-canvas-card rounded-bespoke-lg border border-canvas-border p-4 sm:p-5 space-y-3.5">
        <div className="text-xs font-semibold text-canvas-muted uppercase tracking-wider">
          Saved Configurations
        </div>

        {/* Save Current Reminders Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Save Current Schedule as Profile Name..."
            className="flex-1 px-3 py-2 bg-canvas-subtle border border-canvas-border rounded-bespoke text-canvas-text text-xs focus:outline-none focus:border-palette-blue transition"
          />
          <button
            onClick={handleSaveCustomPreset}
            className="btn-bespoke btn-surface px-3.5 py-2 text-xs font-medium"
          >
            Save Current
          </button>
        </div>

        {/* Configurations List (Built-in Presets + Custom Configurations) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Default Built-In Configurations */}
          {BUILT_IN_PRESETS.map((preset, idx) => (
            <div
              key={`builtin_${idx}`}
              className="flex items-center justify-between p-3 bg-canvas-subtle rounded-bespoke border border-canvas-border text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-canvas-text truncate">{preset.name}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-bespoke-sm bg-palette-blue-subtle text-palette-blue-text border border-palette-blue-border">
                    Default
                  </span>
                </div>
                <div className="text-[10px] text-canvas-muted mt-0.5">{preset.reminders.length} alerts • {preset.description}</div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  onClick={() => handleLoadPresetConfig(preset.reminders, preset.name)}
                  className="btn-bespoke btn-surface text-xs px-2.5 py-1 text-palette-blue-text font-medium"
                >
                  Load
                </button>
              </div>
            </div>
          ))}

          {/* User Custom Saved Configurations */}
          {Object.entries(customPresets).map(([name, items]) => (
            <div
              key={`custom_${name}`}
              className="flex items-center justify-between p-3 bg-canvas-subtle rounded-bespoke border border-canvas-border text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-canvas-text truncate">{name}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-bespoke-sm bg-canvas-card text-canvas-muted border border-canvas-border">
                    Custom
                  </span>
                </div>
                <div className="text-[10px] text-canvas-muted mt-0.5">{items.length} alerts</div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  onClick={() => handleLoadPresetConfig(items, name)}
                  className="btn-bespoke btn-surface text-xs px-2.5 py-1 text-palette-blue-text font-medium"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDeleteCustomPreset(name)}
                  className="text-canvas-muted hover:text-palette-red px-1 py-0.5 text-xs"
                  title="Delete configuration"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
};
