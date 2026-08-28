export type ActiveTab = 'stats' | 'reminder';

export type AlertSoundType =
  | 'speech'
  | 'double_chime'
  | 'single_beep'
  | 'high_ping'
  | 'low_tone'
  | 'triple_alert'
  | 'warning_pulse';

export interface HeroStat {
  name: string;
  iconUrl: string;
  remoteIconUrl?: string;
  games: number;
  winrate: string;
  winCount?: number;
}

export interface HeroStatsSection {
  success: boolean;
  message?: string;
  heroes?: HeroStat[];
}

export interface PlayerProfileResult {
  accountId: string;
  name: string;
  avatarUrl: string;
  rankUrl: {
    url: string;
    fallbackUrl?: string;
    text: string;
  };
  rankText: string;
  allTime: HeroStatsSection;
  monthly: HeroStatsSection;
  pro: HeroStatsSection;
}

export interface ReminderEvent {
  id: string;
  startTime: number; // seconds (can be negative, e.g. -30)
  type: 'single' | 'repeat';
  soundType: AlertSoundType;
  text?: string; // used when soundType === 'speech' or as label
  repeatCount?: number;
  repeatFrequency?: number;
  enabled?: boolean;
}

export interface PresetConfig {
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  reminders: ReminderEvent[];
}
