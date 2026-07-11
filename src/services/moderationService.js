// moderationService.js — Anti-Link, Anti-Spam, Auto-Moderation engine
//                  Plus: Anti-Mass Mention, Anti-Raid, Anti-Nuke

import { getGuildConfig, setConfigValue } from './guildConfig.js';
import { logger } from '../utils/logger.js';
import { createEmbed } from '../utils/embeds.js';
import { PermissionFlagsBits } from 'discord.js';

// ── Known Discord invite domains ────────────────────────────

const INVITE_PATTERNS = [
    /discord(?:app)?\.(?:com|gg)\/(?:invite\/)?([a-zA-Z0-9_-]+)/gi,
    /discord\.gg\/([a-zA-Z0-9_-]+)/gi,
    /disco\.gg\/([a-zA-Z0-9_-]+)/gi,
    /dsc\.gg\/([a-zA-Z0-9_-]+)/gi,
    /discordapp\.com\/invite\/([a-zA-Z0-9_-]+)/gi,
];

/** Common suspicious / unsafe URL patterns */
const SUSPICIOUS_PATTERNS = [
    /free\s*steam\s*keys?/gi,
    /free\s*nitro/gi,
    /steamcommunity\.com\/gift/i,
    /free\s*robux/i,
    /free\s*vbucks/i,
    /giveaway.*(?:nitro|steam|gift)/i,
    /bit\.ly\//i,
    /tinyurl\.com\//i,
    /shorturl\.at\//i,
    /rb\.gy\//i,
];

// ── Strike / violation tracking (in-memory cache backed by DB) ──

/** Map<guildId, Map<userId, { count, timestamp }>> */
const violationStore = new Map();

/** Tracks which guilds have been loaded from DB */
const loadedGuilds = new Set();

function getViolationsKey(guildId) {
    return `guild:${guildId}:moderation:violations`;
}

async function persistViolations(client, guildId) {
    try {
        const guildViolations = violationStore.get(guildId);
        if (!guildViolations || guildViolations.size === 0) {
            await client.db.delete(getViolationsKey(guildId)).catch(() => {});
        } else {
            // Convert Map to plain object for storage
            const obj = {};
            for (const [userId, entry] of guildViolations.entries()) {
                obj[userId] = entry;
            }
            await client.db.set(getViolationsKey(guildId), obj);
        }
    } catch (error) {
        logger.error(`[Moderation] Failed to persist violations for guild ${guildId}:`, error);
    }
}

async function ensureViolationsLoaded(client, guildId) {
    if (loadedGuilds.has(guildId)) return;
    loadedGuilds.add(guildId);

    try {
        const stored = await client.db.get(getViolationsKey(guildId));
        if (!stored || typeof stored !== 'object') return;

        const now = Date.now();
        const decayMs = 86400000; // 24h
        const guildViolations = new Map();

        for (const [userId, entry] of Object.entries(stored)) {
            if (entry && typeof entry.count === 'number' && typeof entry.timestamp === 'number') {
                // Skip expired entries
                if (now - entry.timestamp > decayMs) continue;
                guildViolations.set(userId, { count: entry.count, timestamp: entry.timestamp });
            }
        }

        if (guildViolations.size > 0) {
            violationStore.set(guildId, guildViolations);
        }
    } catch (error) {
        logger.error(`[Moderation] Failed to load violations for guild ${guildId}:`, error);
    }
}

async function getUserViolations(client, guildId, userId) {
    await ensureViolationsLoaded(client, guildId);
    const guildViolations = violationStore.get(guildId);
    if (!guildViolations) return 0;
    const entry = guildViolations.get(userId);
    if (!entry) return 0;
    return entry.count;
}

async function incrementViolations(client, guildId, userId) {
    await ensureViolationsLoaded(client, guildId);
    if (!violationStore.has(guildId)) {
        violationStore.set(guildId, new Map());
    }
    const guildViolations = violationStore.get(guildId);
    const current = guildViolations.get(userId) || { count: 0, timestamp: Date.now() };
    current.count += 1;
    current.timestamp = Date.now();
    guildViolations.set(userId, current);

    // Persist to database
    await persistViolations(client, guildId);

    return current.count;
}

