# Leveling System Architecture

## Overview

The leveling system is split across three layers:

```
Commands ──> services/leveling.js ──> utils/database.js ──> client.db (KV store)
                        │                      │
                        │               utils/database/keys.js
                        │
                  services/guildConfig.js
                        │
                  utils/database.js (guild config read/write)
```

## Data Storage

### User Level Data (per user per guild)

| Key Format | `guild:{guildId}:leveling:users:{userId}` |
|---|---|
| Key Builder | `getUserLevelKey(guildId, userId)` in `utils/database/keys.js` |
| Read | `utils/database.js` → `getUserLevelData(client, guildId, userId)` |
| Write | `utils/database.js` → `saveUserLevelData(client, guildId, userId, data)` |
| Delete | `utils/database.js` → `deleteUserLevelData(client, guildId, userId)` |

**Data shape (sanitized):**
```js
{
  xp: 0,          // Current XP towards next level (0-{XP needed})
  level: 0,       // Current level (0-1000)
  totalXp: 0,     // Lifetime XP earned
  lastMessage: 0, // Unix timestamp of last XP-granting message
  rank: 0         // Cached rank position (set by getLeaderboard)
}
```

**Legacy key** (for backward compatibility):
- Format: `{guildId}:leveling:users:{userId}` (without `guild:` prefix)
- When legacy data is found on read, it is sanitized, migrated to the correct key, and the legacy key is deleted.
- The legacy migration is handled in `utils/database.js` `getUserLevelData()`.

### Leveling Config (per guild)

| Storage | Nested inside guild config object |
|---|---|
| Key Format | `guild:{guildId}:config` → `.leveling` property |
| Key Builder | `getGuildConfigKey(guildId)` in `utils/database/keys.js` |
| Read | `services/leveling.js` → `getLevelingConfig(client, guildId)` |
| Write | `services/leveling.js` → `saveLevelingConfig(client, guildId, config)` |

**Why it's in guild config:** Leveling settings are per-guild configuration, so they're stored alongside other guild settings (prefix, moderation roles, etc.) inside the guild config object at `guild.{guildId}:config`.

**Data shape:**
```js
{
  enabled: true,
  xpPerMessage: { min: 15, max: 25 },
  xpCooldown: 20,            // Seconds between XP-granting messages
  levelUpMessage: '{user} has leveled up to level {level}!',
  levelUpChannel: null,       // Channel ID for level-up announcements
  ignoredChannels: [],        // Channel IDs to ignore
  ignoredRoles: [],           // Role IDs to ignore
  blacklistedUsers: [],       // User IDs to ignore
  roleRewards: { '5': '123', '10': '456' },  // Level → Role ID map
  announceLevelUp: true,
  xpMultiplier: 1
}
```

## File Responsibilities

### `services/leveling.js` — Business Logic Layer

This is the **public API** for the leveling system. All commands and services should import from here.

| Export | Description |
|---|---|
| `getXpForLevel(level)` | Validates input, delegates to raw formula in `database.js` |
| `getLevelFromXp(xp)` | Converts total XP to level/current XP/XP needed |
| `calculateTotalXp(level, currentXp)` | Computes total XP needed for a given level |
| `getLeaderboard(client, guildId, limit)` | Fetches top users using DB index (scales to 1000+ users) |
| `createLeaderboardEmbed(leaderboard, guild)` | Formats leaderboard data into a Discord embed |
| `getLevelingConfig(client, guildId)` | Reads leveling config from guild config |
| `getUserLevelData(client, guildId, userId)` | Delegates to `database.js` with validation + strips internal `xpToNextLevel` field |
| `saveUserLevelData(client, guildId, userId, data)` | Delegates to `database.js` with validation |
| `saveLevelingConfig(client, guildId, config)` | Writes leveling config into guild config with validation |
| `addLevels(client, guildId, userId, levels)` | Admin: adds levels to a user |
| `removeLevels(client, guildId, userId, levels)` | Admin: removes levels from a user |
| `setUserLevel(client, guildId, userId, level)` | Admin: sets a user to a specific level |
| `deleteUserLevelData(client, guildId, userId)` | Delegates to `database.js` with validation |

