import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { formatDuration } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logTransaction } from '../../services/transactionService.js';
import { checkAchievements } from '../../services/achievementService.js';

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily cash reward'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            logger.debug(`[ECONOMY] Daily claimed started for ${userId}`, { userId, guildId });

            const userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Failed to load economy data for daily",
                    ErrorTypes.DATABASE,
                    "Failed to load your economy data. Please try again later.",
                    { userId, guildId }
                );
            }
            
            const lastDaily = userData.lastDaily || 0;

            if (now < lastDaily + botConfig.economy.cooldowns.daily) {
                const timeRemaining = lastDaily + botConfig.economy.cooldowns.daily - now;
                throw createError(
                    "Daily cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `You need to wait before claiming daily again. Try again in **${formatDuration(timeRemaining)}**.`,
                    { timeRemaining, cooldownType: 'daily' }
                );
            }

            const guildConfig = await getGuildConfig(client, guildId);
            const PREMIUM_ROLE_ID = guildConfig.premiumRoleId;

            let earned = botConfig.economy.dailyAmount;
            let bonusMessage = "";
            let hasPremiumRole = false;

            if (
                PREMIUM_ROLE_ID &&
                interaction.member &&
                interaction.member.roles.cache.has(PREMIUM_ROLE_ID)
            ) {
                const bonusAmount = Math.floor(
                    botConfig.economy.dailyAmount * botConfig.economy.dailyPremiumBonus,
                );
                earned += bonusAmount;
                bonusMessage = `\n✨ **Premium Bonus:** +$${bonusAmount.toLocaleString()}`;
                hasPremiumRole = true;
            }

            // ── Streak tracking ──
            const lastDailyDate = new Date(userData.lastDaily || 0);
            const nowDate = new Date(now);
            const daysSinceLastClaim = Math.floor((now - (userData.lastDaily || 0)) / 86400000);

            let streak = userData.dailyStreak || 0;
            if (daysSinceLastClaim <= 1 && userData.lastDaily > 0) {
                // Within 1 day — continue streak
                streak += 1;
            } else if (daysSinceLastClaim > 1) {
                // Missed a day — reset
                streak = 1;
            } else {
                // First claim ever
                streak = 1;
            }

            // Streak bonus
            const streakBonusPerDay = botConfig.economy?.streaks?.streakBonusPerDay || 50;
            const streakBonus = streak * streakBonusPerDay;
            earned += streakBonus;

            // Update highest streak
            if (streak > (userData.highestStreak || 0)) {
                userData.highestStreak = streak;
            }

            // ── Milestone rewards ──
            let milestoneReward = '';
            const milestones = botConfig.economy?.streaks || {};
            if (streak === 7 && milestones.milestone7) {
                earned += milestones.milestone7.reward;
                if (milestones.milestone7.item) {
                    userData.inventory[milestones.milestone7.item] = (userData.inventory[milestones.milestone7.item] || 0) + 1;
                    milestoneReward = `\n🎁 **7-Day Streak Bonus:** +${milestones.milestone7.reward.toLocaleString()} coins + 1x ${milestones.milestone7.item}!`;
                }
            } else if (streak === 30 && milestones.milestone30) {
                earned += milestones.milestone30.reward;
                if (milestones.milestone30.item) {
                    userData.inventory[milestones.milestone30.item] = (userData.inventory[milestones.milestone30.item] || 0) + 1;
                    milestoneReward = `\n🎁 **30-Day Streak Bonus:** +${milestones.milestone30.reward.toLocaleString()} coins + 1x ${milestones.milestone30.item}!`;
                }
            } else if (streak === 100 && milestones.milestone100) {
                earned += milestones.milestone100.reward;
                if (milestones.milestone100.item) {
                    userData.inventory[milestones.milestone100.item] = (userData.inventory[milestones.milestone100.item] || 0) + 1;
                    milestoneReward = `\n🎁 **100-Day Streak Bonus:** +${milestones.milestone100.reward.toLocaleString()} coins + 1x ${milestones.milestone100.item}!`;
                }
            }

            userData.wallet = (userData.wallet || 0) + earned;
            userData.lastDaily = now;
            userData.dailyStreak = streak;
            userData.totalTransactions = (userData.totalTransactions || 0) + 1;
            userData.totalEarned = (userData.totalEarned || 0) + earned;

            await setEconomyData(client, guildId, userId, userData);

            // Log transaction
            await logTransaction(client, guildId, userId, {
                amount: earned, type: 'INCOME', source: 'daily',
                description: `Daily claim (Streak: ${streak})${milestoneReward ? ' + Milestone!' : ''}`,
                metadata: { streak, hasPremium: hasPremiumRole, streakBonus },
            });

            // Check achievements
            try {
                await checkAchievements(client, guildId, userId);
            } catch { /* silent */ }

            logger.info(`[ECONOMY_TRANSACTION] Daily claimed`, {
                userId,
                guildId,
                amount: earned,
                streak,
                newWallet: userData.wallet,
                hasPremium: hasPremiumRole,
                timestamp: new Date().toISOString()
            });

            const streakDisplay = streak > 1 ? `\n🔥 **Streak:** ${streak} day(s)${streakBonus > 0 ? ` (+${streakBonus.toLocaleString()} bonus)` : ''}` : '';

            const embed = createEmbed({
                title: "✅ Daily Claimed!",
                description: `You have claimed your daily **$${earned.toLocaleString()}**!${bonusMessage}${streakDisplay}${milestoneReward}`,
                color: 'money'
            })
                .addFields({
                    name: "New Cash Balance",
                    value: `$${userData.wallet.toLocaleString()}`,
                    inline: true,
                })
                .addFields({
                    name: "Current Streak",
                    value: `🔥 ${streak} day(s)`,
                    inline: true,
                })
                .setFooter({
                    text: hasPremiumRole
                        ? `Next claim in 24 hours. (Premium Active)`
                        : `Next claim in 24 hours.`,
                });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'daily' })
};