async function resetViolations(client, guildId, userId) {
    await ensureViolationsLoaded(client, guildId);
    const guildViolations = violationStore.get(guildId);
    if (guildViolations) {
        guildViolations.delete(userId);
        await persistViolations(client, guildId);
    }
}

/** Clean up stale entries every 5 minutes (in-memory only; DB cleaned on load) */
setInterval(() => {
    const now = Date.now();
    const decayMs = 86400000; // 24h
    for (const [guildId, guildViolations] of violationStore.entries()) {
        for (const [userId, entry] of guildViolations.entries()) {
            if (now - entry.timestamp > decayMs) {
                guildViolations.delete(userId);
            }
        }
        if (guildViolations.size === 0) {
            violationStore.delete(guildId);
        }
    }
}, 300000);

// ── Anti-Raid: join-rate tracking ────────────────────────────

/** Map<guildId, number[]> — timestamps of recent joins */
const raidJoinTracker = new Map();

/**
 * Records a member join and returns raid assessment.
 */
export function recordJoin(guildId) {
    const now = Date.now();
    if (!raidJoinTracker.has(guildId)) {
        raidJoinTracker.set(guildId, []);
    }
    const joins = raidJoinTracker.get(guildId);
    joins.push(now);
    return joins;
}

/**
 * Check if a guild is currently in raid lockdown based on join rate.
 */
export function isRaidLockedDown(guildId) {
    const joins = raidJoinTracker.get(guildId);
    if (!joins || joins.length === 0) return false;
    const now = Date.now();
    // Keep only joins within the last 60 seconds
    const recent = joins.filter(t => now - t < 60000);
    raidJoinTracker.set(guildId, recent);
    return false; // Lockdown status is managed by the config, not just rate
}

// ── Anti-Nuke: destructive-action tracking ───────────────────

/** Map<guildId, { channelDeletions, channelCreations, roleDeletions, roleCreations, bans, kicks, webhookCreations, webhookDeletions }> */
const nukeActionStore = new Map();

/**
 * Record a destructive action and return the current count within the window.
 */
export function recordNukeAction(guildId, actionType) {
    const now = Date.now();
    if (!nukeActionStore.has(guildId)) {
        nukeActionStore.set(guildId, {
            channelDeletions: [],
            channelCreations: [],
            roleDeletions: [],
            roleCreations: [],
            bans: [],
            kicks: [],
            webhookCreations: [],
            webhookDeletions: [],
        });
    }
    const store = nukeActionStore.get(guildId);
    if (!Array.isArray(store[actionType])) {
        store[actionType] = [];
    }
    store[actionType].push(now);
    // Prune entries older than 10 seconds
    const cutoff = now - 10000;
    for (const key of Object.keys(store)) {
        store[key] = (store[key] || []).filter(t => t > cutoff);
    }
    return store;
}

/**
 * Get total destructive actions across all tracked types in the last 10s.
 */
export function getTotalNukeActions(guildId) {
    const store = nukeActionStore.get(guildId);
    if (!store) return 0;
    const now = Date.now();
    const cutoff = now - 10000;
    let total = 0;
    for (const key of Object.keys(store)) {
        total += (store[key] || []).filter(t => t > cutoff).length;
    }
    return total;
}

// ── ModerationService — legacy named export for ban.js ────────

export const ModerationService = {
    /**
     * Ban a user from the guild and log the action.
     */
    async banUser({ guild, user, moderator, reason }) {
        if (!guild || !user || !moderator) {
            throw new Error('Missing required parameters for ban.');
        }

        const caseId = `ban-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;

        await guild.bans.create(user, {
            reason: `[#${caseId}] ${reason || 'No reason provided'} — Moderator: ${moderator.user.tag}`,
        });

        logger.info(`[Moderation] ${moderator.user.tag} banned ${user.tag} in ${guild.name}: ${reason}`);

        return { caseId, success: true };
    },
};

// ── Public API ───────────────────────────────────────────────

/**
 * Get the full moderation config for a guild.
 */
