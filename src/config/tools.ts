import React from 'react';
import { HeroStatsPuller } from '../components/HeroStatsPuller';
import { VoiceReminder } from '../components/VoiceReminder';

export type ToolAccentColor = 'red' | 'blue' | 'green' | 'purple' | 'gold';

export interface ToolDefinition {
  id: string;
  title: string;
  navLabel: string;
  accentColor: ToolAccentColor;
  component: React.ComponentType;
  isLeagueIntegrated?: boolean;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'stats',
    title: 'Scouting',
    navLabel: 'Scouting',
    accentColor: 'red',
    component: HeroStatsPuller,
    isLeagueIntegrated: true,
  },
  {
    id: 'reminder',
    title: 'Timed Voice & Sound Alerts',
    navLabel: 'Alerts',
    accentColor: 'blue',
    component: VoiceReminder,
    isLeagueIntegrated: false,
  },
];

export const TOOL_ACCENT_MAP: Record<
  ToolAccentColor,
  {
    solid: string;
    subtle: string;
    border: string;
    text: string;
    accent: string;
    hover: string;
  }
> = {
  red: {
    solid: '#e11d48',
    subtle: 'rgba(225, 29, 72, 0.12)',
    border: 'rgba(225, 29, 72, 0.28)',
    text: '#fb7185',
    accent: '#f43f5e',
    hover: '#be123c',
  },
  blue: {
    solid: '#2563eb',
    subtle: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.28)',
    text: '#60a5fa',
    accent: '#3b82f6',
    hover: '#1d4ed8',
  },
  green: {
    solid: '#10b981',
    subtle: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    text: '#34d399',
    accent: '#10b981',
    hover: '#059669',
  },
  purple: {
    solid: '#9333ea',
    subtle: 'rgba(147, 51, 234, 0.12)',
    border: 'rgba(147, 51, 234, 0.28)',
    text: '#c084fc',
    accent: '#a855f7',
    hover: '#7e22ce',
  },
  gold: {
    solid: '#d97706',
    subtle: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.28)',
    text: '#fbbf24',
    accent: '#f59e0b',
    hover: '#b45309',
  },
};
