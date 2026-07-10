# Economy System Architecture

## Overview

The economy system spans three layers, similar to the leveling system:

```
Commands ──> services/economyService.js ──> utils/economy.js ──> client.db (KV store)
                                                                    │
                                                             utils/database/keys.js
```

**Note:** Unlike the leveling system which uses `services/leveling.js` → `utils/database.js`, the economy system has an extra intermediate layer. Commands can call either `services/economyService.js` (for transactional operations) or `utils/economy.js` directly (for simple read/write).

## Data Storage

### User Economy Data (per user per guild)

| Key Format | `economy:{guildId}:{userId}` — **note:** no `guild:` prefix! |
|---|---|
| Key Builder | `getEconomyKey(guildId, userId)` in `utils/database/keys.js` |
| Key Builder (alt) | `getEconomyKey(guildId, userId)` in `utils/economy.js` (re-exports from keys.js with validation) |
| Read | `utils/economy.js` → `getEconomyData(client, guildId, userId)` |
| Write | `utils/economy.js` → `setEconomyData(client, guildId, userId, data)` |

**Data shape** (defined in `utils/constants.js` as `DEFAULT_ECONOMY_DATA`, validated by Zod `EconomyDataSchema` in `utils/schemas.js`):

```js
{
  wallet: 0,        // Cash on hand — spendable
  bank: 0,          // Banked money — protected from robbery
  bankLevel: 0,     // Bank upgrade level (affects capacity)
  xp: 0,            // Economy XP (separate from leveling XP)
  level: 1,         // Economy level
  inventory: {},    // Items: { itemId: quantity, ... }
  upgrades: {},     // Permanent upgrades: { upgradeId: true, ... }
  cooldowns: {},    // Per-action cooldowns: { action: timestamp, ... }
  lastDaily: 0,     // Unix timestamp of last /daily
  lastWork: 0,      // Unix timestamp of last /work
  lastCrime: 0,     // Unix timestamp of last /crime
  lastRob: 0,       // Unix timestamp of last /rob
  lastMine: 0,      // Unix timestamp of last /mine
  lastFish: 0,      // Unix timestamp of last /fish
  lastGamble: 0,    // Unix timestamp of last /gamble
  dailyStreak: 0,   // Consecutive daily claims
  jailedUntil: 0,   // If > now, user is in jail (from failed crime)
}
```

**Key format note:** Economy keys use `economy:{guildId}:{userId}` — **without** the `guild:` prefix that leveling keys use. This is a historical inconsistency. The `getEconomyKey` in `utils/economy.js` re-exports from `utils/database/keys.js` but wraps it with Discord ID validation.

## File Responsibilities

### `utils/economy.js` — Data Access Layer

This is the **primary data access layer** for all economy operations. Most command files import directly from here.

| Export | Description |
|---|---|
| `getEconomyKey(guildId, userId)` | Builds the KV key with Discord ID validation |
| `getEconomyData(client, guildId, userId)` | Reads user data, normalizes via Zod schema, returns safe defaults |
| `setEconomyData(client, guildId, userId, data)` | Normalizes and writes user data |
| `updateBalance(client, guildId, userId, options)` | Atomically updates wallet/bank/xp with capacity checks |
| `getMaxBankCapacity(userData)` | Computes bank limit based on bankLevel + upgrades + bank_notes |
| `checkCooldown(userData, action)` | Returns `{ onCooldown, remaining, formatted }` |
| `addMoney(client, guildId, userId, amount, type)` | Adds money with validation, returns `{ success, newBalance }` |
| `removeMoney(client, guildId, userId, amount, type)` | Removes money with validation, returns `{ success, newBalance }` |
| `formatCurrency(amount)` | Formats with currency symbol (e.g., "1,000 coins") |
| `getWorkReward()` | Generates random job + reward |
| `getCrimeOutcome()` | Generates random crime success/failure |
| `getRobOutcome(targetBalance)` | Generates robbery outcome based on target's cash |
| `getShopInventory()` | Returns legacy shop item list (mostly unused — real shop is in `config/shop/items.js`) |
| `formatShopItem(item, index)` | Formats a shop item for display |

### `services/economyService.js` — Business Logic Layer

This is the **transactional service layer** with safety guarantees (rollback on failure, safe integer checks). Not all commands go through here — many call `utils/economy.js` directly.

