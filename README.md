# Dota 2 Tactical Suite

A unified, modern React web application consolidating **Dota Hero Stats Puller** and **Timed Voice Reminder** into a single cohesive interface with shared navigation, dark gaming aesthetic, and deep tactical utility.

---

## 🎯 Features

### 1. Hero Profile Checker (`HeroStatsPuller`)
- **5-Position Lineup Analysis**: Enter Dota Account IDs or full Dotabuff URLs for all 5 team roles (Carry, Mid, Offlane, Soft Support, Hard Support).
- **Multi-Period Metrics**:
  - **All-Time** top played heroes & winrates.
  - **Last 30 Days (Monthly)** hero pool & meta comfort picks.
  - **Tournament / Pro Matches (90 Days)** lobby type 1 competitive stats.
- **Player Details**: Persona name, avatar, Dotabuff link, and current rank medal with Immortal leaderboard positioning.
- **Color-Coded Winrate Badges**: Real-time calculated contrast gradient.
- **1-Click Text Summary**: Formats all 5 players' data into clean text and copies directly to clipboard for sharing with coaches and teammates.
- **URL Parameter Sync**: Share links with pre-filled IDs (e.g. `?id1=...&id2=...&tab=stats`).

### 2. Timed Voice Reminder (`VoiceReminder`)
- **High-Precision Game Clock**: Starts at `-00:30.0` pre-game countdown (or custom time) using `performance.now()` and `requestAnimationFrame` to eliminate drift.
- **Audio Synthesizer & Voice TTS**: Plays clean double-ping chimes via the Web Audio API followed by speech announcements (Web Speech API).
- **Preset Strategy Timing Packages**:
  - *Dota 2 Standard Macro Timers* (Bounty Runes, Water Runes, Power Runes, Lotus Pools, Wisdom Runes, Tormentors, Neutral Item Tiers).
  - *Mid Lane Rune & Stack Focus*.
  - *Support Stack & Pull Cadence*.
- **Custom Event Scheduler**: Add one-off alerts or recurring alerts with customizable frequencies and repeat counts.
- **Configuration Management**: Save, load, and delete custom reminder profiles backed by `localStorage`.

---

## 🚀 Quick Start

This project is built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

### Prerequisites
- [Bun](https://bun.sh) or [Node.js](https://nodejs.org) (v18+)

### Installation
```bash
# Install dependencies
bun install
# or: npm install

# Start local development server
bun run dev
# or: npm run dev
```

### Production Build
```bash
bun run build
```

---

## 🛠️ Architecture & Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Dota 2 dark theme palette `#0B0F19`, `#151D2A`, `#DC2626`)
- **Icons**: Lucide React
- **APIs**:
  - OpenDota REST API (`/heroes`, `/players/{id}`, `/players/{id}/heroes`)
  - Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
  - Web Speech API (`SpeechSynthesisUtterance`)
  - LocalStorage API for preset persistence