### `utils/database.js` — Data Access Layer

This is the **raw data access** layer. Handles key construction, sanitization, and legacy key migration.

| Export | Description |
|---|---|
| `MAX_LEVEL` | `1000` — single source of truth |
| `getXpForLevel(level)` | Raw formula: `5 * level² + 50 * level + 50` |
| `getUserLevelData(client, guildId, userId)` | Reads with legacy fallback + migration + sanitization |
| `saveUserLevelData(client, guildId, userId, data)` | Writes with sanitization + legacy key cleanup |
| `deleteUserLevelData(client, guildId, userId)` | Deletes both correct + legacy keys |

### `services/xpSystem.js` — XP Processing

Handles the actual XP granting flow (called on message events):

1. Calls `getLevelingConfig()` to check if leveling is enabled
2. Calls `getUserLevelData()` to get current user state
3. Adds XP, checks for level-up, awards role rewards
4. Calls `saveUserLevelData()` to persist
5. Sends level-up announcements and logs events

### `services/levelRoleSyncService.js` — Role Reconciliation

Startup/periodic job that:

1. Lists all users with leveling data (both correct + legacy key prefixes)
2. Migrates any remaining legacy keys with sanitization
3. Reads `roleRewards` from leveling config
4. Awards missing roles to users who should have them
5. Prunes deleted roles from config

## Data Flow Diagram

### XP Grant (message event)

```
Message received
    │
    ▼
xpSystem.js:addXp(client, guild, member, xpToAdd)
    │
    ├──► leveling.js:getLevelingConfig()
    │       │
    │       └──► guildConfig.js:getGuildConfig()
    │               │
    │               └──► database.js:getGuildConfig() → client.db.get('guild:{id}:config')
    │
    ├──► leveling.js:getUserLevelData()
    │       │
    │       └──► database.js:getUserLevelData()
    │               │
    │               ├──► client.db.get('guild:{id}:leveling:users:{userId}')
    │               └──► (if not found) client.db.get('{id}:leveling:users:{userId}') [legacy]
    │
    ├──► (calculate new XP, check level-up, award roles)
    │
    └──► leveling.js:saveUserLevelData()
            │
            └──► database.js:saveUserLevelData()
                    │
                    └──► client.db.set('guild:{id}:leveling:users:{userId}', data)
```

### Leaderboard

```
/leaderboard command
    │
    ▼
leveling.js:getLeaderboard(client, guildId)
    │
    ├──► client.db.list('guild:{guildId}:leveling:users:')
    │       │
    │       ├──► (if list works) iterate returned keys, fetch each user's data
    │       └──► (if list fails) fallback to guild.members.fetch() iteration
    │
    └──► sort by totalXp, assign ranks, return top N
```

## Constants

| Constant | Value | Location |
|---|---|---|
| `MAX_LEVEL` | `1000` | `utils/database.js` (single source of truth) |
| `MIN_LEVEL` | `0` | `services/leveling.js` (local const) |
| XP Formula | `5 * level² + 50 * level + 50` | `utils/database.js` `getXpForLevel()` |

## Legacy Migration

The system was originally written with keys that lacked the `guild:` prefix (e.g., `{guildId}:leveling:users:{userId}`). The correct format uses `guild:{guildId}:leveling:users:{userId}`. Migration happens transparently:

- **On read** (`getUserLevelData`): If data is found at the legacy key, it's read, sanitized, written to the correct key, and the legacy key is deleted.
- **On write** (`saveUserLevelData`): Always writes to the correct key, then deletes the legacy key if it exists.
- **On startup** (`levelRoleSyncService`): Scans both prefixes, migrates and sanitizes any remaining legacy data.