| Export | Description |
|---|---|
| `claimDaily(client, guildId, userId)` | Claims daily reward with cooldown check + premium bonus |
| `transferMoney(client, guildId, senderId, receiverId, amount)` | Atomic transfer with rollback on receiver failure |
| `addMoney(client, guildId, userId, amount, source)` | Adds money with safe-integer check and audit logging |
| `removeMoney(client, guildId, userId, amount, reason)` | Removes money with safe-integer check and audit logging |
| `depositToBank(client, guildId, userId, amount)` | Moves wallet → bank with capacity check |
| `withdrawFromBank(client, guildId, userId, amount)` | Moves bank → wallet with balance check |
| `checkCooldown(userData, action, cooldownMs)` | Generic cooldown checker with formatted output |
| `validateAmount(amount, context)` | Safe-integer validation |
| `formatDuration(ms)` | Formats ms to "Xh Ym Zs" |

**Why two layers?** The service layer (`economyService.js`) provides atomicity (transfer rollback), audit logging, and safe-integer guards. The utility layer (`utils/economy.js`) is simpler and used by most commands for direct read/write. Commands that need transactional safety (like `/pay`) go through `economyService.js`.

## Commands

All economy commands are in `src/commands/Economy/`. They use `skipRegistration: true` to indicate they're registered separately from the auto-loader.

### Income Commands

| Command | Cooldown | Range | Notes |
|---|---|---|---|
| `/daily` | 24h | $1,000 (base) | Premium role bonus (+10%) |
| `/work` | 30min | $50–$300 | Random job, Laptop bonus (×1.5), Extra Work Shift consumable |
| `/crime` | 1h | $100–$20,000 | Pick crime type, risk of jail (2h), scales with risk |
| `/beg` | 30min | $50–$200 | 70% success rate, random flavor messages |
| `/fish` | 45min | $300–$900 | 9 fish types across 5 rarities, Fishing Rod bonus (×1.5), stores fish in inventory |
| `/mine` | 1h | $400–$1,200 | Pickaxe (×1.2) and Diamond Pickaxe (×2.0) bonuses |
| `/hunt` | 45min | $200–$800 + animal value | Requires Hunting Rifle ($12k shop), 14 animals across 5 rarities |
| `/cook` | None | $600–$5,000 | Uses inventory fish, 4 recipes (3–12 fish), Chef Apron bonus (×2) |

### Gambling Commands

| Command | Cost/Cooldown | Win Chance | Notes |
|---|---|---|---|
| `/gamble <amount>` | 5min | 40% base | Lucky Clover (+10%), Lucky Charm (+8%), pays out ×2 |
| `/luckywheel` | 10min | $500 cost | 8 weighted segments: Jackpot (×20, 2%) to Lose Half (10%) |
| `/lottery buy <n>` | None | $500/ticket | Pool accumulates, admin draws winner (weighted random) |

### Trading Commands

