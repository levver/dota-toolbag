export type ActiveTab = 'stats' | 'reminder';

export interface HeroStat {
  name: string;
  iconUrl: string;
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
    text: string;
  };
  rankText: string;
  allTime: HeroStatsSection;
  monthly: HeroStatsSection;
  pro: HeroStatsSection;
}

export interface ReminderEvent {
  id: string;
  startTime: number; // in seconds (can be negative like -30)
  type: 'single' | 'repeat';
  text: string;
  repeatCount?: number;
  repeatFrequency?: number; // seconds between repeats
  enabled?: boolean;
}

export interface PresetConfig {
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  reminders: ReminderEvent[];
}
