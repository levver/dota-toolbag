// Web Audio API & Speech Synthesis Utilities

let audioCtx: AudioContext | null = null;
const activeUtterances: SpeechSynthesisUtterance[] = [];

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
 * Plays a rich double-ping game alert chime.
 */
export function playChime(volume: number = 0.2): void {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, duration: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    // Dota-style double chime: C5 (523.25Hz) -> E5 (659.25Hz)
    playTone(523.25, 0.18, 0);
    playTone(659.25, 0.24, 0.12);
  } catch (e) {
    console.error('Audio chime failed:', e);
  }
}

/**
 * Speaks text using the browser Speech Synthesis API.
 */
export function speakText(text: string, rate: number = 1.0, pitch: number = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    return;
  }

  try {
    // Cancel previous speaking to prevent overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Pick an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('David')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // Keep reference in activeUtterances array to avoid Garbage Collection bugs in Chromium
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
