import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ReminderEvent } from '../types';
import {
  ensureAudioContext,
  playBeepSound,
  speakText,
} from '../utils/audio';
import { storage } from '../utils/storage';

interface TimerContextValue {
  currentTime: number;
  isTimerRunning: boolean;
  reminders: ReminderEvent[];
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  adjustTime: (deltaSecs: number) => void;
  setZero: () => void;
  saveReminders: (updated: ReminderEvent[]) => void;
  previewAlert: (soundType: ReminderEvent['soundType'], text?: string) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const DEFAULT_REMINDERS: ReminderEvent[] = [
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
];

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState<number>(-30.0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [reminders, setReminders] = useState<ReminderEvent[]>(() => {
    return storage.get<ReminderEvent[]>('voice_reminders', DEFAULT_REMINDERS);
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(-30.0);
  const remindersRef = useRef<ReminderEvent[]>(reminders);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  const saveReminders = (updated: ReminderEvent[]) => {
    setReminders(updated);
    storage.set('voice_reminders', updated);
  };

  const previewAlert = (soundType: ReminderEvent['soundType'], sampleText?: string) => {
    ensureAudioContext();
    if (soundType === 'speech') {
      const textToSpeak = sampleText?.trim() || 'Sample speech alert';
      playBeepSound('double_chime', 0.15);
      setTimeout(() => speakText(textToSpeak), 250);
    } else {
      playBeepSound(soundType, 0.25);
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
          previewAlert(reminder.soundType, reminder.text);
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

  const startTimer = () => {
    ensureAudioContext();
    setIsTimerRunning(true);
    lastTickTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastTickTimeRef.current = null;
  };

  const resetTimer = () => {
    pauseTimer();
    currentTimeRef.current = -30.0;
    setCurrentTime(-30.0);
  };

  const adjustTime = (deltaSecs: number) => {
    const next = currentTime + deltaSecs;
    currentTimeRef.current = next;
    setCurrentTime(next);
  };

  const setZero = () => {
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

  return (
    <TimerContext.Provider
      value={{
        currentTime,
        isTimerRunning,
        reminders,
        startTimer,
        pauseTimer,
        resetTimer,
        adjustTime,
        setZero,
        saveReminders,
        previewAlert,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimerContext = (): TimerContextValue => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};
