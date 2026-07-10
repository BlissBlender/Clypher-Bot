import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { formatDuration } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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

            userData.wallet = (userData.wallet || 0) + earned;
            userData.lastDaily = now;

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Daily claimed`, {
                userId,
                guildId,
                amount: earned,
                newWallet: userData.wallet,
                hasPremium: hasPremiumRole,
                timestamp: new Date().toISOString()
            });

            const embed = createEmbed({
                title: "✅ Daily Claimed!",
                description: `You have claimed your daily **$${earned.toLocaleString()}**!${bonusMessage}`,
                color: 'money'
            })
                .addFields({
                    name: "New Cash Balance",
                    value: `$${userData.wallet.toLocaleString()}`,
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