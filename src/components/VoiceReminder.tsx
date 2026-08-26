import React from 'react';
import { ReminderEvent } from '../types';
import { useTimerContext } from '../context/TimerContext';
import { ToolLayout } from './ToolLayout';
import { ClockControls } from './reminder/ClockControls';
import { AddReminderForm } from './reminder/AddReminderForm';
import { ReminderTable } from './reminder/ReminderTable';
import { SavedConfigs } from './reminder/SavedConfigs';

export const VoiceReminder: React.FC = () => {
  const {
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
  } = useTimerContext();

  const handleAddReminder = (newReminder: ReminderEvent) => {
    const updated = [...reminders, newReminder].sort((a, b) => a.startTime - b.startTime);
    saveReminders(updated);
  };

  const handleUpdateReminder = (updatedReminder: ReminderEvent) => {
    const updated = reminders
      .map((r) => (r.id === updatedReminder.id ? updatedReminder : r))
      .sort((a, b) => a.startTime - b.startTime);
    saveReminders(updated);
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    saveReminders(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all scheduled alerts?')) {
      saveReminders([]);
    }
  };

  const handleLoadConfig = (configReminders: ReminderEvent[]) => {
    saveReminders(configReminders);
  };

  return (
    <ToolLayout title="Timed Voice & Sound Reminder" accentColor="blue">
      {/* Clock Section */}
      <ClockControls
        currentTime={currentTime}
        isTimerRunning={isTimerRunning}
        onStart={startTimer}
        onPause={pauseTimer}
        onReset={resetTimer}
        onAdjustTime={adjustTime}
        onSetZero={setZero}
      />

      {/* Add Alert Form */}
      <AddReminderForm
        onAddReminder={handleAddReminder}
        onPreviewSound={previewAlert}
      />

      {/* Scheduled Reminders Table */}
      <ReminderTable
        reminders={reminders}
        currentTime={currentTime}
        onUpdateReminder={handleUpdateReminder}
        onDeleteReminder={handleDeleteReminder}
        onClearAll={handleClearAll}
        onPreviewSound={previewAlert}
      />

      {/* Saved Configurations & Presets */}
      <SavedConfigs
        currentReminders={reminders}
        onLoadConfig={handleLoadConfig}
      />
    </ToolLayout>
  );
};