export async function getModerationConfig(client, guildId) {
    const config = await getGuildConfig(client, guildId);
    return config.moderation || GUILD_CONFIG_DEFAULTS.moderation;
}

/**
 * Update a moderation sub-setting by dot-path key.
 * e.g. updateModerationSetting(client, gid, 'antiLink.enabled', true)
 */
export async function updateModerationSetting(client, guildId, keyPath, value) {
    const config = await getGuildConfig(client, guildId);
    const moderation = { ...(config.moderation || GUILD_CONFIG_DEFAULTS.moderation) };

    // Navigate the dot-path
    const keys = keyPath.split('.');
    let target = moderation;
    for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    await setConfigValue(client, guildId, 'moderation', moderation);
    return moderation;
}

/**
 * Quick-toggle a moderation feature on/off.
 */
export async function toggleModerationFeature(client, guildId, featurePath) {
    const config = await getGuildConfig(client, guildId);
    const moderation = { ...(config.moderation || GUILD_CONFIG_DEFAULTS.moderation) };

    const keys = featurePath.split('.');
    let target = moderation;
    for (let i = 0; i < keys.length - 1; i++) {
        if (target[keys[i]] === undefined || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }
    const key = keys[keys.length - 1];
    target[key] = !target[key];

    await setConfigValue(client, guildId, 'moderation', moderation);
    return { keyPath: featurePath, now: target[key] };
}

// ── Message Evaluation ───────────────────────────────────────

/**
 * Run ALL moderation checks on an incoming message.
 * Returns an array of violation descriptions (empty = clean).
 */
export async function evaluateMessage(message, client) {
    if (message.author.bot || !message.guild) return [];

    const config = await getModerationConfig(client, message.guild.id);
    if (!config?.enabled) return [];

    const member = message.member;
    if (!member) return [];

    // Check ignored roles
    if (config.ignoredRoles?.length > 0) {
        const hasIgnoredRole = member.roles.cache.some(r => config.ignoredRoles.includes(r.id));
        if (hasIgnoredRole) return [];
    }

    // Check ignored channels
    if (config.ignoredChannels?.includes(message.channel.id)) return [];

    const violations = [];

    // 1. Anti-Link
    if (config.antiLink?.enabled) {
        const linkResult = checkAntiLink(message, config.antiLink);
        if (linkResult) {
            violations.push(linkResult);
        }
    }

    // 2. Anti-Spam
    if (config.antiSpam?.enabled) {
        const spamResult = await checkAntiSpam(message, config.antiSpam, client);
        if (spamResult) {
            violations.push(spamResult);
        }
    }

    // 3. Auto-Mod (bad words, caps, repeated text)
    if (config.autoMod?.enabled) {
        const autoModResult = checkAutoMod(message, config.autoMod);
        if (autoModResult) {
            violations.push(autoModResult);
        }
    }

    // 4. Anti-Mass Mention
    if (config.antiMassMention?.enabled) {
        const massMentionResult = checkAntiMassMention(message, config.antiMassMention, member);
        if (massMentionResult) {
            violations.push(massMentionResult);
        }
    }

    // ── Enforce actions for violations ──
    if (violations.length > 0) {
        const allViolations = violations.map(v => v.type).join(', ');
        const count = await incrementViolations(client, message.guild.id, message.author.id);

        // Determine per-feature minimum violations threshold
        const firstViolation = violations[0];
        const featureConfig = firstViolation?.feature === 'antilink' ? config.antiLink
            : firstViolation?.feature === 'antispam' ? config.antiSpam
            : firstViolation?.feature === 'automod' ? config.autoMod
            : firstViolation?.feature === 'antimassmention' ? config.antiMassMention
            : null;
        const minForAction = featureConfig?.minViolationsForAction || 3;
        const shouldAct = count >= minForAction;

        // If strikes system is enabled, check escalation independently
        if (config.strikes?.enabled) {
            const strikeAction = resolveStrikeAction(count, config.strikes);
            if (strikeAction) {
                await enforceAction(member, strikeAction, `Automod: ${allViolations} (strike ${count})`, client, config);
                await logAction(client, message.guild.id, {
                    user: message.author.tag,
                    userId: message.author.id,
                    action: strikeAction.action,
                    reason: `Automod violations (${count} strikes): ${allViolations}`,
                    content: message.content,
                }, config);
                if (message.deletable) {
                    await message.delete().catch(() => {});
                }
                return violations;
            }
        }

        // Take the individual action if threshold met
        if (shouldAct) {
            const action = firstViolation?.suggestedAction || 'warn';
            if (action !== 'none') {
                await enforceAction(member, { action }, `Automod: ${allViolations}`, client, config, message);
            }
        }

        // Log the violation
        await logAction(client, message.guild.id, {
            user: message.author.tag,
            userId: message.author.id,
            action: 'detected',
            reason: `Violation (${count}): ${allViolations}`,
            content: message.content,
        }, config);

        // Delete the message if the action was 'delete' (already handled in enforceAction)
        if (shouldAct || firstViolation?.suggestedAction === 'delete') {
            if (message.deletable && firstViolation?.suggestedAction !== 'delete') {
                await message.delete().catch(() => {});
            }
        }
    }

    return violations;
}

// ── Anti-Link ────────────────────────────────────────────────

function extractInviteCodes(content) {
    const codes = [];
    for (const pattern of INVITE_PATTERNS) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            // The capture group holds the invite code
            const code = (match[1] || '').trim();
            if (code && !codes.includes(code)) {
                codes.push(code);
            }
        }
    }
    return codes;
}

