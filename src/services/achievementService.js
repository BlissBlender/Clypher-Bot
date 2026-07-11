// achievementService.js
// Achievement system with categories, progress tracking, and rewards.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { BotConfig } from '../config/bot.js';

const ACHIEVEMENT_CONFIG = BotConfig.economy?.achievements || {};

/**
 * Get all achievement definitions grouped by category.
 */
export function getAllAchievements() {
    const all = [];
    for (const [category, achievements] of Object.entries(ACHIEVEMENT_CONFIG)) {
        if (Array.isArray(achievements)) {
            for (const ach of achievements) {
                all.push({ ...ach, category });
            }
        }
    }
    return all;
}

/**
 * Get achievement by ID.
 */
export function getAchievementById(achievementId) {
    return getAllAchievements().find(a => a.id === achievementId);
}

/**
 * Get a user's unlocked achievements.
 */
export async function getUserAchievements(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const unlocked = Array.isArray(userData.achievements) ? userData.achievements : [];
    const allAch = getAllAchievements();

    return allAch.map(ach => {
        const userAch = unlocked.find(u => u.id === ach.id);
        return {
            ...ach,
            unlocked: !!userAch,
            unlockedAt: userAch?.unlockedAt || null,
            rewarded: userAch?.rewarded || false,
            progress: userAch?.progress || 0,
        };
    });
}

/**
 * Check and unlock achievements for a user based on their data.
 */
export async function checkAchievements(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const unlocked = Array.isArray(userData.achievements) ? userData.achievements : [];
    const allAch = getAllAchievements();
    const newlyUnlocked = [];

    const wallet = userData.wallet || 0;
    const bank = userData.bank || 0;
    const netWorth = wallet + bank + ((userData.properties || []).reduce((s, p) => s + (p.value || 0), 0));
    const dailyStreak = userData.dailyStreak || 0;
    const totalTransactions = userData.totalTransactions || 0;
    const totalTrades = userData.totalTrades || 0;
    const propertyCount = (userData.properties || []).length;
    const pets = Array.isArray(userData.pets) ? userData.pets : [];
    const maxPetLevel = pets.reduce((max, p) => Math.max(max, p.level || 0), 0);
    const purchasedCount = userData.totalSpent > 0 ? 1 : 0; // basic check

    for (const ach of allAch) {
        if (unlocked.some(u => u.id === ach.id)) continue;

        let shouldUnlock = false;
        let progress = 0;

        switch (ach.category) {
            case 'wealth': {
                progress = netWorth;
                shouldUnlock = netWorth >= ach.threshold;
                break;
            }
            case 'activity': {
                if (ach.id.startsWith('daily_')) {
                    progress = dailyStreak;
                    shouldUnlock = dailyStreak >= ach.threshold;
                } else if (ach.id.startsWith('transactions_')) {
                    progress = totalTransactions;
                    shouldUnlock = totalTransactions >= ach.threshold;
                } else if (ach.id.startsWith('trades_')) {
                    progress = totalTrades;
                    shouldUnlock = totalTrades >= ach.threshold;
                }
                break;
            }
            case 'economy': {
                if (ach.id === 'first_purchase') {
                    progress = purchasedCount;
                    shouldUnlock = purchasedCount >= ach.threshold;
                } else if (ach.id === 'first_property') {
                    progress = propertyCount;
                    shouldUnlock = propertyCount >= ach.threshold;
                } else if (ach.id === 'first_pet') {
                    progress = pets.length;
                    shouldUnlock = pets.length >= ach.threshold;
                } else if (ach.id === 'first_trade') {
                    progress = totalTrades;
                    shouldUnlock = totalTrades >= ach.threshold;
                } else if (ach.id === 'property_owner_3') {
                    progress = propertyCount;
                    shouldUnlock = propertyCount >= ach.threshold;
                } else if (ach.id === 'pet_max_level') {
                    progress = maxPetLevel;
                    shouldUnlock = maxPetLevel >= MAX_PET_LEVEL;
                }
                break;
            }
        }

        if (shouldUnlock) {
            const userAch = { id: ach.id, unlockedAt: Date.now(), rewarded: false, progress };
            unlocked.push(userAch);
            newlyUnlocked.push({ ...ach, ...userAch });
        } else {
            // Update progress
            const existing = unlocked.find(u => u.id === ach.id);
            if (existing) {
                existing.progress = Math.max(existing.progress || 0, progress);
            } else {
                unlocked.push({ id: ach.id, unlockedAt: 0, rewarded: false, progress });
            }
        }
    }

    if (newlyUnlocked.length > 0) {
        userData.achievements = unlocked;
        userData.achievementPoints = (userData.achievementPoints || 0) + newlyUnlocked.length * 10;
        await setEconomyData(client, guildId, userId, userData);
    }

    return newlyUnlocked;
}

const MAX_PET_LEVEL = BotConfig.economy?.pets?.maxLevel || 20;

/**
 * Claim a reward for an achievement.
 */
export async function claimAchievementReward(client, guildId, userId, achievementId) {
    const userData = await getEconomyData(client, guildId, userId);
    const unlocked = Array.isArray(userData.achievements) ? userData.achievements : [];
    const userAch = unlocked.find(u => u.id === achievementId);

    if (!userAch) {
        throw createError('Not unlocked', ErrorTypes.VALIDATION,
            'You haven\'t unlocked this achievement yet.',
            { achievementId });
    }

    if (userAch.rewarded) {
        throw createError('Already claimed', ErrorTypes.VALIDATION,
            'You have already claimed the reward for this achievement.',
            { achievementId });
    }

    const achDef = getAchievementById(achievementId);
    if (!achDef) {
        throw createError('Not found', ErrorTypes.VALIDATION,
            'This achievement no longer exists.',
            { achievementId });
    }

    // Grant reward
    const reward = achDef.reward || 0;
    userData.wallet = (userData.wallet || 0) + reward;
    userAch.rewarded = true;

    await setEconomyData(client, guildId, userId, userData);

    const { logTransaction } = await import('./transactionService.js');
    await logTransaction(client, guildId, userId, {
        amount: reward, type: 'INCOME', source: 'achievement',
        description: `Reward for achievement: ${achDef.name}`,
        metadata: { achievementId, category: achDef.category },
    });

    logger.info(`[ACHIEVEMENT] ${userId} claimed reward for ${achievementId}: ${reward}`);
    return { achievement: achDef, reward };
}

/**
 * Calculate total achievement points for a user.
 */
export function calculateAchievementPoints(achievements = []) {
    return achievements.filter(a => a.unlockedAt > 0).length * 10;
}
