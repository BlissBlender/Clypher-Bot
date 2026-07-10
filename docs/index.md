# ClypherBot Architecture Documentation

> **Last updated:** July 2026

This index links to all architecture documents for the major subsystems of ClypherBot. Each document covers data flow, file responsibilities, storage keys, constants, and design decisions.

---

## 📊 Leveling System

**File:** [`src/services/leveling-ARCHITECTURE.md`](../src/services/leveling-ARCHITECTURE.md)

The leveling system tracks user XP/levels per guild, awards role rewards on level-up, and provides a leaderboard. Data is split across three layers:

| Layer | File | Responsibility |
|---|---|---|
| **Business Logic** | `services/leveling.js` | Public API — validation, leaderboard, config management |
| **Data Access** | `utils/database.js` | Raw KV read/write, sanitization, legacy key migration |
| **XP Processing** | `services/xpSystem.js` | Message-based XP granting, level-up detection, role rewards |

**Key storage:** `guild:{guildId}:leveling:users:{userId}` — per-user level data

---

## 💰 Economy System

**File:** [`src/commands/Economy/economy-ARCHITECTURE.md`](../src/commands/Economy/economy-ARCHITECTURE.md)

The economy system provides a full virtual economy with 20+ commands, shop with 15 items, stock market, lottery, and multiple income streams. Data is split across two access layers:

| Layer | File | Responsibility |
|---|---|---|
| **Service (Transactional)** | `services/economyService.js` | Atomic transfers, safe-integer guards, audit logging |
| **Data Access** | `utils/economy.js` | Simple read/write, normalization, inventory management |

**Key storage:** `economy:{guildId}:{userId}` — per-user economy data

**Interconnections:** `/fish` → inventory → `/cook` (turn fish into gourmet meals)

---

## 🎵 Music System

**File:** [`src/services/music/music-ARCHITECTURE.md`](../src/services/music/music-ARCHITECTURE.md)

The music system uses Lavalink v4 + Riffy for audio playback, with interactive button controls, autoplay, 24/7 mode, and queue management. All state is in-memory per guild.

| Layer | File | Responsibility |
|---|---|---|
| **Actions** | `services/music/musicActions.js` | All playback control functions |
| **Events** | `services/music/playerHandler.js` | Lavalink event handlers + player message lifecycle |
| **State** | `services/music/playerStore.js` | In-memory `GuildMusicData` per guild |
| **Embeds** | `services/music/musicEmbeds.js` | Embed builders + button definitions |
| **Buttons** | `handlers/musicButtons.js` | Button interaction handling |

**Key storage:** In-memory `Map<guildId, GuildMusicData>` — no persistent storage

---

## How to Read These Docs

Each architecture document follows the same structure:

1. **Overview** — One-paragraph summary of what the system does
2. **Data Storage** — Key formats, data shapes, read/write functions
3. **File Responsibilities** — Table of every export in every file
4. **Data Flow Diagrams** — Step-by-step trace through common operations
5. **Constants** — All configurable values and where they live
6. **Configuration** — Environment variables and config files

---

## Contributing

When adding a new feature to an existing system:

1. Follow the data flow patterns documented in the relevant architecture doc
2. Use the same storage layer (e.g., `utils/economy.js` for economy data)
3. Register commands in the appropriate `src/commands/{Category}/` directory
4. Add command aliases in `src/config/commandAliases.js`
5. Update this index if adding a new subsystem