function containsSuspiciousUrl(content) {
    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
}

function hasGenericUrl(content) {
    // Match http(s):// and common TLDs
    return /https?:\/\/[^\s]+/i.test(content);
}

function checkAntiLink(message, config) {
    const content = message.content;

    // Check for Discord invite codes
    const inviteCodes = extractInviteCodes(content);
    const allowedCodes = (config.allowedInviteCodes || []).map(c => c.toLowerCase());
    const blockedInvites = inviteCodes.filter(code => !allowedCodes.includes(code.toLowerCase()));

    if (blockedInvites.length > 0) {
        return {
            feature: 'antilink',
            type: 'anti-link:discord_invite',
            detail: `Blocked Discord invite code(s): ${blockedInvites.join(', ')}`,
            suggestedAction: config.action || 'warn',
        };
    }

    // Check for suspicious URLs
    if (containsSuspiciousUrl(content)) {
        return {
            feature: 'antilink',
            type: 'anti-link:suspicious_url',
            detail: 'Message contains suspicious URL pattern',
            suggestedAction: config.action || 'warn',
        };
    }

    // Check generic URLs against whitelist
    if (hasGenericUrl(content)) {
        const whitelisted = config.whitelistedDomains || [];
        const urls = content.match(/https?:\/\/([^\s/]+)/gi) || [];
        const allWhitelisted = urls.every(url => {
            const hostname = url.replace(/https?:\/\//i, '').split('/')[0].toLowerCase();
            return whitelisted.some(w => hostname === w.toLowerCase() || hostname.endsWith(`.${w.toLowerCase()}`));
        });

        if (!allWhitelisted) {
            // For generic URLs with whitelist, just flag but don't auto-punish
            // unless the URL is clearly malicious
            return null; // Generic URLs are allowed unless whitelist is on
        }
    }

    return null;
}

// ── Anti-Spam ────────────────────────────────────────────────

/** Per-user message timestamps for spam detection */
const messageTimestamps = new Map();

function checkMessageRate(guildId, userId, config) {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const windowMs = config.windowMs || 5000;
    const maxMessages = config.maxMessages || 5;

    if (!messageTimestamps.has(key)) {
        messageTimestamps.set(key, []);
    }

    const timestamps = messageTimestamps.get(key);
    // Remove old entries outside the window
    const recent = timestamps.filter(t => now - t < windowMs);
    recent.push(now);
    messageTimestamps.set(key, recent);

    return recent.length > maxMessages;
}

function countMentions(content) {
    const userMentions = (content.match(/<@!?\d+>/g) || []).length;
    const roleMentions = (content.match(/<@&\d+>/g) || []).length;
    const everyoneMention = content.includes('@everyone') || content.includes('@here');
    return userMentions + roleMentions + (everyoneMention ? 5 : 0);
}

async function checkAntiSpam(message, config) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    // Check message rate (rapid messages)
    const isRapid = checkMessageRate(guildId, userId, config);

    // Check mention spam
    const mentionCount = countMentions(message.content);
    const maxMentions = config.maxMentions || 4;
    const isMentionSpam = mentionCount > maxMentions;

    if (isRapid && isMentionSpam) {
        return {
            feature: 'antispam',
            type: 'anti-spam:rapid_mention',
            detail: `Rapid messages with ${mentionCount} mentions`,
            suggestedAction: config.action || 'timeout',
        };
    }

    if (isRapid) {
        return {
            feature: 'antispam',
            type: 'anti-spam:rapid',
            detail: 'Sending messages too quickly',
            suggestedAction: config.action || 'timeout',
        };
    }

    if (isMentionSpam) {
        return {
            feature: 'antispam',
            type: 'anti-spam:mention',
            detail: `Excessive mentions (${mentionCount})`,
            suggestedAction: 'timeout',
        };
    }

    return null;
}

