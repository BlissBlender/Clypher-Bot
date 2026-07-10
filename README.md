# ClypherBot — Ultimate Discord Bot

**ClypherBot** is a powerful, feature-rich Discord bot with moderation tools, economy systems, music, leveling, tickets, giveaways, and much more. Built with Discord.js v14 and PostgreSQL.

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-optional-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support Server](https://img.shields.io/badge/Support-Discord-5865F2?logo=discord&logoColor=white)](https://discord.gg/charon)

> 💬 **Need help?** Join our [Discord Support Server](https://discord.gg/charon) for assistance, updates, and community.

---

## 🆘 Need Help?

Join the [**ClypherBot Support Server**](https://discord.gg/charon) — get help with setup, report bugs, suggest features, and connect with other users!

---

## 📖 Table of Contents

1. [Features Overview](#features-overview)
2. [Prerequisites](#prerequisites)
3. [Discord Application Setup](#discord-application-setup)
4. [Quick Start — Local Installation](#quick-start--local-installation)
5. [PostgreSQL Setup (Optional)](#postgresql-setup-optional)
6. [Lavalink Setup (Music)](#lavalink-setup-music)
7. [Deploy on Render (Free)](#deploy-on-render-free)
8. [Command Registration](#command-registration)
9. [Environment Variables Reference](#environment-variables-reference)
10. [Troubleshooting](#troubleshooting)

---

<a name="features-overview"></a>
## ✨ Features Overview

| Category | Features |
|----------|----------|
| 🛡️ **Moderation** | Ban, kick, timeout, warn, purge, lock/unlock channels, mass actions, case tracking, user notes, **auto-moderation** (anti-link, anti-spam, auto-mod dashboard) |
| 💰 **Economy** | Balance, daily, work, crime, gamble, rob, fish, mine, hunt, lottery, shop, inventory, stock market, lucky wheel, cooking |
| 📊 **Leveling** | XP system, rank cards, leaderboards, level roles, configurable XP rates |
| 🎵 **Music** | Play from YouTube/Spotify/SoundCloud/etc., queue, 24/7 mode, buttons, Lavalink v4 |
| 🎫 **Tickets** | Ticket system with priority levels, claiming, transcripts |
| 🎉 **Giveaways** | Create, end, reroll, multiple winners |
| 🎮 **Fun** | 8-ball, roast, compliment, RPS, slot machine, flip, fight, counting game |
| 🛠️ **Utility** | Weather, todo lists, password generator, color picker, URL shortener, AFK, server info, user info, polls |
| 👋 **Welcome** | Welcome/goodbye messages, auto-roles, custom embeds |
| 🎂 **Birthdays** | Birthday tracking with auto-announcements |
| ✅ **Verification** | Button-based verification system |
| 🎭 **Reaction Roles** | Self-assignable roles via reactions |
| 🔢 **Server Stats** | Live member count voice/text channels |
| 🔌 **Join to Create** | Temporary voice channels |

> 💬 **Questions or need help?** Join the [Discord Support Server](https://discord.gg/charon)

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

After the bot starts, type `/commands sync` in any channel the bot can see. This forces Discord to register all 93 slash commands.

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
ONLINE ✅ | 93 commands loaded
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
Successfully registered 93 commands
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

### Still stuck?

> 💬 Join the [**ClypherBot Support Server**](https://discord.gg/charon) — we'll help you get it running!

---

## 📄 License

ClypherBot is released under the MIT License. See [LICENSE](LICENSE) for details.

---

## 💬 Join the Community

Got questions, ideas, or just want to hang out? Join the [**ClypherBot Support Server**](https://discord.gg/charon)!

---

*Last updated: July 2026*
