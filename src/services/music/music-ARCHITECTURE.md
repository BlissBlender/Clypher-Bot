# Music System Architecture

## Overview

The music system uses [**Lavalink v4**](https://github.com/lavalink-devs/Lavalink) as the audio server and [**Riffy**](https://github.com/riffy-rb/riffy) as the Discord.js v14 client wrapper. YouTube playback is handled by the [Lavalink YouTube plugin](https://github.com/lavalink-devs/youtube-source).

```
Lavalink Server (Java)
    │  WebSocket (port 2333)
    ▼
client.riffy (Riffy instance) ─── playerHandler.js (events)
    │                                      │
    │                               refreshPlayerMessage
    │                                      │
    ├── musicActions.js                 musicEmbeds.js
    ├── playerStore.js
    ├── musicVoiceState.js
    ├── permissions.js
    └── prefixSupport.js
    
Commands ──> musicActions.js ──> client.riffy
Buttons  ──> musicButtons.js ──> musicActions.js
```

## File Map

### Core Files (`src/services/music/`)

| File | Role | Key Exports |
|---|---|---|
| `riffySetup.js` | Initialization | `initializeMusic(client)`, `setupPlayerHandler(client)` |
| `playerHandler.js` | Event handlers | `setupPlayerHandler()`, `refreshPlayerMessage()` |
| `playerStore.js` | In-memory state | `GuildMusicData` class, `getGuildMusicData()`, `deleteGuildMusicData()` |
| `musicActions.js` | Action functions | `playQuery()`, `skipTrack()`, `stopPlayback()`, `setLoopMode()`, `setVolume()`, etc. |
| `musicEmbeds.js` | Embed builders | `buildNowPlayingEmbed()`, `buildQueueEmbed()`, `buildPlayerButtonRows()`, `MUSIC_BUTTON_IDS` |
| `musicVoiceState.js` | Voice state tracking | Auto-pause on empty VC, auto-resume on join |
| `permissions.js` | Access control | `canControlMusic()`, `requireVoiceChannel()` |
| `prefixSupport.js` | Defer helper | `deferMusicCommand()` — non-ephemeral for prefix, ephemeral for slash |

### Command Files (`src/commands/Music/`)

| File | Description |
|---|---|
| `play.js` | `/play <query>` — Searches and queues tracks |
| `music.js` | `/music <subcommand>` — 13 subcommands (pause, resume, skip, stop, shuffle, loop, volume, seek, remove, move, clear, autoplay, 247, leave) |
| `join.js` | `/join` — Connect to voice channel |
| `nowplaying.js` | `/nowplaying` — Show current track |
| `queue.js` | `/queue` — Show paginated queue |

### Handler Files

| File | Role |
|---|---|
| `src/handlers/musicButtons.js` | Button interaction handler for all 13 music buttons |
| `src/interactions/buttons/music.js` | Button ID registration (maps 13 `MUSIC_BUTTON_IDS` to handler) |

### Config Files

| File | Role |
|---|---|
| `src/config/lavalink.js` | Lavalink connection settings (host, port, password, secure) |
| `lavalink/application.yml` | Lavalink server config (YouTube plugin, sources, port) |

## Initialization Flow

```
src/app.js
    │
    ├── riffySetup.initializeMusic(client)
    │       │
    │       ├── new Riffy(client, lavalinkConfig.nodes, { ... })
    │       │       └── Creates client.riffy
    │       │
    │       └── setupPlayerHandler(client)
    │               └── Attaches event listeners to client.riffy:
    │                   nodeConnect, nodeError, nodeDisconnect, nodeReconnect
    │                   trackStart, queueEnd, playerDisconnect
    │                   trackError, trackStuck
    │
    ├── ready.js event → initRiffyAfterReady(client)
    │       └── client.riffy.init(client.user.id)
    │
    └── shutdownMusic(client)
            └── Destroys all players on bot shutdown
```

## Per-Guild State: `GuildMusicData`

Defined in `playerStore.js`. Created lazily when a guild first interacts with music.

```js
{
  playerMessageId: null,    // ID of the "Now Playing" message in channel
  playerChannelId: null,    // Channel where the player message lives
  autoplay: false,          // Auto-play related tracks when queue ends
  loop: 'none',             // 'none' | 'track' | 'queue'
  volume: 75,               // 0–100
  shuffle: false,           // Whether queue was shuffled
  previousTracks: [],       // Last 20 played tracks (for autoplay)
  twentyFourSeven: false,   // Stay in VC when idle
  queuePages: Map(),        // Per-user queue pagination state
  updateInterval: null,     // setInterval ID for player message refresh
  idleTimeout: null,        // setTimeout ID for idle disconnect
  wasPaused: false,         // True if auto-paused by voice state
  stopConfirmPending: null, // User ID waiting for stop confirmation
}
```

## Data Flow: Playing a Track

```
/play Never Gonna Give You Up
    │
    ▼
commands/Music/play.js
    │
    └──► musicActions.js:playQuery(client, interaction, query)
            │
            ├──► ensurePlayer(client, interaction)
            │       ├── assertRiffyAvailable(client)
            │       ├── assertInVoice(member)
            │       ├── getPlayer(client, guildId) — existing player or null
            │       └── client.riffy.createConnection(...) — if no player
            │
            ├──► client.riffy.resolve({ query, requester })
            │       └── Lavalink resolves the query (search or URL)
            │
            ├──► player.queue.add(track) or tracks (for playlists)
            ├──► player.play() — if nothing is playing
            │
            └──► reply with success embed
```

## Data Flow: Track Start → Player Message

```
Lavalink sends trackStart event
    │
    ▼
playerHandler.js: client.riffy.on('trackStart', ...)
    │
    ├──► Store previous track in guildData.previousTracks
    ├──► Clear idleTimeout if set
    ├──► buildNowPlayingEmbed(track, player, guildData)
    ├──► buildPlayerButtonRows(player, guildData)
    ├──► editOrSendPlayerMessage(client, guildData, channelId, embed, components)
    └──► startUpdateInterval(client, guildId)
            └─── Every 15s: refreshPlayerMessage → update embed
```

## Data Flow: Queue End

```
queueEnd event
    │
    ▼
playerHandler.js: client.riffy.on('queueEnd', ...)
    │
    ├──► IF autoplay enabled:
    │       └── player.autoplay(player) — Riffy plays related track
    │
    └──► IF autoplay disabled:
            ├── Delete player message
            └── IF !twentyFourSeven:
                    └── Start 30s idleTimeout → destroy player
```

## Button System

13 buttons defined in `musicEmbeds.js` `MUSIC_BUTTON_IDS`:

```
Row 1: ⏸️ Pause | ▶️ Resume | ⏭️ Skip | ⏹️ Stop | 🔀 Shuffle
Row 2: 🔁 Loop | 🔉 Vol - | 🔊 Vol + | 📋 Queue
```

Queue buttons (ephemeral popup):
```
⏮️ First | ◀️ Prev | Page X/N | ▶️ Next | ⏭️ Last
```

**Registration:** `src/interactions/buttons/music.js` maps all 13 IDs to `musicButtonHandler.execute`.

**Confirmation flows:**
- **Stop** with 5+ tracks: First press shows ephemeral "press again to confirm" message. Second press (same user) executes destroy.
- **Queue buttons** work via ephemeral reply, controlled by per-user `queuePages` state.

## Voice State Management

`musicVoiceState.js` handles automatic pause/resume:

```
voiceStateUpdate event
    │
    ▼
    ├── All non-bot users left VC → player.pause(true) + wasPaused = true
    │
    └── Someone joins VC while wasPaused → player.pause(false) + wasPaused = false
            └── (Only resumes if paused by auto-pause, not by manual pause command)
```

## Prefix Support

The `messageCreate.js` event handler intercepts these prefix shortcuts and routes them to `/music` subcommands:

```
!leave   → /music leave
!pause   → /music pause
!resume  → /music resume
!skip    → /music skip
!stop    → /music stop
!volume  → /music volume <args>
```

Subcommands marked as blocked for prefix in `prefixRestrictions.js`: `shuffle`, `loop`, `seek`, `remove`, `move`, `clear`, `247`.

## Configuration

### Lavalink (`lavalink/application.yml`)

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  plugins:
    - dependency: "dev.lavalink.youtube:youtube-plugin:1.13.5"  # YouTube plugin
  server:
    sources:
      youtube: false        # Built-in disabled — plugin handles it
      bandcamp: true
      soundcloud: true
      http: true

plugins:
  youtube:
    enabled: true
    allowSearch: true
    allowDirectVideoIds: true
    allowDirectPlaylistIds: true
    clients:
      - MUSIC
      - ANDROID_TESTSUITE
      - WEB
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LAVALINK_HOST` | `localhost` | Lavalink server hostname |
| `LAVALINK_PORT` | `2333` | Lavalink WebSocket port |
| `LAVALINK_PASSWORD` | `youshallnotpass` | Lavalink connection password |
| `LAVALINK_SECURE` | `false` | Use wss:// instead of ws:// |

## Autoplay

When `guildData.autoplay = true` and the queue ends, `playerHandler.js` calls `player.autoplay(player)` — a Riffy API method that automatically resolves and plays a related track based on the last played track. Users can toggle this with `/music autoplay enabled:true|false`.

## Constants

| Constant | Value | Location |
|---|---|---|
| `UPDATE_INTERVAL_MS` | 15,000ms (15s) | `playerHandler.js` |
| `IDLE_DISCONNECT_MS` | 30,000ms (30s) | `playerHandler.js` |
| `QUEUE_PAGE_SIZE` | 10 | `musicEmbeds.js` |
| Default volume | 75 | `playerStore.js` `GuildMusicData` |
| 24/7 idle disconnect | Skips idle timeout | `playerHandler.js` `queueEnd` |
| Stop confirmation threshold | 5 tracks | `musicActions.js` `stopPlayback` |
| Stop confirmation timeout | 15,000ms (15s) | `musicActions.js` `stopPlayback` |