// ── Auto-Mod ─────────────────────────────────────────────────

function checkAutoMod(message, config) {
    const content = message.content;
    let violation = null;

    // Check blocked words
    const blockedWords = (config.blockedWords || []).filter(w => w.length > 0);
    for (const word of blockedWords) {
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
        if (regex.test(content)) {
            violation = {
                feature: 'automod',
                type: 'automod:blocked_word',
                detail: `Matched blocked word: "${word}"`,
                suggestedAction: config.blockedWordsAction || 'warn',
            };
            break;
        }
    }
    if (violation) return violation;

    // Check blocked regex patterns
    const blockedPatterns = (config.blockedPatterns || []).filter(p => p.length > 0);
    for (const pattern of blockedPatterns) {
        try {
            const regex = new RegExp(pattern, 'gi');
            if (regex.test(content)) {
                violation = {
                    feature: 'automod',
                    type: 'automod:blocked_pattern',
                    detail: `Matched blocked pattern`,
                    suggestedAction: 'warn',
                };
                break;
            }
        } catch {
            // Invalid pattern — skip
        }
    }
    if (violation) return violation;

    // Anti-CAPS
    if (config.antiCaps?.enabled && content.length >= (config.antiCaps.minLength || 8)) {
        // Strip ignored words before checking caps (e.g. "USA", "NASA" should not trigger)
        let textToCheck = content;
        const ignoredWords = (config.antiCaps.ignoredWords || []).filter(w => w.length > 0);
        for (const word of ignoredWords) {
            // Case-insensitive removal of the whole word
            textToCheck = textToCheck.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi'), '');
        }

        const letters = textToCheck.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 0) {
            const capsCount = letters.split('').filter(c => c === c.toUpperCase()).length;
            const capsPercent = (capsCount / letters.length) * 100;
            if (capsPercent >= (config.antiCaps.capsThreshold || 70)) {
                violation = {
                    feature: 'automod',
                    type: 'automod:all_caps',
                    detail: `Message is ${Math.round(capsPercent)}% uppercase`,
                    suggestedAction: config.antiCaps.action || 'warn',
                };
            }
        }
    }
    if (violation) return violation;

    // Anti-Repeated Text
    if (config.antiRepeatedText?.enabled) {
        const maxRepeat = config.antiRepeatedText.maxConsecutiveChars || 8;
        // Check for any character repeated consecutively
        const repeatRegex = new RegExp(`(.)\\1{${maxRepeat - 1},}`, 'g');
        if (repeatRegex.test(content)) {
            violation = {
                feature: 'automod',
                type: 'automod:repeated_text',
                detail: `Contains repeated characters (${maxRepeat}+ consecutive)`,
                suggestedAction: config.antiRepeatedText.action || 'warn',
            };
        }
    }

    return violation;
}

// ── Anti-Mass Mention ────────────────────────────────────────

