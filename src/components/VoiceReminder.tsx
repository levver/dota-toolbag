import React, { useState, useEffect, useRef } from 'react';
import { ReminderEvent, PresetConfig } from '../types';
import {
  playChime,
  speakText,
  formatTime,
  formatTimeSimple,
  parseTimeToSeconds,
  ensureAudioContext
} from '../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Bookmark,
  Volume2,
  Clock,
  Check,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface VoiceReminderProps {
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
}

const BUILT_IN_PRESETS: PresetConfig[] = [
  {
    name: 'Dota 2 Macro Timers',
    description: 'Bounties, Water Runes, Power Runes, Lotus Pools, Wisdom Runes, Tormentors, and Neutral Items.',
    isBuiltIn: true,
    reminders: [
      { id: 'bounty_start', startTime: -5, type: 'single', text: 'Bounty runes spawning now!' },
      { id: 'water_rune_2', startTime: 110, type: 'single', text: 'Water runes in 10 seconds.' },
      { id: 'bounty_3', startTime: 170, type: 'single', text: 'Lotus pool and bounty runes in 10 seconds.' },
      { id: 'water_rune_4', startTime: 230, type: 'single', text: 'Water runes in 10 seconds.' },
      { id: 'power_rune_6', startTime: 350, type: 'single', text: 'Power rune spawning in 10 seconds.' },
      { id: 'neutrals_t1', startTime: 410, type: 'single', text: 'Tier 1 neutral items available in 10 seconds.' },
      { id: 'wisdom_rune_7', startTime: 410, type: 'single', text: 'Wisdom runes spawning in 10 seconds.' },
      { id: 'stacking_sub', startTime: 50, type: 'repeat', repeatCount: 15, repeatFrequency: 60, text: 'Stack camps at 54 seconds.' },
      { id: 'lotus_repeat', startTime: 170, type: 'repeat', repeatCount: 10, repeatFrequency: 180, text: 'Lotus pool respawning.' },
      { id: 'power_repeat', startTime: 470, type: 'repeat', repeatCount: 15, repeatFrequency: 120, text: 'Check power rune.' },
      { id: 'wisdom_repeat', startTime: 830, type: 'repeat', repeatCount: 6, repeatFrequency: 420, text: 'Wisdom rune spawning in 10 seconds.' },
      { id: 'neutrals_t2', startTime: 1010, type: 'single', text: 'Tier 2 neutral items available in 10 seconds.' },
      { id: 'tormentor_20', startTime: 1190, type: 'single', text: 'Tormentor spawning in 10 seconds.' },
      { id: 'neutrals_t3', startTime: 1610, type: 'single', text: 'Tier 3 neutral items available in 10 seconds.' },
      { id: 'neutrals_t4', startTime: 2210, type: 'single', text: 'Tier 4 neutral items available in 10 seconds.' },
      { id: 'neutrals_t5', startTime: 3590, type: 'single', text: 'Tier 5 neutral items available now!' }
    ]
  },
  {
    name: 'Mid Lane Rune Timers',
    description: 'Water runes (2m/4m), Power runes (6m/8m/10m+), and small camp stacking.',
    isBuiltIn: true,
    reminders: [
      { id: 'mid_bounty', startTime: -5, type: 'single', text: 'Grab bounty runes.' },
      { id: 'mid_water_2', startTime: 110, type: 'single', text: 'Water rune in 10 seconds.' },
      { id: 'mid_lotus_3', startTime: 170, type: 'single', text: 'Lotus pool active.' },
      { id: 'mid_water_4', startTime: 230, type: 'single', text: 'Water rune in 10 seconds.' },
      { id: 'mid_power_6', startTime: 350, type: 'single', text: 'Power rune in 10 seconds.' },
      { id: 'mid_power_repeat', startTime: 470, type: 'repeat', repeatCount: 12, repeatFrequency: 120, text: 'Power rune incoming.' },
      { id: 'mid_stack', startTime: 50, type: 'repeat', repeatCount: 10, repeatFrequency: 60, text: 'Stack small camp.' }
    ]
  },
  {
    name: 'Support Stack & Objectives',
    description: 'Camp stacking cadence at :53, Lotus pool contention, and Wisdom runes.',
    isBuiltIn: true,
    reminders: [
      { id: 'supp_stack_repeat', startTime: 50, type: 'repeat', repeatCount: 15, repeatFrequency: 60, text: 'Stack at 54 seconds.' },
      { id: 'supp_lotus_repeat', startTime: 170, type: 'repeat', repeatCount: 8, repeatFrequency: 180, text: 'Lotus pool contest.' },
      { id: 'supp_wisdom_repeat', startTime: 410, type: 'repeat', repeatCount: 6, repeatFrequency: 420, text: 'Wisdom rune alert.' },
      { id: 'supp_tormentor', startTime: 1190, type: 'single', text: 'Tormentor ready at 20 minutes.' }
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
  const [testAudioActive, setTestAudioActive] = useState(false);

  // Form State
  const [startTimeInput, setStartTimeInput] = useState('-00:30');
  const [reminderType, setReminderType] = useState<'single' | 'repeat'>('single');
  const [reminderText, setReminderText] = useState('');
  const [repeatCount, setRepeatCount] = useState<number>(5);
  const [repeatFreq, setRepeatFreq] = useState<number>(60);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Ref tracking for requestAnimationFrame
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
        setReminders(parsed);
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

  const checkAndTriggerAlerts = (prevTime: number, nextTime: number) => {
    remindersRef.current.forEach((reminder) => {
      if (reminder.enabled === false) return;
      const triggerTimes = getReminderTriggerTimes(reminder);

      triggerTimes.forEach((t) => {
        if (prevTime < t && nextTime >= t) {
          playChime();
          setTimeout(() => speakText(reminder.text), 300);
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
      setFeedbackMsg('Invalid start time format. Use -00:30, 02:00, or seconds (e.g. 75).');
      return;
    }

    if (!reminderText.trim()) {
      setFeedbackMsg('Please enter reminder text.');
      return;
    }

    const newReminder: ReminderEvent = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      startTime,
      type: reminderType,
      text: reminderText.trim(),
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

  const handleLoadBuiltInPreset = (preset: PresetConfig) => {
    saveRemindersToStorage(preset.reminders);
    setFeedbackMsg(`Loaded "${preset.name}".`);
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

  const handleLoadCustomPreset = (name: string) => {
    if (customPresets[name]) {
      saveRemindersToStorage(customPresets[name]);
      setFeedbackMsg(`Loaded "${name}".`);
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
  };

  const handleDeleteCustomPreset = (name: string) => {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    localStorage.setItem('voice_reminder_presets', JSON.stringify(updated));
  };

  const handleTestAudio = () => {
    setTestAudioActive(true);
    ensureAudioContext();
    playChime();
    setTimeout(() => {
      speakText('Voice reminder sound test active.');
      setTestAudioActive(false);
    }, 350);
  };

  const isPreGame = currentTime < 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-tool-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Timed Voice Reminder
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated audio chimes and voice alerts synced to match timing.
          </p>
        </div>
      </div>

      {/* Main Clock Card */}
      <div className="bg-tool-card rounded-xl p-6 border border-tool-border shadow-sm space-y-6 text-center">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleTestAudio}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md border border-slate-700 transition"
          >
            <Volume2 className={`w-3.5 h-3.5 ${testAudioActive ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Test Sound</span>
          </button>

          <span
            className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${
              isTimerRunning
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isTimerRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        {/* Digital Clock Display */}
        <div className="py-2">
          <div
            className={`font-mono font-bold tracking-widest text-6xl sm:text-7xl select-none ${
              isPreGame ? 'text-slate-100' : 'text-emerald-400'
            }`}
          >
            {formatTime(currentTime)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {isPreGame ? 'PRE-MATCH' : 'IN-GAME'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={isTimerRunning ? handlePause : handleStart}
            className={`px-5 py-2 rounded-lg font-medium text-xs text-white shadow-sm flex items-center gap-1.5 transition ${
              isTimerRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />
            Reset
          </button>

          <div className="flex items-center gap-1 bg-tool-bg p-0.5 rounded-lg border border-tool-border">
            <button
              onClick={() => handleAdjustTime(-10)}
              className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white rounded transition"
            >
              -10s
            </button>
            <button
              onClick={handleSetZero}
              className="px-2.5 py-1 text-[11px] font-mono font-semibold text-blue-400 hover:text-blue-300 rounded transition"
            >
              00:00
            </button>
            <button
              onClick={() => handleAdjustTime(10)}
              className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white rounded transition"
            >
              +10s
            </button>
          </div>
        </div>
      </div>

      {/* Preset Packages */}
      <div className="bg-tool-card rounded-xl p-5 border border-tool-border space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Presets
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BUILT_IN_PRESETS.map((preset, idx) => (
            <div
              key={idx}
              className="bg-tool-bg rounded-lg p-3 border border-tool-borderSubtle flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1">
                <div className="font-semibold text-white text-xs">{preset.name}</div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {preset.description}
                </p>
              </div>
              <button
                onClick={() => handleLoadBuiltInPreset(preset)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <FolderOpen className="w-3 h-3" />
                Load ({preset.reminders.length})
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Alert Form */}
      <div className="bg-tool-card rounded-xl p-5 border border-tool-border space-y-4">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Add Reminder
        </div>

        <form onSubmit={handleAddReminder} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Start Time (MM:SS, -MM:SS, or seconds)
              </label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="-00:30, 02:00, or 75"
                required
                className="w-full px-3 py-2 bg-tool-bg border border-tool-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Type
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as 'single' | 'repeat')}
                className="w-full px-3 py-2 bg-tool-bg border border-tool-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="single">Single Event</option>
                <option value="repeat">Repeating Event</option>
              </select>
            </div>
          </div>

          {reminderType === 'repeat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-tool-bg rounded-lg border border-tool-borderSubtle">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Repeat Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Frequency (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={repeatFreq}
                  onChange={(e) => setRepeatFreq(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Text to Say
            </label>
            <input
              type="text"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="e.g. Check power rune"
              required
              className="w-full px-3 py-2 bg-tool-bg border border-tool-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {feedbackMsg && (
            <div className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reminder</span>
          </button>
        </form>
      </div>

      {/* Scheduled Alerts List */}
      <div className="bg-tool-card rounded-xl p-5 border border-tool-border space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-tool-borderSubtle">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Scheduled Alerts ({reminders.length})
            </span>
          </div>
          {reminders.length > 0 && (
            <button
              onClick={handleClearAllReminders}
              className="text-xs text-slate-400 hover:text-rose-400 transition"
            >
              Clear All
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs bg-tool-bg rounded-lg">
            No reminders scheduled.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {reminders.map((r) => {
              const isPast = currentTime > r.startTime;

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                    isPast
                      ? 'bg-tool-bg/40 border-slate-800 text-slate-500'
                      : 'bg-tool-bg border-tool-borderSubtle text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700 flex-shrink-0 text-[11px]">
                      {formatTimeSimple(r.startTime)}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium truncate block">
                        "{r.text}"
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {r.type === 'repeat'
                          ? `Repeat ×${r.repeatCount} (every ${r.repeatFrequency}s)`
                          : 'Single'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Configurations */}
      <div className="bg-tool-card rounded-xl p-5 border border-tool-border space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
          <span>Saved Configurations</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Configuration Name"
            className="flex-1 px-3 py-2 bg-tool-bg border border-tool-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSaveCustomPreset}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1 transition"
          >
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Save Current</span>
          </button>
        </div>

        {Object.keys(customPresets).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {Object.entries(customPresets).map(([name, items]) => (
              <div
                key={name}
                className="flex items-center justify-between p-2.5 bg-tool-bg rounded-lg border border-tool-borderSubtle text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-slate-200 truncate">{name}</div>
                  <div className="text-[10px] text-slate-500">{items.length} alerts</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleLoadCustomPreset(name)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteCustomPreset(name)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
