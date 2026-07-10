// guildConfig.js

import { getGuildConfig as getGuildConfigDb, setGuildConfig as setGuildConfigDb } from '../utils/database.js';
import { BotConfig } from '../config/bot.js';
import { normalizeGuildConfig, validateGuildConfigOrThrow } from '../utils/schemas.js';
import { wrapServiceBoundary } from '../utils/serviceErrorBoundary.js';

const GUILD_CONFIG_DEFAULTS = {
    prefix: BotConfig.prefix,
    modRole: null,
    adminRole: null,
    welcomeChannel: null,
    welcomeMessage: 'Welcome {user} to {server}!',
    autoRole: null,
    dmOnClose: true,
    disabledCommands: {},
    disabledCategories: {},
    logging: {
        enabled: false,
        channels: { audit: null, applications: null, reports: null },
        ignore: { users: [], channels: [] },
        enabledEvents: {},
    },

    // ── Moderation Dashboard (antilink, antispam, automod) ──
    moderation: {
        enabled: false,
        logChannelId: null,
        ignoredRoles: [],
        ignoredChannels: [],

        // Anti-Link — block Discord invites and suspicious URLs
        antiLink: {
            enabled: false,
            action: 'warn',                           // warn | timeout | kick | none
            allowedInviteCodes: [],                    // specific Discord invite codes to allow
            whitelistedDomains: [],                    // domains always allowed
            minViolationsForAction: 3,                 // auto-action after N violations
        },

        // Anti-Spam — detect rapid messaging and mention spam
        antiSpam: {
            enabled: false,
            maxMessages: 5,                            // max messages in the time window
            windowMs: 5000,                            // sliding window (milliseconds)
            action: 'timeout',                         // warn | timeout | kick
            timeoutDurationMs: 60000,                  // 1 minute timeout
            maxMentions: 4,                            // max @mentions per message
            minViolationsForAction: 3,
        },

        // Auto-Mod — bad words, ALL-CAPS spam, repeated text
        autoMod: {
            enabled: false,
            blockedWords: [],                          // list of banned words/phrases
            blockedPatterns: [],                       // regex patterns to block
            antiCaps: {
                enabled: false,
                minLength: 8,                          // only check messages this long or longer
                capsThreshold: 70,                     // % of uppercase characters required to trigger
                action: 'warn',
            },
            antiRepeatedText: {
                enabled: false,
                maxConsecutiveChars: 8,                // e.g. "aaaaaa" triggers
                action: 'warn',
            },
        },

        // Progressive strikes — escalate punishment automatically
        strikes: {
            enabled: false,
            decayMs: 86400000,                         // strike expires after 24h
            tiers: [
                { threshold: 3, action: 'timeout', durationMs: 60000 },
                { threshold: 5, action: 'timeout', durationMs: 300000 },
                { threshold: 7, action: 'kick' },
            ],
        },
    },
};

export const getGuildConfig = wrapServiceBoundary(async function getGuildConfig(client, guildId, context = {}) {
    const config = await getGuildConfigDb(client, guildId, context);

    return normalizeGuildConfig(config, GUILD_CONFIG_DEFAULTS);
}, {
    service: 'guildConfigService',
    operation: 'getGuildConfig',
    message: 'Failed to fetch guild configuration',
    userMessage: 'Failed to load server configuration. Please try again.'
});

export const setGuildConfig = wrapServiceBoundary(async function setGuildConfig(client, guildId, config, context = {}) {
    const normalized = normalizeGuildConfig(config, GUILD_CONFIG_DEFAULTS);
    const validated = validateGuildConfigOrThrow(normalized, { guildId, ...context });
    return await setGuildConfigDb(client, guildId, validated, context);
}, {
    service: 'guildConfigService',
    operation: 'setGuildConfig',
    message: 'Failed to save guild configuration',
    userMessage: 'Failed to save server configuration. Please try again.'
});

export const updateGuildConfig = wrapServiceBoundary(async function updateGuildConfig(client, guildId, updates, context = {}) {
    const currentConfig = await getGuildConfigDb(client, guildId, context);
    const newConfig = { ...currentConfig, ...updates };
    const normalized = normalizeGuildConfig(newConfig, GUILD_CONFIG_DEFAULTS);
    const validated = validateGuildConfigOrThrow(normalized, { guildId, ...context });
    return await setGuildConfigDb(client, guildId, validated, context);
}, {
    service: 'guildConfigService',
    operation: 'updateGuildConfig',
    message: 'Failed to update guild configuration',
    userMessage: 'Failed to update server configuration. Please try again.'
});

export const getConfigValue = wrapServiceBoundary(async function getConfigValue(client, guildId, key, defaultValue = null, context = {}) {
    const config = await getGuildConfig(client, guildId, context);
    return config[key] !== undefined ? config[key] : defaultValue;
}, {
    service: 'guildConfigService',
    operation: 'getConfigValue',
    message: 'Failed to read guild configuration value',
    userMessage: 'Failed to read a server setting. Please try again.'
});

export const setConfigValue = wrapServiceBoundary(async function setConfigValue(client, guildId, key, value, context = {}) {
    return await updateGuildConfig(client, guildId, { [key]: value }, context);
}, {
    service: 'guildConfigService',
    operation: 'setConfigValue',
    message: 'Failed to update guild configuration value',
    userMessage: 'Failed to update a server setting. Please try again.'
});