// profile.js — /economy profile
// Displays a user's economic identity page.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, calculateNetWorth, getEconomicTier, formatTier, getCurrencySymbol, calculateInventoryValue } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your economic profile')
        .addUserOption(option =>
            option.setName('user').setDescription('User to view profile of').setRequired(false)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;
        const symbol = getCurrencySymbol();

        if (targetUser.bot) {
            throw createError('Cannot view bot profile', ErrorTypes.VALIDATION, 'Bots do not have economy profiles.');
        }

        const userData = await getEconomyData(client, guildId, targetUser.id);
        const wallet = userData.wallet || 0;
        const bank = userData.bank || 0;
        const inventoryValue = calculateInventoryValue(userData.inventory || {});
        const netWorth = calculateNetWorth(userData);
        const tier = getEconomicTier(netWorth);
        const totalTx = userData.totalTransactions || 0;
        const totalEarned = userData.totalEarned || 0;
        const totalSpent = userData.totalSpent || 0;
        const propertyCount = Array.isArray(userData.properties) ? userData.properties.length : 0;
        const petCount = Array.isArray(userData.pets) ? userData.pets.length : 0;
        const achPoints = userData.achievementPoints || 0;
        const dailyStreak = userData.dailyStreak || 0;

        const embed = createEmbed({
            title: `📊 ${targetUser.username}'s Economic Profile`,
            color: 'economy',
            thumbnail: targetUser.displayAvatarURL(),
            fields: [
                {
                    name: '💵 Financials',
                    value: [
                        `**Wallet:** ${symbol}${wallet.toLocaleString()}`,
                        `**Bank:** ${symbol}${bank.toLocaleString()}`,
                        `**Inventory Value:** ${symbol}${inventoryValue.toLocaleString()}`,
                        `**Net Worth:** ${symbol}${netWorth.toLocaleString()}`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📈 Economic Status',
                    value: [
                        `${formatTier(tier)}`,
                        `**Daily Streak:** ${dailyStreak} day(s)`,
                        `**Achievement Points:** ${achPoints}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📊 Activity',
                    value: [
                        `**Transactions:** ${totalTx}`,
                        `**Total Earned:** ${symbol}${totalEarned.toLocaleString()}`,
                        `**Total Spent:** ${symbol}${totalSpent.toLocaleString()}`,
                        `**Properties:** ${propertyCount} | **Pets:** ${petCount}`,
                    ].join('\n'),
                    inline: true,
                },
            ],
            footer: `Requested by ${interaction.user.tag}`,
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.debug(`[ECONOMY] Profile viewed for ${targetUser.id}`);
    }, { command: 'profile' })
};