| Command | Description |
|---|---|
| `/pay <user> <amount>` | Transfer cash to another user (uses EconomyService with rollback) |
| `/rob <user>` | Attempt to rob (25% success, steals 15% of target's wallet, 4h cooldown) |
| `/invest buy/sell/portfolio/market` | Stock market — 8 stocks, prices fluctuate every 30min, stored per-guild |

### Bank Commands

| Command | Description |
|---|---|
| `/deposit <amount>` | Moves wallet → bank (respects bank capacity from upgrades) |
| `/withdraw <amount>` | Moves bank → wallet |
| `/balance` | Shows wallet + bank balance |
| `/bank` | Shows bank info with capacity details |
| `/eleaderboard` | Economy leaderboard |

### Shop Commands

| Command | Description |
|---|---|
| `/shop` | Browse items (paginated, from `config/shop/items.js`) |
| `/buy <item_id> [quantity]` | Purchase items with validation |
| `/inventory` | View owned items |
| `/shop-config` | Admin shop configuration |

## Shop System

The shop is defined in `src/config/shop/items.js` and includes:

| Item | Price | Type | Effect |
|---|---|---|---|
| Extra Work Shift | $5,000 | consumable | +1 `/work` use |
| Bank Upgrade I | $15,000 | upgrade | ×1.5 bank capacity |
| Diamond Pickaxe | $50,000 | tool | ×2.0 mining yield |
| Premium Role | $15,000 | role | +10% daily bonus |
| Lucky Clover | $10,000 | consumable | +10% gamble chance (1 use) |
| Fishing Rod | $5,000 | tool | ×1.5 fishing yield |
| Pickaxe | $7,500 | tool | ×1.2 mining yield |
| Laptop | $15,000 | tool | ×1.5 work yield |
| Lucky Charm | $10,000 | consumable | +8% gamble chance (3 uses) |
| Bank Note | $25,000 | tool | +10k bank capacity |
| Personal Safe | $30,000 | tool | Blocks robbery |
| **Hunting Rifle** | $12,000 | tool | Enables `/hunt` |
| **Cooking Pan** | $8,000 | tool | Enables `/cook` |
| **Ammo Pack** | $3,000 | consumable | +3 `/hunt` uses |
| **Chef Apron** | $15,000 | tool | ×2 cook sell value |

## Data Flow Diagrams

### Money Transfer (most complex flow)

```
/pay @user 500
    │
    ▼
Economy/pay.js
    │
    ├──► utils/economy.js:getEconomyData(sender)
    ├──► utils/economy.js:getEconomyData(receiver)
    │
    └──► services/economyService.js:transferMoney(client, guildId, senderId, receiverId, amount)
            │
            ├──► validate sender has sufficient funds
            ├──► validate amount is safe integer
            ├──► setEconomyData(sender, wallet - amount)
            ├──► setEconomyData(receiver, wallet + amount) ← if this fails, rollback sender
            └──► log transaction
```

### Daily Claim

```
/daily
    │
    ▼
Economy/daily.js
    │
    ├──► utils/economy.js:getEconomyData(user)
    ├──► check cooldown (24h)
    ├──► check premium role bonus
    ├──► userData.wallet += earned
    └──► utils/economy.js:setEconomyData(user)
```

### Cooking (inventory interconnect)

```
/fish → stores fish in inventory + sells for cash
    │
    ▼
/cook Grilled Fish
    │
    ├──► utils/economy.js:getEconomyData(user)
    ├──► check inventory.fish >= 3
    ├──► inventory.fish -= 3
    ├──► wallet += 600 (recipe sell value)
    │       └── Chef Apron: ×2 sell value
    └──► utils/economy.js:setEconomyData(user)
```

## Inventory System

Inventory items are stored in the user's economy data as `inventory: { itemId: quantity }`. 

Items are added to inventory when:
- Purchased from shop via `/buy` (consumables only)
- Fish caught via `/fish` (+1 fish)

Items are consumed when:
- Used by a command (e.g., `hunting_rifle` checked by `/hunt`)
- Used as an ingredient (`fish` consumed by `/cook`)

## Constants

| Constant | Value | Location |
|---|---|---|
| `DAILY_AMOUNT` | 1000 | `services/economyService.js` |
| `DAILY_COOLDOWN` | 24h | `services/economyService.js` |
| `WORK_COOLDOWN` | 30min | `services/economyService.js` |
| `GAMBLE_COOLDOWN` | 5min | `services/economyService.js` |
| `CRIME_COOLDOWN` | 1h | `services/economyService.js` |
| `ROB_COOLDOWN` | 4h | `services/economyService.js` |
| `MINE_COOLDOWN` | 1h | `services/economyService.js` |
| `FISH_COOLDOWN` | 45min | `services/economyService.js` |
| `BEG_COOLDOWN` | 30min | `services/economyService.js` |
| `HUNT_COOLDOWN` | 45min | `commands/Economy/hunt.js` |
| `LUCKY_WHEEL_COOLDOWN` | 10min | `commands/Economy/luckywheel.js` |
| `LUCKY_WHEEL_COST` | $500 | `commands/Economy/luckywheel.js` |
| `TICKET_PRICE` | $500 | `commands/Economy/lottery.js` |
| `SPIN_COST` | $500 | `commands/Economy/luckywheel.js` |
| `BASE_BANK_CAPACITY` | 10,000 | `utils/economy.js` |
| `BANK_CAPACITY_PER_LEVEL` | 5,000 | `utils/economy.js` |

## External Data Stores

The economy system uses a few custom key patterns for features that need their own storage:

| Data | Key Pattern | Managed By |
|---|---|---|
| Stock prices (per-guild) | `stocks:{guildId}:prices` | `commands/Economy/invest.js` |
| Stock portfolios (per-user) | `stocks:{guildId}:portfolio:{userId}` | `commands/Economy/invest.js` |
| Lottery state (per-guild) | `lottery:{guildId}` | `commands/Economy/lottery.js` |

These are managed directly via `client.db.get/set` rather than through `utils/economy.js`.
