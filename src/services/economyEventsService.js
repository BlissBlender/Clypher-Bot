// economyEventsService.js
// Random economy events — treasure hunts, market boom/crash, bonus weekends.

import { logger } from '../utils/logger.js';
import { BotConfig } from '../config/bot.js';
import { createEmbed } from '../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { logTransaction } from './transactionService.js';

const EVENT_CONFIG = BotConfig.economy?.events || {};
const CHECK_INTERVAL = EVENT_CONFIG.checkIntervalMs || 600000;
const EVENT_TYPES = EVENT_CONFIG.types || {};

// ── Database persistence ─────────────────────────────────
function getEventsKey(guildId) {
    // Note: uses underscore format to avoid parseKey conflict with economy user keys
    // parseKey would interpret 'guild:{id}:economy:events' as type 'economy' with userId='events'
    return `guild:${guildId}:economy_events`;
}

async function persistEvents(client, guildId) {
    try {
        const events = activeEvents.get(guildId) || [];
        if (events.length === 0) {
            await client.db.delete(getEventsKey(guildId)).catch(() => {});
        } else {
            await client.db.set(getEventsKey(guildId), events);
        }
    } catch (error) {
        logger.error(`[EVENTS] Failed to persist events for guild ${guildId}:`, error);
    }
}

async function loadEvents(client, guildId) {
    try {
        const stored = await client.db.get(getEventsKey(guildId));
        if (!stored || !Array.isArray(stored) || stored.length === 0) return;

        const now = Date.now();
        const valid = stored.filter(e => now - e.startedAt < e.durationMs);

        if (valid.length > 0) {
            activeEvents.set(guildId, valid);
            // Re-set expiry timers for restored events
            for (const event of valid) {
                const remaining = event.durationMs - (now - event.startedAt);
                if (remaining > 0) {
                    setTimeout(() => {
                        const guildEvents = activeEvents.get(guildId) || [];
                        activeEvents.set(guildId, guildEvents.filter(e => e.id !== event.id));
                        persistEvents(client, guildId);
                        logger.debug(`[EVENTS] Event ${event.id} expired in guild ${guildId}`);
                    }, remaining);
                }
            }
        } else {
            // All stored events expired, clean up
            await client.db.delete(getEventsKey(guildId)).catch(() => {});
        }
    } catch (error) {
        logger.error(`[EVENTS] Failed to load events for guild ${guildId}:`, error);
    }
}

// In-memory active events per guild (backed by database)
const activeEvents = new Map();

/**
 * Get currently active events for a guild.
 */
export function getActiveGuildEvents(guildId) {
    return activeEvents.get(guildId) || [];
}

/**
 * Check and trigger a random event for a guild.
 */
export async function checkAndTriggerEvent(client, guildId) {
    if (!EVENT_CONFIG.enabled) return null;

    // Lazy-load events from DB if not in memory
    if (!activeEvents.has(guildId)) {
        await loadEvents(client, guildId);
    }

    const currentEvents = activeEvents.get(guildId) || [];
    if (currentEvents.length > 0) return null; // Don't stack events

    for (const [eventId, eventData] of Object.entries(EVENT_TYPES)) {
        if (Math.random() < (eventData.chance || 0)) {
            return await triggerEvent(client, guildId, eventId);
        }
    }

    return null;
}

/**
 * Trigger a specific economy event.
 */
export async function triggerEvent(client, guildId, eventId) {
    const eventData = EVENT_TYPES[eventId];
    if (!eventData) return null;

    const event = {
        id: `${eventId}_${Date.now()}`,
        type: eventId,
        name: eventData.name,
        emoji: eventData.emoji || '🎯',
        startedAt: Date.now(),
        durationMs: 3600000, // 1 hour
        multiplier: eventData.multiplier || 1,
        minReward: eventData.minReward,
        maxReward: eventData.maxReward,
    };

    activeEvents.set(guildId, [...(activeEvents.get(guildId) || []), event]);

    // Persist to database immediately
    await persistEvents(client, guildId);

    // Auto-expire after duration
    setTimeout(() => {
        const guildEvents = activeEvents.get(guildId) || [];
        activeEvents.set(guildId, guildEvents.filter(e => e.id !== event.id));
        persistEvents(client, guildId);
        logger.debug(`[EVENTS] Event ${event.id} expired in guild ${guildId}`);
    }, event.durationMs);

    logger.info(`[EVENTS] Triggered ${event.type} in guild ${guildId}`);
    return event;
}

/**
 * Handle a treasure event — user discovers a reward.
 */
export async function handleTreasureDiscovery(client, guildId, userId) {
    const events = activeEvents.get(guildId) || [];
    const treasure = events.find(e => e.type === 'treasure');
    if (!treasure) return null;

    const reward = Math.floor(
        Math.random() * ((treasure.maxReward || 50000) - (treasure.minReward || 5000) + 1)
    ) + (treasure.minReward || 5000);

    const userData = await getEconomyData(client, guildId, userId);
    userData.wallet = (userData.wallet || 0) + reward;
    await setEconomyData(client, guildId, userId, userData);

    await logTransaction(client, guildId, userId, {
        amount: reward, type: 'INCOME', source: 'treasure_event',
        description: 'Discovered treasure during a Treasure Hunt event!',
        metadata: { eventId: treasure.id },
    });

    return { reward, event: treasure };
}

/**
 * Get active price multipliers for marketplace/shop due to events.
 */
export function getEventMultipliers(guildId) {
    const events = activeEvents.get(guildId) || [];
    const multipliers = { shop: 1.0, earnings: 1.0 };

    for (const event of events) {
        if (event.type === 'boom') {
            multipliers.shop = event.multiplier || 0.8; // Shop prices reduced
        } else if (event.type === 'crash') {
            multipliers.shop = event.multiplier || 1.5; // Shop prices increased
        } else if (event.type === 'bonus') {
            multipliers.earnings = event.multiplier || 2.0; // Double earnings
        }
    }

    return multipliers;
}

/**
 * Create an embed for an active event announcement.
 */
export function createEventEmbed(event, guild) {
    const descriptions = {
        treasure: '🧭 **Treasure Hunt is active!**\nUsers can randomly discover coins when using economy commands!',
        boom: '📈 **Market Boom!**\nShop prices are reduced! Buy items at a discount!',
        crash: '📉 **Market Crash!**\nShop prices are inflated! Sell items for more profit!',
        bonus: '🎉 **Bonus Weekend!**\nAll earnings are doubled! Work, fish, mine, and more!',
    };

    return createEmbed({
        title: `${event.emoji} ${event.name}`,
        description: descriptions[event.type] || 'A mysterious economy event is active!',
        color: 'rare',
        footer: `Active for 1 hour in ${guild?.name || 'this server'}`,
    });
}
