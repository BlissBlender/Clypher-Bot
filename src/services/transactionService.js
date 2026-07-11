// transactionService.js
// Logs every economy action (earnings, purchases, transfers, etc.) with search and stats.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { addMoney, removeMoney } from '../utils/economy.js';

const TX_PREFIX = 'transactions';
const MAX_TRANSACTIONS_PER_USER = 500;

/**
 * Generate a unique transaction ID.
 */
function generateTxId(userId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `tx_${timestamp}_${random}_${userId.slice(-4)}`;
}

/**
 * Log a transaction for a user.
 *
 * @param {object} client - Discord client with db access
 * @param {string} guildId
 * @param {string} userId
 * @param {object} data
 * @param {number} data.amount - Positive for income, negative for expense
 * @param {'INCOME'|'EXPENSE'|'TRANSFER'} data.type
 * @param {string} data.source - e.g. 'daily', 'work', 'shop', 'trade', 'gamble', 'crime', 'fish', 'mine', 'rob', 'beg'
 * @param {string} [data.description] - Optional description of the transaction
 * @param {object} [data.metadata] - Additional metadata
 * @returns {Promise<object>} The transaction record
 */
export async function logTransaction(client, guildId, userId, data) {
    try {
        const tx = {
            id: generateTxId(userId),
            userId,
            guildId,
            amount: data.amount,
            type: data.type || (data.amount >= 0 ? 'INCOME' : 'EXPENSE'),
            source: data.source || 'unknown',
            description: data.description || '',
            balance: data.balance || null,
            metadata: data.metadata || {},
            timestamp: Date.now(),
            date: new Date().toISOString(),
        };

        const key = `${TX_PREFIX}:${guildId}:${userId}`;
        const existing = await client.db.get(key, []);
        const txs = Array.isArray(existing) ? existing : [];

        txs.unshift(tx);

        // Trim to max
        if (txs.length > MAX_TRANSACTIONS_PER_USER) {
            txs.length = MAX_TRANSACTIONS_PER_USER;
        }

        await client.db.set(key, txs);

        logger.debug(`[TX] Logged ${data.source} transaction for ${userId}: ${data.amount > 0 ? '+' : ''}${data.amount}`);

        return tx;
    } catch (error) {
        logger.error(`[TX] Failed to log transaction for ${userId}:`, error);
        return null;
    }
}

/**
 * Get recent transactions for a user.
 */
export async function getTransactions(client, guildId, userId, limit = 10) {
    try {
        const key = `${TX_PREFIX}:${guildId}:${userId}`;
        const existing = await client.db.get(key, []);
        const txs = Array.isArray(existing) ? existing : [];
        return txs.slice(0, limit);
    } catch (error) {
        logger.error(`[TX] Failed to get transactions for ${userId}:`, error);
        return [];
    }
}

/**
 * Search transactions by source, type, or description.
 */
export async function searchTransactions(client, guildId, userId, filters = {}) {
    try {
        const key = `${TX_PREFIX}:${guildId}:${userId}`;
        const existing = await client.db.get(key, []);
        let txs = Array.isArray(existing) ? existing : [];

        if (filters.source) {
            txs = txs.filter(tx => tx.source?.toLowerCase() === filters.source.toLowerCase());
        }
        if (filters.type) {
            txs = txs.filter(tx => tx.type === filters.type);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            txs = txs.filter(tx =>
                (tx.description || '').toLowerCase().includes(q) ||
                (tx.source || '').toLowerCase().includes(q)
            );
        }
        if (filters.limit) {
            txs = txs.slice(0, filters.limit);
        }

        return txs;
    } catch (error) {
        logger.error(`[TX] Failed to search transactions for ${userId}:`, error);
        return [];
    }
}

/**
 * Get transaction stats for a user.
 */
export async function getTransactionStats(client, guildId, userId) {
    try {
        const key = `${TX_PREFIX}:${guildId}:${userId}`;
        const existing = await client.db.get(key, []);
        const txs = Array.isArray(existing) ? existing : [];

        const stats = {
            total: txs.length,
            totalIncome: 0,
            totalExpense: 0,
            totalTransfers: 0,
            incomeCount: 0,
            expenseCount: 0,
            transferCount: 0,
            bySource: {},
            biggestIncome: { amount: 0, source: '' },
            biggestExpense: { amount: 0, source: '' },
        };

        for (const tx of txs) {
            if (tx.type === 'INCOME') {
                stats.totalIncome += tx.amount;
                stats.incomeCount++;
                if (tx.amount > stats.biggestIncome.amount) {
                    stats.biggestIncome = { amount: tx.amount, source: tx.source };
                }
            } else if (tx.type === 'EXPENSE') {
                stats.totalExpense += Math.abs(tx.amount);
                stats.expenseCount++;
                if (Math.abs(tx.amount) > stats.biggestExpense.amount) {
                    stats.biggestExpense = { amount: Math.abs(tx.amount), source: tx.source };
                }
            } else if (tx.type === 'TRANSFER') {
                stats.transferCount++;
                stats.totalTransfers += Math.abs(tx.amount);
            }

            stats.bySource[tx.source] = (stats.bySource[tx.source] || 0) + 1;
        }

        return stats;
    } catch (error) {
        logger.error(`[TX] Failed to get transaction stats for ${userId}:`, error);
        return {
            total: 0, totalIncome: 0, totalExpense: 0, totalTransfers: 0,
            incomeCount: 0, expenseCount: 0, transferCount: 0,
            bySource: {}, biggestIncome: { amount: 0 }, biggestExpense: { amount: 0 },
        };
    }
}

/**
 * Wrapper to add money AND log a transaction atomically.
 */
export async function addMoneyWithLog(client, guildId, userId, amount, source, description = '', metadata = {}) {
    const result = await addMoney(client, guildId, userId, amount, 'wallet');
    if (result.success) {
        await logTransaction(client, guildId, userId, {
            amount,
            type: 'INCOME',
            source,
            description,
            balance: result.newBalance,
            metadata,
        });
    }
    return result;
}

/**
 * Wrapper to remove money AND log a transaction atomically.
 */
export async function removeMoneyWithLog(client, guildId, userId, amount, source, description = '', metadata = {}) {
    const result = await removeMoney(client, guildId, userId, amount, 'wallet');
    if (result.success) {
        await logTransaction(client, guildId, userId, {
            amount: -amount,
            type: 'EXPENSE',
            source,
            description,
            balance: result.newBalance,
            metadata,
        });
    }
    return result;
}
