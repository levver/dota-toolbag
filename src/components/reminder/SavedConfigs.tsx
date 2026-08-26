import React, { useState } from 'react';
import { PresetConfig, ReminderEvent } from '../../types';
import { storage } from '../../utils/storage';

const BUILT_IN_PRESETS: PresetConfig[] = [
  {
    name: 'Callouts',
    description: 'Key match callouts for runes, gates, smoke timings, tormentor, and roshan.',
    isBuiltIn: true,
    reminders: [
      { id: 'callout_fun', startTime: 0, type: 'single', soundType: 'speech', text: 'Have Fun' },
      { id: 'callout_lotus', startTime: 150, type: 'repeat', soundType: 'speech', repeatCount: 2, repeatFrequency: 180, text: 'Prep Lotus' },
      { id: 'callout_gate', startTime: 240, type: 'single', soundType: 'speech', text: 'Place gate vision' },
      { id: 'callout_power', startTime: 315, type: 'repeat', soundType: 'speech', repeatCount: 2, repeatFrequency: 120, text: 'Contest power rune' },
      { id: 'callout_wisdom', startTime: 380, type: 'repeat', soundType: 'speech', repeatCount: 4, repeatFrequency: 420, text: 'Wisdom rune' },
      { id: 'callout_smoke', startTime: 900, type: 'single', soundType: 'speech', text: 'Get a Smoke' },
      { id: 'callout_tormentor', startTime: 1110, type: 'single', soundType: 'speech', text: 'Prep for Tormentor' },
      { id: 'callout_roshan', startTime: 1440, type: 'single', soundType: 'speech', text: 'Prep Roshan' }
    ]
  },
  {
    name: 'Macro',
    description: 'Voice callouts for runes, tormentor, and neutral items; Pings for camp stacks.',
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
      { id: 'tormentor_20', startTime: 1190, type: 'single', soundType: 'triple_alert', text: 'Tormentor bottom' },
      { id: 'neutrals_t3', startTime: 1610, type: 'single', soundType: 'speech', text: 'Tier 3 neutrals available' },
      { id: 'neutrals_t4', startTime: 2210, type: 'single', soundType: 'speech', text: 'Tier 4 neutrals available' },
      { id: 'neutrals_t5', startTime: 3590, type: 'single', soundType: 'triple_alert', text: 'Tier 5 neutrals available' }
    ]
  },
];

interface SavedConfigsProps {
  currentReminders: ReminderEvent[];
  onLoadConfig: (reminders: ReminderEvent[], name: string) => void;
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({
  currentReminders,
  onLoadConfig,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [customPresets, setCustomPresets] = useState<Record<string, ReminderEvent[]>>(() => {
    return storage.get<Record<string, ReminderEvent[]>>('voice_reminder_presets', {});
  });

  const handleSaveCustom = () => {
    const name = newPresetName.trim();
    if (!name) {
      alert('Please enter a configuration name.');
      return;
    }
    if (currentReminders.length === 0) {
      alert('Cannot save an empty configuration.');
      return;
    }

    const updated = { ...customPresets, [name]: [...currentReminders] };
    setCustomPresets(updated);
    storage.set('voice_reminder_presets', updated);
    setNewPresetName('');
  };

  const handleDeleteCustom = (name: string) => {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    storage.set('voice_reminder_presets', updated);
  };

  return (
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
          type="button"
          onClick={handleSaveCustom}
          className="btn-bespoke btn-surface px-3.5 py-2 text-xs font-medium"
        >
          Save Current
        </button>
      </div>

      {/* Configurations List */}
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-bespoke-sm bg-palette-blue-subtle text-palette-blue-text border border-palette-blue-border">
                  Default
                </span>
              </div>
              <div className="text-[11px] text-canvas-muted mt-0.5">
                {preset.reminders.length} alerts • {preset.description}
              </div>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => onLoadConfig(preset.reminders, preset.name)}
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-bespoke-sm bg-canvas-card text-canvas-muted border border-canvas-border">
                  Custom
                </span>
              </div>
              <div className="text-[11px] text-canvas-muted mt-0.5">{items.length} alerts</div>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => onLoadConfig(items, name)}
                className="btn-bespoke btn-surface text-xs px-2.5 py-1 text-palette-blue-text font-medium"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustom(name)}
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
  );
};
