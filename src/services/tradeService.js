// tradeService.js
// Handles peer-to-peer trading with double confirmation.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { logTransaction } from './transactionService.js';
import { BotConfig } from '../config/bot.js';

const TRADE_PREFIX = 'trades';
const TRADE_CONFIG = BotConfig.economy?.trade || {};
const CONFIRM_TIMEOUT = TRADE_CONFIG.confirmTimeoutMs || 120000;

/**
 * Create a new trade request.
 */
export async function createTrade(client, guildId, senderId, receiverId, offer) {
    const trade = {
        id: `trade_${Date.now()}_${senderId.slice(-4)}`,
        senderId,
        receiverId,
        guildId,
        offer: {
            items: offer.items || {},
            currency: Math.max(0, offer.currency || 0),
        },
        request: {
            items: offer.requestItems || {},
            currency: Math.max(0, offer.requestCurrency || 0),
        },
        status: 'pending',
        senderConfirmed: false,
        receiverConfirmed: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + CONFIRM_TIMEOUT,
    };

    // Validate sender has enough currency
    if (trade.offer.currency > 0) {
        const senderData = await getEconomyData(client, guildId, senderId);
        if ((senderData.wallet || 0) < trade.offer.currency) {
            throw createError('Insufficient funds', ErrorTypes.VALIDATION,
                `You don't have enough cash to offer ${trade.offer.currency} coins.`,
                { senderId, required: trade.offer.currency });
        }
    }

    // Validate sender has the items
    for (const [itemId, qty] of Object.entries(trade.offer.items)) {
        const senderData = await getEconomyData(client, guildId, senderId);
        const owned = (senderData.inventory || {})[itemId] || 0;
        if (owned < qty) {
            throw createError('Insufficient items', ErrorTypes.VALIDATION,
                `You don't have enough of item ${itemId}. You own ${owned}, need ${qty}.`,
                { senderId, itemId, owned, required: qty });
        }
    }

    // Save trade
    const key = `${TRADE_PREFIX}:${guildId}:${trade.id}`;
    await client.db.set(key, trade);

    logger.info(`[TRADE] Created trade ${trade.id} from ${senderId} to ${receiverId}`);
    return trade;
}

/**
 * Get a trade by ID.
 */
export async function getTrade(client, guildId, tradeId) {
    const key = `${TRADE_PREFIX}:${guildId}:${tradeId}`;
    const trade = await client.db.get(key, null);
    return trade;
}

/**
 * Accept a trade — both users must confirm.
 */
export async function confirmTrade(client, guildId, tradeId, userId) {
    const key = `${TRADE_PREFIX}:${guildId}:${tradeId}`;
    const trade = await client.db.get(key, null);

    if (!trade) {
        throw createError('Trade not found', ErrorTypes.VALIDATION,
            'This trade no longer exists or has expired.',
            { tradeId });
    }

    if (trade.status !== 'pending') {
        throw createError('Trade not pending', ErrorTypes.VALIDATION,
            `This trade has already been ${trade.status}.`,
            { tradeId, status: trade.status });
    }

    if (Date.now() > trade.expiresAt) {
        trade.status = 'expired';
        await client.db.set(key, trade);
        throw createError('Trade expired', ErrorTypes.VALIDATION,
            'This trade request has expired.',
            { tradeId });
    }

    if (userId === trade.senderId) {
        trade.senderConfirmed = true;
    } else if (userId === trade.receiverId) {
        trade.receiverConfirmed = true;
    } else {
        throw createError('Not a participant', ErrorTypes.PERMISSION,
            'You are not part of this trade.',
            { tradeId, userId });
    }

    await client.db.set(key, trade);

    if (trade.senderConfirmed && trade.receiverConfirmed) {
        return await executeTrade(client, guildId, trade);
    }

    return { trade, completed: false, message: 'Waiting for the other user to confirm...' };
}

/**
 * Cancel a trade.
 */
export async function cancelTrade(client, guildId, tradeId, userId) {
    const key = `${TRADE_PREFIX}:${guildId}:${tradeId}`;
    const trade = await client.db.get(key, null);

    if (!trade) {
        throw createError('Trade not found', ErrorTypes.VALIDATION,
            'This trade no longer exists.',
            { tradeId });
    }

    if (userId !== trade.senderId && userId !== trade.receiverId) {
        throw createError('Not a participant', ErrorTypes.PERMISSION,
            'You are not part of this trade.',
            { tradeId, userId });
    }

    trade.status = 'cancelled';
    await client.db.set(key, trade);

    logger.info(`[TRADE] Trade ${tradeId} cancelled by ${userId}`);
    return { trade, completed: false, message: 'Trade cancelled.' };
}

/**
 * Decline a trade.
 */
