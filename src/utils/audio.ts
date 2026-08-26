import { AlertSoundType } from '../types';

let audioCtx: AudioContext | null = null;
const activeUtterances: SpeechSynthesisUtterance[] = [];

export interface SoundPresetOption {
  id: AlertSoundType;
  label: string;
  isBeep: boolean;
}

export const SOUND_PRESETS: SoundPresetOption[] = [
  { id: 'speech', label: 'Read Text (Voice TTS)', isBeep: false },
  { id: 'double_chime', label: 'Double Chime (Classic)', isBeep: true },
  { id: 'single_beep', label: 'Single Beep (880Hz)', isBeep: true },
  { id: 'high_ping', label: 'High Ping (1200Hz)', isBeep: true },
  { id: 'low_tone', label: 'Low Tone (350Hz)', isBeep: true },
  { id: 'triple_alert', label: 'Triple Ascending Beep', isBeep: true },
  { id: 'warning_pulse', label: 'Warning Double Pulse', isBeep: true },
];

/**
 * Initializes or resumes the Web Audio context after a user gesture.
 */
export function ensureAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
}

/**
 * Plays a tone helper with customizable frequency, duration, start delay, gain, and oscillator type.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  delay: number = 0,
  volume: number = 0.2,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const startTime = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays a preset beep sound or synthesized chime.
 */
export function playBeepSound(type: AlertSoundType, volume: number = 0.2): void {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'double_chime':
        // C5 (523.25Hz) -> E5 (659.25Hz)
        playTone(ctx, 523.25, 0.16, 0, volume, 'sine');
        playTone(ctx, 659.25, 0.22, 0.12, volume, 'sine');
        break;

      case 'single_beep':
        // Clean single 880Hz beep
        playTone(ctx, 880, 0.18, 0, volume * 1.1, 'sine');
        break;

      case 'high_ping':
        // Crisp high-frequency ping
        playTone(ctx, 1200, 0.15, 0, volume * 0.9, 'triangle');
        break;

      case 'low_tone':
        // Low 350Hz alert tone
        playTone(ctx, 350, 0.25, 0, volume * 1.2, 'sine');
        break;

      case 'triple_alert':
        // Three rapid ascending beeps: 700Hz -> 880Hz -> 1050Hz
        playTone(ctx, 700, 0.09, 0, volume, 'sine');
        playTone(ctx, 880, 0.09, 0.10, volume, 'sine');
        playTone(ctx, 1050, 0.14, 0.20, volume, 'sine');
        break;

      case 'warning_pulse':
        // Two urgent pings
        playTone(ctx, 950, 0.11, 0, volume, 'square');
        playTone(ctx, 950, 0.13, 0.13, volume, 'square');
        break;

      default:
        playTone(ctx, 880, 0.15, 0, volume, 'sine');
        break;
    }
  } catch (e) {
    console.error('Audio beep failed:', e);
  }
}

/**
 * Speaks text using the browser Speech Synthesis API.
 */
export function speakText(text: string, rate: number = 1.0, pitch: number = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Zira'))
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    activeUtterances.push(utterance);
    utterance.onend = () => {
      const index = activeUtterances.indexOf(utterance);
      if (index > -1) activeUtterances.splice(index, 1);
    };
    utterance.onerror = () => {
      const index = activeUtterances.indexOf(utterance);
      if (index > -1) activeUtterances.splice(index, 1);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis failed:', err);
  }
}

/**
 * Formats seconds into digital clock format: ±MM:SS.T (e.g. -00:30.0 or +04:15.8)
 */
export function formatTime(seconds: number): string {
  const isNegative = seconds < 0;
  const absSecs = Math.abs(seconds);
  const m = Math.floor(absSecs / 60);
  const s = Math.floor(absSecs % 60);
  const tenths = Math.floor((absSecs % 1) * 10);

  const sign = isNegative ? '-' : '+';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return `${sign}${mm}:${ss}.${tenths}`;
}

/**
 * Formats seconds into simple label format: ±MM:SS (e.g. -00:30 or +02:00)
 */
export function formatTimeSimple(seconds: number): string {
  const isNegative = seconds < 0;
  const absSecs = Math.abs(seconds);
  const m = Math.floor(absSecs / 60);
  const s = Math.floor(absSecs % 60);

  const sign = isNegative ? '-' : '+';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return `${sign}${mm}:${ss}`;
}

/**
 * Parses user input strings (e.g. "-00:30", "01:15", "75", "-45") to seconds number.
 */
export function parseTimeToSeconds(val: string): number {
  const trimmed = val.trim();
  if (!trimmed) return NaN;

  const isNegative = trimmed.startsWith('-');
  const absVal = isNegative ? trimmed.slice(1) : (trimmed.startsWith('+') ? trimmed.slice(1) : trimmed);

  let seconds = 0;
  if (absVal.includes(':')) {
    const parts = absVal.split(':');
    if (parts.length !== 2) return NaN;
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return NaN;
    seconds = mins * 60 + secs;
  } else {
    seconds = parseFloat(absVal);
  }

  if (isNaN(seconds)) return NaN;
  return isNegative ? -seconds : seconds;
}
