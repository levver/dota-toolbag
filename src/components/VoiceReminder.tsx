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
  Sparkles,
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
    name: 'Dota 2 Standard Macro Timers',
    description: 'Comprehensive alerts for Bounties, Power Runes, Lotus Pools, Wisdom Runes, and Tormentors.',
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
      { id: 'tormentor_20', startTime: 1190, type: 'single', text: 'Tormentor spawning in 10 seconds. Group up!' },
      { id: 'neutrals_t3', startTime: 1610, type: 'single', text: 'Tier 3 neutral items available in 10 seconds.' },
      { id: 'neutrals_t4', startTime: 2210, type: 'single', text: 'Tier 4 neutral items available in 10 seconds.' },
      { id: 'neutrals_t5', startTime: 3590, type: 'single', text: 'Tier 5 neutral items available now!' }
    ]
  },
  {
    name: 'Mid Lane Rune & Stack Focus',
    description: 'Essential timers for mid-laners: 2m/4m Water runes, 6m/8m Power runes, and stacking.',
    isBuiltIn: true,
    reminders: [
      { id: 'mid_bounty', startTime: -5, type: 'single', text: 'Grab initial bounty runes.' },
      { id: 'mid_water_2', startTime: 110, type: 'single', text: 'Water rune in 10 seconds.' },
      { id: 'mid_lotus_3', startTime: 170, type: 'single', text: 'Lotus pool active.' },
      { id: 'mid_water_4', startTime: 230, type: 'single', text: 'Water rune in 10 seconds.' },
      { id: 'mid_power_6', startTime: 350, type: 'single', text: 'Power rune in 10 seconds. Push lane!' },
      { id: 'mid_power_repeat', startTime: 470, type: 'repeat', repeatCount: 12, repeatFrequency: 120, text: 'Power rune incoming.' },
      { id: 'mid_stack', startTime: 50, type: 'repeat', repeatCount: 10, repeatFrequency: 60, text: 'Stack small camp.' }
    ]
  },
  {
    name: 'Support Stack & Pull Cadence',
    description: 'Timers tuned for Pos 4 & 5 support timings (pulls, rune control, wards, tormentor).',
    isBuiltIn: true,
    reminders: [
      { id: 'supp_stack_repeat', startTime: 50, type: 'repeat', repeatCount: 15, repeatFrequency: 60, text: 'Stack at 54 seconds.' },
      { id: 'supp_lotus_repeat', startTime: 170, type: 'repeat', repeatCount: 8, repeatFrequency: 180, text: 'Lotus pool contest!' },
      { id: 'supp_wisdom_repeat', startTime: 410, type: 'repeat', repeatCount: 6, repeatFrequency: 420, text: 'Wisdom rune alert. Secure your XP.' },
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

  // Keep refs updated for animation frame loop
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const storedReminders = localStorage.getItem('voice_reminders');
      if (storedReminders) {
        const parsed = JSON.parse(storedReminders);
        setReminders(parsed);
      } else {
        // Default to standard Dota preset
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

  // Save reminders to LocalStorage
  const saveRemindersToStorage = (updated: ReminderEvent[]) => {
    setReminders(updated);
    try {
      localStorage.setItem('voice_reminders', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  };

  // Trigger calculation helper
  const getReminderTriggerTimes = (reminder: ReminderEvent): number[] => {
    const times = [reminder.startTime];
    if (reminder.type === 'repeat' && reminder.repeatCount && reminder.repeatFrequency) {
      for (let i = 1; i <= reminder.repeatCount; i++) {
        times.push(reminder.startTime + i * reminder.repeatFrequency);
      }
    }
    return times;
  };

  // Check alerts in loop
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

  // Main Timer Animation Loop
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Form submission
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
    if (window.confirm('Are you sure you want to clear all reminders?')) {
      saveRemindersToStorage([]);
    }
  };

  // Preset operations
  const handleLoadBuiltInPreset = (preset: PresetConfig) => {
    saveRemindersToStorage(preset.reminders);
    setFeedbackMsg(`Loaded "${preset.name}".`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveCustomPreset = () => {
    const name = newPresetName.trim();
    if (!name) {
      alert('Please enter a name for the configuration.');
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
      setFeedbackMsg(`Loaded configuration "${name}".`);
      setTimeout(() => setFeedbackMsg(null), 3000);
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
      speakText('Dota 2 Voice Reminder sound test active!');
      setTestAudioActive(false);
    }, 400);
  };

  const isPreGame = currentTime < 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Timed Voice Reminder & Match Clock
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          High-precision Dota 2 game clock with automated audio chimes and voice alerts for runes, stacking, and objectives.
        </p>
      </div>

      {/* Main Clock Card */}
      <div className="bg-dota-card rounded-2xl p-6 sm:p-8 border border-dota-border shadow-2xl space-y-8 text-center relative overflow-hidden">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Test audio chime and speech synthesis"
            >
              <Volume2 className={`w-3.5 h-3.5 ${testAudioActive ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Test Audio</span>
            </button>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase ${
              isTimerRunning
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                : 'bg-red-950/60 text-red-400 border-red-800/60'
            }`}
          >
            {isTimerRunning ? 'Clock Running' : 'Clock Paused'}
          </div>
        </div>

        {/* Digital Clock Display */}
        <div className="py-2">
          <div
            className={`font-mono font-bold tracking-widest text-6xl sm:text-8xl select-none transition-colors duration-200 ${
              isPreGame ? 'text-rose-500 dota-glow-timer' : 'text-emerald-400 dota-glow-timer-positive'
            }`}
          >
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            {isPreGame ? 'PRE-GAME COUNTDOWN' : 'MATCH TIME ACTIVE'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={isTimerRunning ? handlePause : handleStart}
            className={`px-8 py-3.5 rounded-xl font-bold text-white text-base shadow-xl flex items-center gap-2.5 transition duration-150 ${
              isTimerRunning
                ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 shadow-amber-950/50'
                : 'bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-red-950/50'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Pause Timer</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Match Clock</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-semibold rounded-xl border border-dota-border shadow-md flex items-center gap-2 transition duration-150"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to -00:30</span>
          </button>

          <div className="flex items-center gap-1 bg-dota-dark/80 p-1 rounded-xl border border-dota-border">
            <button
              onClick={() => handleAdjustTime(-10)}
              className="px-2.5 py-2 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              -10s
            </button>
            <button
              onClick={handleSetZero}
              className="px-3 py-2 text-xs font-mono font-bold text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition"
            >
              00:00
            </button>
            <button
              onClick={() => handleAdjustTime(10)}
              className="px-2.5 py-2 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              +10s
            </button>
          </div>
        </div>
      </div>

      {/* Preset Strategy Templates */}
      <div className="bg-dota-card rounded-2xl p-6 border border-dota-border shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-dota-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            Dota 2 Preset Timing Packages
          </h2>
          <span className="text-xs text-slate-400">1-Click Load</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUILT_IN_PRESETS.map((preset, idx) => (
            <div
              key={idx}
              className="bg-dota-dark/70 rounded-xl p-4 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition"
            >
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">{preset.name}</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
                <div className="text-[11px] font-mono text-red-400 pt-1">
                  {preset.reminders.length} Scheduled Alerts
                </div>
              </div>
              <button
                onClick={() => handleLoadBuiltInPreset(preset)}
                className="w-full py-2 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 hover:border-red-600 transition duration-150 flex items-center justify-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Load Preset
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Reminder Form */}
      <div className="bg-dota-card rounded-2xl p-6 border border-dota-border shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-dota-border">
          <Plus className="w-5 h-5 text-red-500" />
          Add Custom Voice Alert
        </h2>

        <form onSubmit={handleAddReminder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Start Time (MM:SS, -MM:SS, or seconds)
              </label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="e.g. -00:30, 02:00, or 75"
                required
                className="w-full px-3.5 py-2.5 bg-dota-dark border border-dota-border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Event Schedule Mode
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as 'single' | 'repeat')}
                className="w-full px-3.5 py-2.5 bg-dota-dark border border-dota-border rounded-xl text-slate-100 focus:outline-none focus:border-red-500 text-sm"
              >
                <option value="single">Single Occurrence Event</option>
                <option value="repeat">Periodic Repeating Event</option>
              </select>
            </div>
          </div>

          {reminderType === 'repeat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-dota-dark/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Repeat Count (times)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-dota-dark border border-dota-border rounded-lg text-slate-100 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Interval Frequency (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={repeatFreq}
                  onChange={(e) => setRepeatFreq(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-dota-dark border border-dota-border rounded-lg text-slate-100 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Spoken Reminder Text (TTS)
            </label>
            <input
              type="text"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="e.g. Check power rune and push lane!"
              required
              className="w-full px-3.5 py-2.5 bg-dota-dark border border-dota-border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 text-sm"
            />
          </div>

          {feedbackMsg && (
            <div className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl shadow-lg shadow-red-950/40 transition duration-150 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Active Timers</span>
          </button>
        </form>
      </div>

      {/* Scheduled Reminders List */}
      <div className="bg-dota-card rounded-2xl p-6 border border-dota-border shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-dota-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-white">
              Active Match Reminders ({reminders.length})
            </h2>
          </div>
          {reminders.length > 0 && (
            <button
              onClick={handleClearAllReminders}
              className="text-xs text-rose-400 hover:text-rose-300 transition"
            >
              Clear All
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm bg-dota-dark/40 rounded-xl">
            No reminders scheduled. Pick a preset above or add a custom reminder.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {reminders.map((r) => {
              const isPast = currentTime > r.startTime;

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    isPast
                      ? 'bg-dota-dark/40 border-slate-800/60 opacity-75'
                      : 'bg-dota-dark/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-red-950/60 text-red-400 border border-red-800/40 flex-shrink-0">
                      {formatTimeSimple(r.startTime)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        "{r.text}"
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {r.type === 'repeat'
                          ? `Repeats ${r.repeatCount}× every ${r.repeatFrequency}s`
                          : 'Single Alert'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition flex-shrink-0"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Saved Configurations */}
      <div className="bg-dota-card rounded-2xl p-6 border border-dota-border shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-dota-border">
          <Bookmark className="w-5 h-5 text-red-500" />
          Save & Load Custom Configurations
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Configuration Profile Name (e.g. My Carry Reminders)"
            className="flex-1 px-3.5 py-2.5 bg-dota-dark border border-dota-border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 text-sm"
          />
          <button
            onClick={handleSaveCustomPreset}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-dota-border text-sm flex items-center justify-center gap-2 transition"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Save Current List</span>
          </button>
        </div>

        {Object.keys(customPresets).length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase">Saved Profiles</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(customPresets).map(([name, items]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-dota-dark/70 rounded-xl border border-slate-800"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-200 text-sm truncate">{name}</div>
                    <div className="text-xs text-slate-500">{items.length} alerts</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleLoadCustomPreset(name)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-2.5 py-1 rounded bg-red-950/40 border border-red-800/40 transition"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteCustomPreset(name)}
                      className="text-xs text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/30 rounded transition"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