export async function declineTrade(client, guildId, tradeId, userId) {
    const key = `${TRADE_PREFIX}:${guildId}:${tradeId}`;
    const trade = await client.db.get(key, null);

    if (!trade) {
        throw createError('Trade not found', ErrorTypes.VALIDATION,
            'This trade no longer exists.',
            { tradeId });
    }

    if (userId !== trade.receiverId) {
        throw createError('Cannot decline', ErrorTypes.PERMISSION,
            'Only the receiver can decline this trade.',
            { tradeId, userId });
    }

    trade.status = 'declined';
    await client.db.set(key, trade);

    logger.info(`[TRADE] Trade ${tradeId} declined by ${userId}`);
    return { trade, completed: false, message: 'Trade declined.' };
}

/**
 * Execute the trade atomically.
 */
async function executeTrade(client, guildId, trade) {
    const senderData = await getEconomyData(client, guildId, trade.senderId);
    const receiverData = await getEconomyData(client, guildId, trade.receiverId);

    // Validate sender still has funds
    if (trade.offer.currency > 0 && (senderData.wallet || 0) < trade.offer.currency) {
        trade.status = 'failed';
        await client.db.set(`${TRADE_PREFIX}:${guildId}:${trade.id}`, trade);
        throw createError('Trade failed', ErrorTypes.VALIDATION,
            `${trade.senderId} no longer has enough funds. Trade cancelled.`,
            { tradeId: trade.id });
    }

    // Validate receiver still has requested funds
    if (trade.request.currency > 0 && (receiverData.wallet || 0) < trade.request.currency) {
        trade.status = 'failed';
        await client.db.set(`${TRADE_PREFIX}:${guildId}:${trade.id}`, trade);
        throw createError('Trade failed', ErrorTypes.VALIDATION,
            `${trade.receiverId} no longer has enough funds. Trade cancelled.`,
            { tradeId: trade.id });
    }

    // Execute currency exchange
    if (trade.offer.currency > 0) {
        senderData.wallet = (senderData.wallet || 0) - trade.offer.currency;
        receiverData.wallet = (receiverData.wallet || 0) + trade.offer.currency;
    }
    if (trade.request.currency > 0) {
        receiverData.wallet = (receiverData.wallet || 0) - trade.request.currency;
        senderData.wallet = (senderData.wallet || 0) + trade.request.currency;
    }

    // Execute item exchange
    senderData.inventory = senderData.inventory || {};
    receiverData.inventory = receiverData.inventory || {};

    for (const [itemId, qty] of Object.entries(trade.offer.items)) {
        senderData.inventory[itemId] = (senderData.inventory[itemId] || 0) - qty;
        receiverData.inventory[itemId] = (receiverData.inventory[itemId] || 0) + qty;
    }
    for (const [itemId, qty] of Object.entries(trade.request.items)) {
        senderData.inventory[itemId] = (senderData.inventory[itemId] || 0) + qty;
        receiverData.inventory[itemId] = (receiverData.inventory[itemId] || 0) - qty;
    }

    // Cleanup zero-quantity items
    for (const inv of [senderData.inventory, receiverData.inventory]) {
        for (const [id, qty] of Object.entries(inv)) {
            if (qty <= 0) delete inv[id];
        }
    }

    // Update trade stats
    senderData.totalTrades = (senderData.totalTrades || 0) + 1;
    receiverData.totalTrades = (receiverData.totalTrades || 0) + 1;

    // Save both
    await setEconomyData(client, guildId, trade.senderId, senderData);
    await setEconomyData(client, guildId, trade.receiverId, receiverData);

    // Log transactions
    const totalCurrency = trade.offer.currency + trade.request.currency;
    if (totalCurrency > 0) {
        await logTransaction(client, guildId, trade.senderId, {
            amount: trade.request.currency - trade.offer.currency,
            type: 'TRANSFER', source: 'trade',
            description: `Trade with <@${trade.receiverId}>`,
            metadata: { tradeId: trade.id, counterparty: trade.receiverId },
        });
        await logTransaction(client, guildId, trade.receiverId, {
            amount: trade.offer.currency - trade.request.currency,
            type: 'TRANSFER', source: 'trade',
            description: `Trade with <@${trade.senderId}>`,
            metadata: { tradeId: trade.id, counterparty: trade.senderId },
        });
    }

    // Mark completed
    trade.status = 'completed';
    await client.db.set(`${TRADE_PREFIX}:${guildId}:${trade.id}`, trade);

    logger.info(`[TRADE] Trade ${trade.id} completed successfully`);

    return { trade, completed: true, message: 'Trade completed successfully!' };
}

/**
 * Clean up expired trades.
 */
export async function cleanupExpiredTrades(client, guildId) {
    try {
        const allKeys = await client.db.list(`${TRADE_PREFIX}:${guildId}:`) || [];
        const now = Date.now();
        let cleaned = 0;

        for (const key of allKeys) {
            const trade = await client.db.get(key, null);
            if (trade && trade.status === 'pending' && now > trade.expiresAt) {
                trade.status = 'expired';
                await client.db.set(key, trade);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[TRADE] Cleaned up ${cleaned} expired trades in guild ${guildId}`);
        }
        return cleaned;
    } catch (error) {
        logger.error(`[TRADE] Cleanup error in guild ${guildId}:`, error);
        return 0;
    }
}