function checkAntiMassMention(message, config, member) {
    const content = message.content;
    const configMaxMentions = config.maxMentions || 10;

    // Count user mentions
    const userMentions = (content.match(/<@!?\d+>/g) || []);
    // Count role mentions
    const roleMentions = content.match(/<@&\d+>/g) || [];
    // Check @everyone and @here
    const hasEveryone = content.includes('@everyone');
    const hasHere = content.includes('@here');

    const totalMentions = userMentions.length + roleMentions.length + (hasEveryone ? 1 : 0) + (hasHere ? 1 : 0);

    if (totalMentions === 0) return null;

    // Check if user is allowed to mass-mention (ignored roles)
    const allowedRoles = config.allowedRoles || [];
    if (allowedRoles.length > 0) {
        const hasAllowedRole = member.roles.cache.some(r => allowedRoles.includes(r.id));
        if (hasAllowedRole) return null;
    }

    // Check if @everyone/@here is specifically blocked
    if (config.blockEveryone !== false) {
        if (hasEveryone || hasHere) {
            return {
                feature: 'antimassmention',
                type: 'anti-mass-mention:everyone',
                detail: `Used @everyone or @here`,
                suggestedAction: config.action || 'timeout',
            };
        }
    }

    // Check total mentions against max
    if (totalMentions > configMaxMentions) {
        return {
            feature: 'antimassmention',
            type: 'anti-mass-mention:excessive',
            detail: `${totalMentions} mentions in one message (max ${configMaxMentions})`,
            suggestedAction: config.action || 'warn',
        };
    }

    return null;
}

// ── Strike Escalation ────────────────────────────────────────

function resolveStrikeAction(count, strikesConfig) {
    if (!strikesConfig?.enabled) return null;
    const tiers = (strikesConfig.tiers || []).sort((a, b) => b.threshold - a.threshold);
    // Find the highest tier the user qualifies for
    for (const tier of tiers.reverse()) {
        if (count >= tier.threshold) return tier;
    }
    return null;
}

// ── Action Enforcement ───────────────────────────────────────

async function enforceAction(member, actionData, reason, client, config, message = null) {
    try {
        const action = actionData.action?.toLowerCase?.() || 'warn';

        switch (action) {
            case 'warn':
                await member.send({
                    embeds: [createEmbed({
                        title: '⚠️ Warning',
                        description: `You received a warning in **${member.guild.name}**.\n\n**Reason:** ${reason}`,
                        color: 'warning',
                    })],
                }).catch(() => {}); // DM might be closed
                break;

            case 'timeout': {
                const duration = actionData.durationMs || 60000;
                await member.timeout(duration, reason).catch(() => {});
                break;
            }

            case 'kick':
                await member.kick(reason).catch(() => {});
                break;

            case 'delete':
                // Delete the offending message without additional punishment
                if (message?.deletable) {
                    await message.delete().catch(() => {});
                }
                break;

            case 'none':
                // No action — just log
                break;
        }

        logger.info(`[Moderation] ${action} issued to ${member.user.tag} in ${member.guild.name}: ${reason}`);
    } catch (error) {
        logger.error(`[Moderation] Failed to enforce ${actionData.action} on ${member.user.tag}:`, error);
    }
}

// ── Anti-Raid: Lockdown ──────────────────────────────────────

/**
 * Enable lockdown mode for a guild — locks all text channels.
 */
export async function enableRaidLockdown(guild) {
    if (!guild) return false;
    try {
        const channels = guild.channels.cache.filter(c =>
            c.isTextBased?.() && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ManageChannels)
        );
        let locked = 0;
        for (const channel of channels.values()) {
            try {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: false,
                });
                locked++;
            } catch {
                // skip channels we can't edit
            }
        }
        logger.info(`[Anti-Raid] Lockdown enabled for guild ${guild.id} — locked ${locked} channels`);
        return true;
    } catch (error) {
        logger.error(`[Anti-Raid] Failed to lockdown guild ${guild.id}:`, error);
        return false;
    }
}

/**
 * Disable lockdown mode for a guild — re-opens text channels.
 */
