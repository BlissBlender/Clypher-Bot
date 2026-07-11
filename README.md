# ClypherBot — Ultimate Discord Bot

**ClypherBot** is a powerful, feature-rich Discord bot with advanced moderation tools, a deep economy system (shop, trading, marketplace, properties, pets, achievements), music playback, leveling, tickets, giveaways, and much more. Built with Discord.js v14 and PostgreSQL.

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-optional-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Support_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/your-support-server)

---

## 📖 Table of Contents

1. [Features Overview](#features-overview)
2. [Economy System Deep Dive](#economy-system-deep-dive)
3. [Moderation Suite](#moderation-suite)
4. [Prerequisites](#prerequisites)
5. [Discord Application Setup](#discord-application-setup)
6. [Quick Start — Local Installation](#quick-start--local-installation)
7. [PostgreSQL Setup (Optional)](#postgresql-setup-optional)
8. [Lavalink Setup (Music)](#lavalink-setup-music)
9. [Deploy on Render (Free)](#deploy-on-render-free)
10. [Command Registration](#command-registration)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Troubleshooting](#troubleshooting)

---

## 🆘 Support

Need help? Join the official ClypherBot Discord server!

[![Discord](https://img.shields.io/badge/Discord-Support_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/your-support-server)

- 🛠️ **Setup Help** — Get assistance with installation and configuration
- 🐛 **Bug Reports** — Report issues you encounter
- 💡 **Feature Requests** — Suggest new features and improvements
- 💬 **Community** — Chat with other ClypherBot users

---

<a name="features-overview"></a>
## ✨ Features Overview

| Category | Features |
|----------|----------|
| 🛡️ **Moderation** | Ban, kick, timeout, warn, purge, lock/unlock, mass actions, case tracking, user notes, **interactive dashboard** with per-category settings |
| 🤖 **Auto-Moderation** | Anti-Link, Anti-Spam, Auto-Mod (blocked words, anti-caps, repeated text), Anti-Mass Mention, Anti-Raid (join-rate detection, lockdown), Anti-Nuke (channel/role/ban/webhook monitoring), Strike escalation |
| 💰 **Economy** | 53 shop items across 10 categories with 5-tier rarity system, daily streaks with milestones, work/crime/gamble/rob/fish/mine/hunt/lottery/lucky wheel/cook, interactive dashboard, leaderboards |
| 🔄 **Trading** | Peer-to-peer trading with double confirmation, item + currency exchange, trade history |
| 🏪 **Marketplace** | Player-driven marketplace with listing fees, sale taxes, active listings, buy/cancel/sell |
| 🏠 **Properties** | 6 property types (Starter House → Luxury Mansion), upgrade system, passive daily income, sell at 75% value |
| 🐾 **Pets** | 6 pet types (Dog, Cat, Dragon, Owl, Fox, Bear), adopt/feed/train, leveling system, economy bonuses |
| 🏆 **Achievements** | 15 achievements across wealth/activity/economy categories, cash rewards, progress tracking |
| 📊 **Transaction History** | Every money movement logged (income/expense/transfer), searchable, per-source stats |
| 🎯 **Economy Events** | Random server-wide events: Treasure Hunt, Market Boom, Market Crash, Bonus Weekend |
| 📊 **Leveling** | XP system, rank cards, leaderboards, level roles, configurable XP rates |
| 🎵 **Music** | Play from YouTube/Spotify/SoundCloud/etc., queue, 24/7 mode, buttons, Lavalink v4 |
| 🎫 **Tickets** | Ticket system with priority levels, claiming, transcripts |
| 🎉 **Giveaways** | Create, end, reroll, multiple winners |
| 🎮 **Fun** | 8-ball, roast, compliment, RPS, slot machine, flip, fight, counting game, dice roll |
| 🛠️ **Utility** | Weather, todo lists, password generator, color picker, URL shortener, AFK, server info, user info, polls, calculator, base converter, countdown timer, embed builder, random user generator, unix time converter |
| 👋 **Welcome** | Welcome/goodbye messages, auto-roles, custom embeds |
| 🎂 **Birthdays** | Birthday tracking with auto-announcements |
| ✅ **Verification** | Button-based verification system with configurable criteria (account age, server size) |
| 🎭 **Reaction Roles** | Self-assignable roles via reactions |
| 🔢 **Server Stats** | Live member count voice/text channels (members, bots, humans counters) |
| 🔌 **Join to Create** | Temporary voice channels |
| 📝 **Applications** | Custom application forms with manager review (approve/deny) |
| 🌟 **Starboard** | Community-voted standout messages |

---

<a name="economy-system-deep-dive"></a>
## 💰 Economy System Deep Dive

### 💳 Currency

The economy uses **$ (coins)** as the primary currency. Users start with **$0** and earn through various activities. The base bank capacity is **$100,000** — expandable via upgrades and bank notes.

### 🏪 Shop — 53 Items Across 10 Categories

Every item has a **rarity** (Common → Uncommon → Rare → Epic → Legendary) and belongs to one of 10 categories:

| Category | Count | Examples | Price Range |
|----------|-------|----------|-------------|
| 🛠️ **Tools** | 11 | Pickaxe, Gold Pickaxe, Crystal Drill, Fishing Rod, Quantum Rod, Laptop, Hunting Rifle, Cooking Pan, Chef Apron, Treasure Magnet, Disguise Kit, Hacking Device, Shadow Access | $5K–$500K |
| 🍀 **Boosters** | 7 | Lucky Clover, Four Leaf Clover, Lucky Charm, Loaded Dice, Fortune Crystal, Joker Card, Extra Work Shift, Energy Drink, Productivity Booster, Wealth Potion, XP Booster, Ammo Pack | $5K–$250K |
| 🛡️ **Protection** | 6 | Personal Safe, Robbery Shield, Insurance Policy, Security Token, Guard Dog, Fortress Upgrade | $30K–$2M |
| 🎁 **Mystery** | 4 | Mystery Box, Premium Box, Treasure Map | $20K–$250K |
| 🐾 **Pet Items** | 3 | Pet Food, Pet Toy, Pet House | $5K–$100K |
| 💎 **Collectibles** | 8 | Ancient Relic, Golden Trophy, Diamond Ring, Golden Coin, Ancient Key | $100K–$750K |
| 🏦 **Upgrades** | 6 | Bank Upgrade I, Bank Note, Gold Bank Card, Vault Expansion, Investment License, Platinum Account | $15K–$1M |
| 👑 **Luxury** | 3 | Empire License ($10M), Diamond Statue ($50M), Quantum Core ($100M) | $10M–$100M |
| 😂 **Fun** | 4 | Toilet Paper, Strange Rock, Golden Frog, Legendary Sock | $100–$1M |
| 🎭 **Role** | 1 | Premium Server Role | $15K |

### 🛠️ Item Effects (/use)

The `/use` command handles **14 effect types**:

| Effect | Items | Behavior |
|--------|-------|----------|
| `gamble_boost` | Lucky Clover, Loaded Dice, Fortune Crystal | Increases gamble win chance (uses-based) |
| `gamble_save` | Joker Card | Saves bet if gamble loses |
| `treasure_hunt` | Treasure Map | Discovers $5K–$50K random reward |
| `mystery_box` | Mystery Box, Premium Box | Weighted random drop from rarity pool |
| `earnings_boost` | Productivity Booster, Wealth Potion, XP Booster | ×1.5–×2 earnings for N uses (uses `Math.max` to prevent weaker overwriting stronger) |
| `command_boost` | Extra Work Shift, Energy Drink, Ammo Pack | Grants extra uses of `/work` or `/hunt` |
| `robbery_protection` | Personal Safe, Robbery Shield, Guard Dog | Passive — blocks robbery attempts |
| `pet_food` | Pet Food | Grants XP to a selected pet |
| `pet_toy` | Pet Toy | ×1.5 XP multiplier on next training |
| `pet_upgrade` | Pet House | Passive XP for all pets |
| `repair` | Repair Kit | Restores 50 durability to tools |
| `bank_interest` | Gold Bank Card | Passive 2% interest on bank balance |
| `daily_bonus` | Platinum Account, Premium Role | Permanent ×1.05–×1.1 daily multiplier |
| `bank_capacity` | Bank Note, Vault Expansion | Permanently increases bank storage |

### 📈 Earning Commands

| Command | Cooldown | Earnings | Notes |
|---------|----------|----------|-------|
| `/daily` | 24h | $1,000 base | Streak bonuses (+$50/day), milestones at 7/30/100 days |
| `/work` | 30min | $50–$300 | ×1.5 with Laptop, pet bonuses |
| `/crime` | 1h | High risk/reward | Jail on fail (2h), disguise kit boosts success |
| `/beg` | 30min | $50–$200 | 70% success rate |
| `/gamble` | 5min | ×2 payout | 40% win chance, clover/charm bonuses |
| `/rob` | 4h | Up to 25% of target | 35% base success, protection items block |
| `/fish` | 45min | $300–$900 | ×1.5 with Fishing Rod, ×2.5 with Quantum Rod |
| `/mine` | 1h | $400–$1,200 | ×1.2–×2.5 with Pickaxes, rare mineral finds |
| `/hunt` | 1h | $500–$2,000 | Requires Hunting Rifle |
| `/slut` | 45min | Variable | Alternate income source |
| `/luckywheel` | 10min | Variable | Costs $500 to spin |
| `/lottery` | — | Jackpot | Buy tickets for $500 each |
| `/cook` | — | Meal profits | Requires Cooking Pan, ×2 with Chef Apron |

### 🏦 Banking & Upgrades

| Feature | Description |
|---------|-------------|
| `/deposit` | Move cash to bank (interest-bearing) |
| `/withdraw` | Move bank funds to wallet |
| `/bank` | View bank balance and capacity |
| Bank Upgrades | ×1.5–×2 capacity, Bank Notes (+$10K each), Vault Expansion (×2) |
| Platinum Account | 5% daily bonus on all earnings |
| Investment License | Unlocks advanced investment opportunities |

### 🏠 Properties

6 property types, from **Starter House** ($100K, $500/day) to **Luxury Mansion** ($5M, $40K/day). Each can be upgraded to level 10, increasing income by ×1.5 per level. Properties earn passive income via `/property collect`. Sell at 75% of current value.

### 🐾 Pets

6 adoptable types (Dog, Cat, Dragon, Owl, Fox, Bear) with unique economy bonuses. Feed and train to level up (max 20). Each level increases the pet's bonus multiplier. Up to 5 pets per user.

### 🏆 Achievements

15 achievements across 3 categories — accumulate wealth, maintain daily streaks, complete transactions/trades, buy properties, adopt pets, max out pet levels. Each has a cash reward.

### 🔄 Trading & Marketplace

- **Trading**: Peer-to-peer with double confirmation. Trade items + currency simultaneously.
- **Marketplace**: Player-driven listing system. 5% listing fee, 3% sale tax, max 10 listings per user, 24h duration. Expired listings auto-return items to seller.

### 🎯 Random Economy Events

Server-wide events triggered every 10 minutes:
- **🧭 Treasure Hunt** — Users randomly discover coins when using economy commands
- **📈 Market Boom** — Shop prices reduced (×0.8 multiplier)
- **📉 Market Crash** — Shop prices inflated (×1.5 multiplier)
- **🎉 Bonus Weekend** — All earnings doubled (×2.0 multiplier)

### 📊 Daily Streaks

| Streak | Bonus Reward |
|--------|-------------|
| 7 days | $15,000 + 🍀 Lucky Clover |
| 30 days | $75,000 + 🍀 Lucky Charm |
| 100 days | $250,000 + 💎 Diamond Pickaxe |

---

<a name="moderation-suite"></a>
## 🛡️ Moderation Suite

ClypherBot includes a full **interactive moderation dashboard** (`/moderation dashboard`) with 7 configurable categories, each with interactive buttons that open modals for inline editing.

### 📋 Dashboard Categories & Configurable Settings

| Category | Settings You Can Configure |
|----------|---------------------------|
| **🛡️ Anti-Link** | Enable/disable, action (warn/timeout/kick), allowed invite codes, whitelisted domains, min violations for action |
| **📨 Anti-Spam** | Enable/disable, max messages per window, window duration (ms), action, timeout duration, max mentions, min violations |
| **🤖 Auto-Mod** | Enable/disable, blocked words, blocked regex patterns, anti-caps toggle, caps threshold (%), min length, ignored words, anti-repeated text toggle, max consecutive chars, action per feature |
| **⚡ Strikes** | Enable/disable, decay time (ms), tier thresholds/actions (currently 3 tiers: timeout 1m → timeout 5m → kick) |
| **📣 Anti-Mass Mention** | Enable/disable, max mentions, action, timeout duration, block @everyone/@here, allowed roles, min violations |
| **🚨 Anti-Raid** | Enable/disable, join threshold, detection window (ms), action (lockdown/alert/kick-new), restrict new accounts, new account age, auto-lockdown on threshold met |
| **💥 Anti-Nuke** | Enable/disable, action threshold, detection window (ms), action (punish/ban/alert), notify staff, auto-restore channels/roles |

### ⚡ How the Dashboard Works

1. Run `/moderation dashboard`
2. Click the dropdown to select a category page
3. Toggle features on/off with the **Enable/Disable** button
4. Click any setting button to edit it via modal
5. Changes save instantly — confirmations appear as ephemeral messages
6. The dashboard refreshes automatically after each change

### 🛠️ Traditional Moderation Commands

| Command | Description |
|---------|-------------|
| `/ban` | Ban a user with case tracking |
| `/kick` | Kick a user |
| `/timeout` | Timeout a user (configurable duration) |
| `/warn` | Issue a warning |
| `/warnings` | View a user's warnings |
| `/cases` | View moderation case history |
| `/usernotes` | Private notes on users |
| `/purge` | Bulk delete messages |
| `/lock` / `/unlock` | Lock/unlock channels |
| `/massban` / `/masskick` | Bulk actions |
| `/dm` | DM a user (moderator tool) |

### 🤖 Auto-Mod Enforcement

When violations are detected, the bot can:
- **Warn** — Send a DM to the user
- **Timeout** — Temporarily mute (configurable duration)
- **Kick** — Remove from server
- **Delete** — Remove the offending message only
- **Strike Escalation** — Progressive punishment based on violation count

---

<a name="prerequisites"></a>
## 📋 Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| **Node.js** | v18.0.0 | v20+ recommended |
| **npm** | 9.x | Comes with Node.js |
| **PostgreSQL** | 14+ | Optional — in-memory fallback works without it |
| **Java** | 17+ | Only needed for **music** (Lavalink) |
| **Git** | — | To clone the repository |

---

<a name="discord-application-setup"></a>
## 🤖 Discord Application Setup

### Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name → **Create**
3. Go to the **Bot** tab in the left sidebar

### Step 2: Create & Copy Your Bot Token

1. Click **Reset Token** → **Yes, do it!**
2. Copy the token (starts with `MT` followed by a long string of characters)
3. **Save this** — you'll put it in your `.env` file as `DISCORD_TOKEN`

### Step 3: Enable Bot Intents

In the **Bot** tab, scroll down to **Privileged Gateway Intents** and enable ALL of these:

| Intent | Required for |
|--------|-------------|
| ✅ **Presence Intent** | Member status tracking |
| ✅ **Server Members Intent** | Rank, welcome messages, auto-roles |
| ✅ **Message Content Intent** | Prefix commands, auto-mod, leveling |

> ⚠️ **Important:** Without these intents, many bot features will not work!

### Step 4: Get Your Client ID

1. Go to **OAuth2** → **General** tab
2. Copy the **Client ID** (a long number like `123456789012345678`)
3. This goes in your `.env` as `CLIENT_ID`

### Step 5: Get Your Server (Guild) ID

1. Open Discord
2. Go to **User Settings** → **Advanced** → enable **Developer Mode**
3. Right-click your server name → **Copy Server ID**
4. This goes in your `.env` as `GUILD_ID`

### Step 6: Invite the Bot to Your Server

1. In Developer Portal, go to **OAuth2** → **URL Generator**
2. Under **Scopes**, check:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, check these minimum permissions:
   - `View Channels`, `Send Messages`, `Embed Links`, `Attach Files`
   - `Read Message History`, `Manage Messages`, `Manage Channels`
   - `Manage Roles`, `Kick Members`, `Ban Members`, `Moderate Members`
   - `Connect`, `Speak` (for music)
4. Copy the generated URL and open it in your browser
5. Select your server and click **Authorize**

> ✅ You should see the bot join your server!

---

<a name="quick-start--local-installation"></a>
## 🚀 Quick Start — Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/BlissBlender/Clypher-Bot.git
cd Clypher-Bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Discord bot details. The **minimum** you need to set:

```env
# ── Discord (REQUIRED) ──
DISCORD_TOKEN=YOUR_BOT_TOKEN (from Discord Developer Portal)
CLIENT_ID=YOUR_CLIENT_ID (from Discord Developer Portal)
GUILD_ID=YOUR_SERVER_ID (right-click server in Discord)

# ── PostgreSQL (Optional - bot works without it) ──
POSTGRES_URL=postgresql://postgres:yourpassword@localhost:5432/clypher

# ── Quick Start Mode ──
NODE_ENV=development
LOG_LEVEL=debug
```

> 🎯 **For first-time users:** Just set `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` only. The bot will start with in-memory storage (data resets on restart — good for testing).

### 4. Start the Bot

```bash
npm start
```

You should see:
```
🟢 ClypherBot is online!
✅ Connected to Discord
```

### 5. Run `/commands sync` in Discord

After the bot starts, type `/commands sync` in any channel the bot can see. This forces Discord to register all 100 slash commands.

> Wait 1-2 minutes, then type `/` — you should see all commands appear.

---

<a name="postgresql-setup-optional"></a>
## 🗄️ PostgreSQL Setup (Optional — Recommended for Production)

Without PostgreSQL, the bot uses **in-memory storage** — all data (economy, levels, config) is lost when the bot restarts. For production, set up PostgreSQL:

### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Install PostgreSQL (macOS)
brew install postgresql

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/
```

Then create the database:

```bash
# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres createdb clypher

# Set password (replace 'yourpassword')
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpassword';"
```

Update your `.env`:

```env
POSTGRES_URL=postgresql://postgres:yourpassword@localhost:5432/clypher
```

### Option B: Free Cloud PostgreSQL (Railway / Neon)

[Railway](https://railway.app) and [Neon](https://neon.tech) offer free PostgreSQL databases:

1. Create an account on Railway or Neon
2. Create a new PostgreSQL database
3. Copy the connection string (looks like `postgresql://user:pass@host:port/db`)
4. Set it as `POSTGRES_URL` in your `.env`

### Verify the Database

```bash
npm run migrate:check
```

If PostgreSQL is connected, you'll see migration status. If not, the bot falls back to in-memory storage automatically.

---

<a name="lavalink-setup-music"></a>
## 🎵 Lavalink Setup (Music)

ClypherBot uses **Lavalink v4** for music playback. Without Lavalink, music commands will be disabled.

### Step 1: Download Lavalink

Download the latest **Lavalink v4** jar from the [releases page](https://github.com/lavalink-devs/Lavalink/releases):

```bash
# Download Lavalink v4
curl -LO https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar
```

### Step 2: Create `application.yml`

An `application.yml` is already included in the project root. It configures Lavalink with default settings.

> ⚠️ **Important:** The `password` in `application.yml` must match `LAVALINK_PASSWORD` in your `.env` file. The default is `youshallnotpass`.

### Step 3: Start Lavalink

```bash
# Make sure application.yml is in the same directory as Lavalink.jar
java -jar Lavalink.jar
```

You should see:
```
Lavalink is ready to accept connections.
```

### Step 4: Configure `.env`

```env
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
```

### Step 5: Restart the Bot

Stop the bot (`Ctrl+C`) and start it again. You should see:

```
Music initialized with 1 Lavalink node(s).
```

> 🎧 Music commands (`/play`, `/join`, `/nowplaying`, `/queue`) will now work!

### Docker Compose (Easiest Way)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  lavalink:
    image: ghcr.io/lavalink-devs/lavalink:4
    container_name: lavalink
    restart: unless-stopped
    volumes:
      - ./application.yml:/opt/Lavalink/application.yml
    ports:
      - "2333:2333"

  clypher:
    build: .
    container_name: clypher
    restart: unless-stopped
    depends_on:
      - lavalink
    env_file: .env
    environment:
      - LAVALINK_HOST=lavalink
    ports:
      - "3000:3000"
```

Then just run:

```bash
docker compose up -d
```

> ✅ This starts both Lavalink and the bot. The bot connects to Lavalink automatically.

---

<a name="deploy-on-render-free"></a>
## ☁️ Deploy on Render (Free Tier)

### Step 1: Push to GitHub

```bash
git add -A
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `clypher-bot` (or your choice) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | **Free** |

### Step 3: Add Environment Variables

Under **Environment Variables**, add:

| Key | Value | Notes |
|-----|-------|-------|
| `DISCORD_TOKEN` | your bot token | Required |
| `CLIENT_ID` | your client ID | Required |
| `GUILD_ID` | your server ID | For single-server mode |
| `NODE_ENV` | `production` | Required |
| `LOG_LEVEL` | `warn` | Clean logs |
| `MULTI_GUILD` | `false` | Stay in single-server mode |

> 🎯 **Free tier tip:** Without PostgreSQL, data resets on restart. For persistent data on Render's free tier, the bot has **file-based persistence** for leveling and the counting game — stored in a `data/` folder.

### Step 4: Deploy

Click **Create Web Service**. Render will build and deploy your bot. Watch the logs for:

```
ONLINE ✅ | 100 commands loaded
```

### Step 5: Run `/commands sync`

In your Discord server, type `/commands sync` to force-register all commands.

---

<a name="command-registration"></a>
## 🔄 Command Registration

### Automatic Registration (On Startup)

When the bot starts, it automatically registers all commands with Discord. You'll see:

```
Registering slash commands...
Successfully registered 100 commands
```

### Manual Registration (/commands sync)

If commands are missing (e.g., after a fresh deploy), run:

```
/commands sync
```

This forces a re-registration. Wait **1-2 minutes** for Discord to process.

### Why Commands Might Not Show

| Cause | Fix |
|-------|-----|
| **First deploy — global commands** | Global commands take **up to 1 hour** to propagate. Use `GUILD_ID` for instant registration |
| **Bot was re-invited** | Run `/commands sync` or wait for cache refresh |
| **Discord cache** | Press **Ctrl+R** (Windows) or **Cmd+R** (Mac) to refresh Discord |
| **Registration failed** | Check Render logs for errors. Verify `CLIENT_ID` and `DISCORD_TOKEN` are correct |

### Multi-Server Mode

To run the bot in multiple servers:

```env
MULTI_GUILD=true
# GUILD_ID is optional when MULTI_GUILD=true
```

Then generate a new invite URL with both `bot` and `applications.commands` scopes.

---

<a name="environment-variables-reference"></a>
## 🔧 Environment Variables Reference

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | — |
| `CLIENT_ID` | Discord application client ID | — |
| `GUILD_ID` | Discord server ID (for single-server mode) | — |

### Optional — Bot Behavior

| Variable | Description | Default |
|----------|-------------|---------|
| `MULTI_GUILD` | Enable commands in all servers | `false` |
| `OWNER_IDS` | Comma-separated Discord user IDs (bot owners) | `""` |
| `NODE_ENV` | `production` or `development` | `development` |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | `info` |
| `LOG_TO_FILE` | Save logs to file | `false` |
| `PREFIX` | Prefix for text commands | `!` |

### Optional — PostgreSQL

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_URL` | Full PostgreSQL connection string | `postgresql://localhost:5432/clypher` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `clypher` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `""` |

### Optional — Lavalink (Music)

| Variable | Description | Default |
|----------|-------------|---------|
| `LAVALINK_HOST` | Lavalink server host | `localhost` |
| `LAVALINK_PORT` | Lavalink server port | `2333` |
| `LAVALINK_PASSWORD` | Lavalink server password | `youshallnotpass` |
| `LAVALINK_SECURE` | Use SSL for Lavalink | `false` |
| `LAVALINK_NAME` | Node name | `Main` |
| `LAVALINK_NODES` | JSON array of multiple Lavalink nodes | `""` |
| `LAVALINK_SEARCH_PLATFORM` | Default search platform | `ytmsearch` |

### Optional — Web Server

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port (health check) | `3000` |
| `WEB_HOST` | Web server host | `0.0.0.0` |

---

<a name="troubleshooting"></a>
## 🔍 Troubleshooting

### Bot won't start

```
Error: Cannot find module 'discord.js'
```

Run `npm install` to install dependencies.

### Commands not showing

```
Error: No command matching help was found.
```

Run `/commands sync` in your server. If using `MULTI_GUILD=true`, wait up to 1 hour for global propagation.

### Music not working

```
Lavalink is configured with localhost in production — skipping music initialization.
```

Either:
- Run Lavalink locally (set `LAVALINK_HOST=localhost`)
- Deploy Lavalink on Render/Railway and set `LAVALINK_HOST` to its URL
- Use Docker Compose which includes Lavalink

### "Cannot send an empty message" error

```
DiscordAPIError: Cannot send an empty message
```

Some commands need data to work. For example, `/leaderboard` needs users with XP, and `/eleaderboard` needs users with economy balances.

### Database connection failed

```
Database connection failed — falling back to in-memory storage
```

This is **normal** if you haven't set up PostgreSQL. The bot will work but data resets on restart.

### Bot crashes on startup

Check your `.env` file:
- Is `DISCORD_TOKEN` correct? (It should be the bot token, not the client secret)
- Is `CLIENT_ID` a valid number?
- Did you enable the required intents in Discord Developer Portal?

### Economy data seems wrong

Check if the bot has been redeployed after code changes. The running process uses whatever code was active at startup — after pushing new code to GitHub, you must **redeploy** on Render (Manual Deploy → Deploy latest commit).

---

## 📄 License

ClypherBot is released under the MIT License. See [LICENSE](LICENSE) for details.

---

*Last updated: July 2026*
