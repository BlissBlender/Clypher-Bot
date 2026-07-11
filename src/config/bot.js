import { logger } from '../utils/logger.js';

export const botConfig = {
  // =========================
  // BRANDING & SUPPORT
  // =========================
  /** URL for the Discord support server — shown in embeds and /help */
  supportServer: process.env.SUPPORT_SERVER_URL || null,

  // =========================
  // BOT PRESENCE (what users see under the bot name)
  // Customize via BOT_PRESENCE_TEXT and BOT_PRESENCE_TYPE env vars.
  // Type: 0=Playing, 2=Listening, 3=Watching, 5=Competing
  // =========================
  presence: {
    status: "online",
    activities: [
      {
        name: process.env.BOT_PRESENCE_TEXT || "/help | ClypherBot v2.1.0",
        type: [0, 2, 3, 5].includes(parseInt(process.env.BOT_PRESENCE_TYPE, 10)) 
        ? parseInt(process.env.BOT_PRESENCE_TYPE, 10) 
        : 3,
      },
    ],
  },

  // =========================
  // COMMAND BEHAVIOR
  // =========================
  commands: {
    owners: process.env.OWNER_IDS?.split(",") || [],
    defaultCooldown: 3,
    deleteCommands: false,
    testGuildId: process.env.TEST_GUILD_ID,
    prefix: process.env.PREFIX || "!",
  },

  // =========================
  // APPLICATIONS SYSTEM
  // =========================
  applications: {
    defaultQuestions: [
      { question: "What is your name?", required: true },
      { question: "How old are you?", required: true },
      { question: "Why do you want to join?", required: true },
    ],
    statusColors: {
      pending: "#FFA500",
      approved: "#00FF00",
      denied: "#FF0000",
    },
    applicationCooldown: 24,
    deleteDeniedAfter: 7,
    deleteApprovedAfter: 30,
    managerRoles: [],
  },

  // =========================
  // EMBED COLORS & BRANDING
  // =========================
  // IMPORTANT: This is the SINGLE SOURCE OF TRUTH for all bot colors
  embeds: {
    colors: {
      // ═══════════════════════════════════════
      //  CLYPHER PREMIUM COLOR SYSTEM
      //  Futuristic · Digital Economy · Premium
      // ═══════════════════════════════════════
      //
      //  HOW TO USE:
      //    import { getColor } from '../config/bot.js';
      //    embed.setColor(getColor('success'));
      //    embed.setColor(getColor('money'));
      //    embed.setColor(getColor('ticket.open'));
      //
      //  Semantic colors for embed responses:
      //    success  → rewards, completed tasks, successful transactions
      //    money    → balance increases, currency received, economy rewards
      //    spending → purchases, payments, currency lost
      //    error    → invalid commands, failed actions, missing requirements
      //    warning  → risk actions, low balance, confirmation needed
      //    info     → help messages, general info, status
      //    rare     → legendary rewards, unique drops, announcements
      // ═══════════════════════════════════════

      // Brand foundation — deep navy, tech-forward
      primary: '#0D1B2A',
      secondary: '#1B2838',

      // Status colors — vibrant, modern
      success: '#00E676',
      error: '#FF1744',
      warning: '#FFAB00',
      info: '#2979FF',

      // Economy / Financial — premium wealth palette
      money: '#FFD700',
      spending: '#FF6D00',

      // Special events — legendary & rare
      rare: '#AA00FF',

      // Neutral utility
      light: '#FFFFFF',
      dark: '#0A0F1A',
      gray: '#8899AA',

      // Legacy Discord-style palette (compatibility)
      blurple: '#5865F2',
      green: '#00E676',
      yellow: '#FFAB00',
      fuchsia: '#D500F9',
      red: '#FF1744',
      black: '#000000',

      // Feature-specific colors
      giveaway: {
        active: '#00E676',
        ended: '#FF1744',
      },
      ticket: {
        open: '#00E676',
        claimed: '#FFAB00',
        closed: '#FF1744',
        pending: '#8899AA',
      },
      economy: '#FFD700',
      birthday: '#D500F9',
      moderation: '#7C4DFF',

      // Ticket priority color mapping
      priority: {
        none: '#8899AA',
        low: '#2979FF',
        medium: '#00E676',
        high: '#FFAB00',
        urgent: '#FF1744',
      },
    },
    footer: {
      text: "Clypher Bot",
      icon: null,
    },
    thumbnail: null,
    author: {
      name: null,
      icon: null,
      url: null,
    },
  },

  // =========================
  // ECONOMY SETTINGS
  // =========================
  economy: {
    // ── Currency display ──
    currency: {
      name: "coins",
      namePlural: "coins",
      symbol: "$",
    },
    startingBalance: 0,
    baseBankCapacity: 100000,

    // ── Cooldowns (milliseconds) ──
    cooldowns: {
      daily: 86400000,      // 24 hours
      work: 1800000,        // 30 min
      crime: 3600000,       // 1 hour
      beg: 1800000,         // 30 min
      gamble: 300000,       // 5 min
      rob: 14400000,        // 4 hours
      fish: 2700000,        // 45 min
      mine: 3600000,        // 1 hour
      slut: 2700000,        // 45 min
      hunt: 3600000,        // 1 hour
      wheel: 600000,        // 10 min
    },

    // ── Daily ──
    dailyAmount: 1000,
    dailyPremiumBonus: 0.1,

    // ── Work ──
    workMin: 50,
    workMax: 300,
    workLaptopMultiplier: 1.5,

    // ── Crime ──
    crimeJailTime: 7200000,  // 2 hours

    // ── Beg ──
    begMin: 50,
    begMax: 200,
    begSuccessChance: 0.7,

    // ── Gamble ──
    gambleWinChance: 0.4,
    gamblePayoutMultiplier: 2.0,
    gambleCloverBonus: 0.1,
    gambleCharmBonus: 0.08,

    // ── Rob ──
    robSuccessRate: 0.25,
    robPercentage: 0.15,
    robFinePercentage: 0.1,
    robFailJailTime: 3600000,

    // ── Fish ──
    fishMinReward: 300,
    fishMaxReward: 900,
    fishingRodMultiplier: 1.5,

    // ── Mine ──
    mineMinReward: 400,
    mineMaxReward: 1200,
    pickaxeMultiplier: 1.2,
    diamondPickaxeMultiplier: 2.0,

    // ── Hunt ──
    huntCooldown: 3600000,
    huntMinReward: 500,
    huntMaxReward: 2000,

    // ── Lucky Wheel ──
    luckyWheelCost: 500,

    // ── Lottery ──
    lotteryTicketPrice: 500,

    // ── Trading ──
    trade: {
      cooldownMs: 30000,
      maxItemsPerTrade: 5,
      maxCurrencyPerTrade: 10000000,
      confirmTimeoutMs: 120000,
    },

    // ── Marketplace ──
    market: {
      listingFee: 0.05,           // 5% listing fee
      saleTax: 0.03,              // 3% tax on sale
      maxListingsPerUser: 10,
      listingDurationMs: 86400000, // 24 hours
      minPrice: 100,
    },

    // ── Properties ──
    properties: {
      starterHouse: { price: 100000, income: 500, name: 'Starter House', emoji: '🏠' },
      shop:        { price: 250000, income: 1500, name: 'Small Shop', emoji: '🏪' },
      warehouse:   { price: 500000, income: 3000, name: 'Warehouse', emoji: '🏭' },
      factory:     { price: 1000000, income: 7500, name: 'Industrial Factory', emoji: '🏗️' },
      office:      { price: 2000000, income: 15000, name: 'Corporate Office', emoji: '🏢' },
      mansion:     { price: 5000000, income: 40000, name: 'Luxury Mansion', emoji: '🏰' },
      upgradeCostMultiplier: 2.0,
      incomePerLevel: 1.5,
      maxLevel: 10,
    },

    // ── Pets ──
    pets: {
      adoptionCost: 25000,
      feedCost: 500,
      trainingCost: 2000,
      maxXpPerFeed: 25,
      xpPerTraining: 50,
      maxLevel: 20,
      petTypes: {
        dog:    { name: 'Dog',    emoji: '🐕', bonus: { work: 1.15 },       desc: 'Small work earning bonus' },
        cat:    { name: 'Cat',    emoji: '🐈', bonus: { gamble: 0.05 },     desc: 'Gambling luck bonus' },
        dragon: { name: 'Dragon', emoji: '🐉', bonus: { work: 1.5 },       desc: 'Rare high-level earning bonus' },
        owl:    { name: 'Owl',    emoji: '🦉', bonus: { crime: 0.1 },      desc: 'Crime success rate bonus' },
        fox:    { name: 'Fox',    emoji: '🦊', bonus: { fish: 1.3 },       desc: 'Fishing yield bonus' },
        bear:   { name: 'Bear',   emoji: '🐻', bonus: { mine: 1.3 },       desc: 'Mining yield bonus' },
      },
      feedCooldownMs: 3600000,   // 1 hour
      trainCooldownMs: 7200000,   // 2 hours
    },

    // ── Achievements ──
    achievements: {
      wealth: [
        { id: 'first_10k',    name: 'Getting Started',   desc: 'Accumulate 10,000 total wealth',      reward: 5000,  threshold: 10000 },
        { id: 'first_100k',   name: 'Well Off',          desc: 'Accumulate 100,000 total wealth',     reward: 25000,  threshold: 100000 },
        { id: 'millionaire',  name: 'Millionaire',       desc: 'Accumulate 1,000,000 total wealth',   reward: 100000, threshold: 1000000 },
        { id: 'multi_million',name: 'Multi-Millionaire', desc: 'Accumulate 10,000,000 total wealth',  reward: 500000, threshold: 10000000 },
        { id: 'billionaire',  name: 'Billionaire',       desc: 'Accumulate 1,000,000,000 total wealth',reward: 1000000,threshold: 1000000000 },
      ],
      activity: [
        { id: 'daily_7',      name: 'Week Warrior',      desc: 'Maintain a 7-day daily streak',       reward: 10000,  threshold: 7 },
        { id: 'daily_30',     name: 'Monthly Loyalty',   desc: 'Maintain a 30-day daily streak',      reward: 50000,  threshold: 30 },
        { id: 'daily_100',    name: 'Century Dedication',desc: 'Maintain a 100-day daily streak',     reward: 250000, threshold: 100 },
        { id: 'transactions_100', name: 'Active Trader', desc: 'Complete 100 transactions',           reward: 20000,  threshold: 100 },
        { id: 'trades_50',    name: 'Trade Master',      desc: 'Complete 50 trades',                  reward: 50000,  threshold: 50 },
      ],
      economy: [
        { id: 'first_purchase', name: 'First Purchase',  desc: 'Buy your first item from the shop',   reward: 1000,   threshold: 1 },
        { id: 'first_property',name: 'Homeowner',        desc: 'Buy your first property',             reward: 25000,  threshold: 1 },
        { id: 'first_pet',     name: 'Pet Lover',        desc: 'Adopt your first pet',                reward: 5000,   threshold: 1 },
        { id: 'first_trade',   name: 'First Trade',      desc: 'Complete your first trade',           reward: 5000,   threshold: 1 },
        { id: 'property_owner_3', name: 'Real Estate Mogul', desc: 'Own 3 properties at once',       reward: 100000, threshold: 3 },
        { id: 'pet_max_level', name: 'Best Friend',      desc: 'Train a pet to max level',            reward: 50000,  threshold: 1 },
      ],
    },

    // ── Random Economy Events ──
    events: {
      enabled: true,
      checkIntervalMs: 600000,       // 10 minutes
      types: {
        treasure: { name: 'Treasure Hunt',    emoji: '🧭', chance: 0.15, minReward: 5000,  maxReward: 50000 },
        boom:     { name: 'Market Boom',      emoji: '📈', chance: 0.10, multiplier: 0.8 },
        crash:    { name: 'Market Crash',     emoji: '📉', chance: 0.05, multiplier: 1.5 },
        bonus:    { name: 'Bonus Weekend',    emoji: '🎉', chance: 0.08, multiplier: 2.0 },
      },
    },

    // ── Rob improvements ──
    rob: {
      baseSuccessRate: 0.35,
      maxStealPercent: 0.25,
      failFinePercent: 0.15,
      cooldownMs: 14400000,         // 4 hours
      protectionItems: ['personal_safe', 'robbery_shield', 'insurance_policy', 'security_token', 'guard_dog', 'fortress_upgrade'],
      antiAbuseMinWallet: 1000,
      shieldItemSuccessReduction: 0.5,
    },

    // ── Daily streaks ──
    streaks: {
      baseDaily: 1000,
      streakBonusPerDay: 50,
      milestone7:  { reward: 15000,  item: 'lucky_clover' },
      milestone30: { reward: 75000,  item: 'lucky_charm' },
      milestone100:{ reward: 250000, item: 'diamond_pickaxe' },
    },

    // ── Item rarities ──
    itemRarities: {
      common:    { name: 'Common',    emoji: '⬜', color: '#95A5A6', multiplier: 1.0 },
      uncommon:  { name: 'Uncommon',  emoji: '🟩', color: '#2ECC71', multiplier: 1.5 },
      rare:      { name: 'Rare',      emoji: '🟦', color: '#3498DB', multiplier: 2.5 },
      epic:      { name: 'Epic',      emoji: '🟣', color: '#9B59B6', multiplier: 4.0 },
      legendary: { name: 'Legendary', emoji: '🟡', color: '#F1C40F', multiplier: 7.0 },
    },
  },

  shop: { },

  // =========================
  // LEVELING / XP SYSTEM
  // =========================
  leveling: {
    // ── Master toggle ──
    enabled: true,

    // ── Level bounds ──
    maxLevel: 1000,
    minLevel: 0,

    // ── XP per message (per-guild default, admins override via /level setup) ──
    xpPerMessage: { min: 15, max: 25 },

    // ── Cooldown between XP-granting messages (seconds) ──
    xpCooldownSeconds: 20,

    // ── XP Formula: 5 * level² + 50 * level + constant ──
    //   Level  0 → 50 XP  to reach level 1
    //   Level  1 → 105 XP to reach level 2
    //   Level  5 → 375 XP to reach level 6
    //   Level 10 → 1050 XP to reach level 11
    //   Level 50 → 15250 XP to reach level 51
    //   Level 100 → 55500 XP to reach level 101
    //
    //   If you change these coefficients you will alter the entire XP curve
    //   and existing user levels will not be recalculated automatically.
    xpFormula: {
      quadraticCoefficient: 5,  // level² multiplier
      linearCoefficient: 50,    // level multiplier
      constant: 50,             // base cost
    },

    // ── Default level-up message (admins override via /level setup) ──
    //   Placeholders: {user}, {level}, {xp}, {xpNeeded}
    levelUpMessage: '🎉 {user} leveled up to **Level {level}**! Keep it up! 💪',

    // ── Announcement settings ──
    announceLevelUp: true,

    // ── Global XP multiplier (applied on top of per-message) ──
    xpMultiplier: 1,

    // ── Role rewards (level → roleId map, admins configure per-guild) ──
    roleRewards: {},

    // ── Ignored users / channels / roles (admins configure per-guild) ──
    ignoredChannels: [],
    ignoredRoles: [],
    blacklistedUsers: [],
  },

  // =========================
  // MUSIC / LAVALINK DEFAULTS
  // =========================
  music: {
    // ── Default player state (per-guild, in-memory) ──
    defaults: {
      volume: 75,           // 0-100
      loop: 'none',          // 'none' | 'track' | 'queue'
      autoplay: false,
      twentyFourSeven: false, // stay in VC when queue ends
    },

    // ── Timing constants ──
    timing: {
      playerUpdateIntervalMs: 15000,   // how often the now-playing embed refreshes
      idleDisconnectMs: 30000,         // how long to wait before leaving when idle
      stopConfirmTimeoutMs: 15000,     // how long the stop-confirmation is valid
    },

    // ── Queue display ──
    queuePageSize: 10,
    maxPreviousTracks: 20,
  },

  // =========================
  // TICKET SYSTEM
  // =========================
  tickets: {
    defaultCategory: null,
    supportRoles: [],
    priorities: {
      none: { emoji: "⚪", color: "#95A5A6", label: "None" },
      low: { emoji: "🟢", color: "#2ECC71", label: "Low" },
      medium: { emoji: "🟡", color: "#F1C40F", label: "Medium" },
      high: { emoji: "🔴", color: "#E74C3C", label: "High" },
      urgent: { emoji: "🚨", color: "#E91E63", label: "Urgent" },
    },
    defaultPriority: "none",
    archiveCategory: null,
    logChannel: null,
  },

  // =========================
  // GIVEAWAY SETTINGS
  // =========================
  giveaways: {
    defaultDuration: 86400000,
    minimumWinners: 1,
    maximumWinners: 10,
    minimumDuration: 300000,
    maximumDuration: 2592000000,
    allowedRoles: [],
    bypassRoles: [],
  },

  // =========================
  // BIRTHDAY SETTINGS
  // =========================
  birthday: {
    defaultRole: null,
    announcementChannel: null,
    timezone: "UTC",
  },

  // =========================
  // VERIFICATION SETTINGS
  // =========================
  verification: {
    defaultMessage: "Click the button below to verify yourself and gain access to the server!",
    defaultButtonText: "Verify",
    autoVerify: {
      defaultCriteria: "none",
      defaultAccountAgeDays: 7,
      serverSizeThreshold: 1000,
      minAccountAge: 1,
      maxAccountAge: 365,
      sendDMNotification: true,
      criteria: {
        account_age: "Account must be older than specified days",
        server_size: "All users if server has less than 1000 members",
        none: "All users immediately"
      }
    },
    verificationCooldown: 5000,
    maxVerificationAttempts: 3,
    attemptWindow: 60000,
    maxCooldownEntries: 10000,
    maxAttemptEntries: 10000,
    cooldownCleanupInterval: 300000,
    maxAuditMetadataBytes: 4096,
    maxInMemoryAuditEntries: 1000,
    logAllVerifications: true,
    keepAuditTrail: true,
  },

  // =========================
  // WELCOME / GOODBYE MESSAGES
  // =========================
  welcome: {
    defaultWelcomeMessage: "🎉 Welcome **{user}** to **{server}**! We're now **{memberCount}** members strong!",
    defaultGoodbyeMessage: "👋 **{user}** has left **{server}**. We now have **{memberCount}** members.",
    defaultWelcomeChannel: null,
    defaultGoodbyeChannel: null,
  },

  // =========================
  // COUNTER CHANNELS
  // =========================
  counters: {
    defaults: {
      name: "{name} Counter",
      description: "Server {name} counter",
      type: "voice",
      channelName: "{name}-{count}",
    },
    permissions: {
      deny: ["VIEW_CHANNEL"],
      allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"],
    },
    messages: {
      created: "✅ Created counter **{name}**",
      deleted: "🗑️ Deleted counter **{name}**",
      updated: "🔄 Updated counter **{name}**",
    },
    types: {
      members: {
        name: "👥 Members",
        description: "Total members in the server",
        getCount: (guild) => guild.memberCount.toString(),
      },
      bots: {
        name: "🤖 Bots",
        description: "Total bot accounts in the server",
        getCount: (guild) => guild.members.cache.filter((m) => m.user.bot).size.toString(),
      },
      members_only: {
        name: "👤 Humans",
        description: "Total human members (non-bots)",
        getCount: (guild) => guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      },
    },
  },

  // =========================
  // GENERIC BOT MESSAGES
  // =========================
  messages: {
    noPermission: "You do not have permission to use this command.",
    cooldownActive: "Please wait {time} before using this command again.",
    errorOccurred: "An error occurred while executing this command.",
    missingPermissions: "I am missing required permissions to perform this action.",
    commandDisabled: "This command has been disabled.",
    maintenanceMode: "The bot is currently in maintenance mode.",
  },

  // =========================
  // FEATURE TOGGLES
  // =========================
  features: {
    economy: true,
    leveling: true,
    moderation: true,
    logging: true,
    welcome: true,
    tickets: true,
    giveaways: true,
    birthday: true,
    counter: true,
    verification: true,
    reactionRoles: true,
    joinToCreate: true,
    voice: true,
    search: true,
    tools: true,
    utility: true,
    community: true,
    fun: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Environment variables check:');
    logger.debug('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN exists:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID exists:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID exists:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST exists:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("Bot token is required (DISCORD_TOKEN or TOKEN environment variable)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("Client ID is required (CLIENT_ID environment variable)");
  }

  // PostgreSQL is optional — the database wrapper falls back to in-memory storage
  // when PostgreSQL is unavailable, so we only warn, not fail.
  if (process.env.NODE_ENV === 'production' && !process.env.POSTGRES_HOST && !process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    logger.warn('⚠️  No PostgreSQL configured. Bot will run with in-memory storage (data lost on restart).');
    logger.warn('   Set POSTGRES_HOST (or POSTGRES_URL/DATABASE_URL) to enable persistent storage.');
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("Bot configuration errors:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

/**
 * Resolve a color name to a Discord-compatible integer (hex number).
 *
 * @param {string|number} path - Color key (e.g. 'success', 'money', 'ticket.open'),
 *                               a number, or a hex string starting with '#'.
 * @param {string} [fallback="#99AAB5"] - Fallback hex color if path isn't found.
 * @param {Object|null} [overrides=null] - Optional per-guild color overrides to check first.
 * @returns {number} Discord embed color integer.
 *
 * Resolution order:
 *   1. If path is a number → return as-is
 *   2. If path is a hex string ('#...') → parse and return
 *   3. If overrides provided → check there first
 *   4. Fall back to botConfig.embeds.colors
 */
export function getColor(path, fallback = "#99AAB5", overrides = null) {
  // Direct number (0xXXXXXX) — return as-is
  if (typeof path === "number") return path;

  // Direct hex string — parse and return
  if (typeof path === "string" && path.startsWith("#")) {
    return parseInt(path.replace("#", ""), 16);
  }

  // Undefined/null/not-a-string — return fallback
  if (typeof path !== "string") {
    return typeof fallback === "string" && fallback.startsWith("#")
      ? parseInt(fallback.replace("#", ""), 16)
      : fallback;
  }

  // Check per-guild overrides first (if provided)
  if (overrides) {
    const overrideResult = path
      .split(".")
      .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), overrides);
    if (typeof overrideResult === "string" && overrideResult.startsWith("#")) {
      return parseInt(overrideResult.replace("#", ""), 16);
    }
  }

  // Default resolution from botConfig
  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );

  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }
  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