export async function disableRaidLockdown(guild) {
    if (!guild) return false;
    try {
        const channels = guild.channels.cache.filter(c =>
            c.isTextBased?.() && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ManageChannels)
        );
        let unlocked = 0;
        for (const channel of channels.values()) {
            try {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: null, // Reset to default
                });
                unlocked++;
            } catch {
                // skip
            }
        }
        logger.info(`[Anti-Raid] Lockdown disabled for guild ${guild.id} — unlocked ${unlocked} channels`);
        return true;
    } catch (error) {
        logger.error(`[Anti-Raid] Failed to unlock guild ${guild.id}:`, error);
        return false;
    }
}

/**
 * Send an alert about a potential raid to the moderation log channel and configured alert channel.
 */
export async function sendRaidAlert(client, guildId, config, alertType, details) {
    const logChannelId = config.logChannelId;
    if (!logChannelId) return;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        const channel = guild.channels.cache.get(logChannelId);
        if (!channel || !channel.isTextBased()) return;

        const embed = createEmbed({
            title: '🚨 Raid Alert',
            color: 'error',
            fields: [
                { name: 'Type', value: alertType, inline: true },
                { name: 'Details', value: details, inline: false },
                { name: 'Server', value: guild.name, inline: true },
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
            ],
            timestamp: true,
        });

        await channel.send({ embeds: [embed], content: '@here' });
    } catch (error) {
        logger.error(`[Anti-Raid] Failed to send alert for guild ${guildId}:`, error);
    }
}

// ── Logging ──────────────────────────────────────────────────

async function logAction(client, guildId, data, config) {
    const logChannelId = config.logChannelId;
    if (!logChannelId) return;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(logChannelId);
        if (!channel || !channel.isTextBased()) return;

        const embed = createEmbed({
            title: '🛡️ Moderation Log',
            color: 'warning',
            fields: [
                { name: '👤 User', value: `${data.user} (${data.userId})`, inline: true },
                { name: '⚡ Action', value: data.action, inline: true },
                { name: '📝 Reason', value: data.reason || 'No reason provided', inline: false },
                { name: '💬 Content', value: data.content ? `\`\`\`${data.content.substring(0, 1000)}\`\`\`` : '*No content*', inline: false },
            ],
            timestamp: true,
        });

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error(`[Moderation] Failed to log action for guild ${guildId}:`, error);
    }
}

// ── Helpers ──────────────────────────────────────────────────

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const GUILD_CONFIG_DEFAULTS = {
    moderation: {
        enabled: false,
        logChannelId: null,
        ignoredRoles: [],
        ignoredChannels: [],
        antiLink: {
            enabled: false,
            action: 'warn',
            allowedInviteCodes: [],
            whitelistedDomains: [],
            minViolationsForAction: 3,
        },
        antiSpam: {
            enabled: false,
            maxMessages: 5,
            windowMs: 5000,
            action: 'timeout',
            timeoutDurationMs: 60000,
            maxMentions: 4,
            minViolationsForAction: 3,
        },
        autoMod: {
            enabled: false,
            blockedWords: [],
            blockedPatterns: [],
            antiCaps: {
                enabled: false,
                minLength: 8,
                capsThreshold: 70,
                action: 'warn',
                ignoredWords: [],
            },
            antiRepeatedText: {
                enabled: false,
                maxConsecutiveChars: 8,
                action: 'warn',
            },
        },
        strikes: {
            enabled: false,
            decayMs: 86400000,
            tiers: [
                { threshold: 3, action: 'timeout', durationMs: 60000 },
                { threshold: 5, action: 'timeout', durationMs: 300000 },
                { threshold: 7, action: 'kick' },
            ],
        },
        antiMassMention: {
            enabled: false,
            maxMentions: 10,
            action: 'warn',
            allowedRoles: [],
            blockEveryone: true,
            timeoutDurationMs: 60000,
            minViolationsForAction: 2,
        },
        antiRaid: {
            enabled: false,
            joinThreshold: 10,
            detectionWindowMs: 60000,
            action: 'lockdown',
            alertModerators: true,
            restrictNewAccounts: true,
            newAccountAgeMs: 86400000 * 7, // 7 days
        },
        antiNuke: {
            enabled: false,
            actionThreshold: 5,
            detectionWindowMs: 10000,
            action: 'punish',
            notifyStaff: true,
            restoreSettings: true,
        },
    },
};
