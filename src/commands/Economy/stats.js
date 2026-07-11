// stats.js — /economy stats (subcommand component)
// Server economy overview statistics.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder().setName('stats').setDescription('View server economy statistics'),
    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const guild = interaction.guild;
        const symbol = getCurrencySymbol();

        const economyPrefix = `economy:${guildId}:`;

        let totalUsers = 0;
        let totalWallet = 0;
        let totalBank = 0;
        let totalTransactions = 0;
        let totalProperties = 0;
        let totalPets = 0;
        let richestUser = { id: '', netWorth: 0 };
        let mostActive = { id: '', transactions: 0 };

        try {
            const allKeys = await client.db.list(economyPrefix) || [];

            if (allKeys.length > 0) {
                for (const key of allKeys) {
                    const userId = key.replace(economyPrefix, '');
                    const userData = await client.db.get(key, {});

                    if (userData) {
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (member?.user?.bot) continue;

                        totalUsers++;
                        totalWallet += userData.wallet || 0;
                        totalBank += userData.bank || 0;
                        totalTransactions += userData.totalTransactions || 0;

                        const properties = Array.isArray(userData.properties) ? userData.properties : [];
                        const propValue = properties.reduce((s, p) => s + (p.value || 0), 0);
                        totalProperties += properties.length;
                        totalPets += (Array.isArray(userData.pets) ? userData.pets : []).length;

                        const netWorth = (userData.wallet || 0) + (userData.bank || 0) + propValue;
                        if (netWorth > richestUser.netWorth) {
                            richestUser = { id: userId, netWorth };
                        }
                        if ((userData.totalTransactions || 0) > mostActive.transactions) {
                            mostActive = { id: userId, transactions: userData.totalTransactions || 0 };
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`[ECONOMY_STATS] Error gathering stats for guild ${guildId}:`, error);
        }

        const avgBalance = totalUsers > 0 ? Math.floor((totalWallet + totalBank) / totalUsers) : 0;
        const totalCirculation = totalWallet + totalBank;

        const embed = createEmbed({
            title: `📊 Economy Statistics — ${guild.name}`,
            color: 'economy',
            fields: [
                {
                    name: '👥 Users',
                    value: [
                        `**Total Active Users:** ${totalUsers}`,
                        `**Total Transactions:** ${totalTransactions.toLocaleString()}`,
                        `**Total Properties Owned:** ${totalProperties}`,
                        `**Total Pets:** ${totalPets}`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '💰 Currency',
                    value: [
                        `**Total in Circulation:** ${symbol}${totalCirculation.toLocaleString()}`,
                        `**Total in Wallets:** ${symbol}${totalWallet.toLocaleString()}`,
                        `**Total in Banks:** ${symbol}${totalBank.toLocaleString()}`,
                        `**Average Balance:** ${symbol}${avgBalance.toLocaleString()}`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🏆 Rankings',
                    value: [
                        `**Richest User:** ${richestUser.id ? `<@${richestUser.id}> (${symbol}${richestUser.netWorth.toLocaleString()})` : 'N/A'}`,
                        `**Most Active:** ${mostActive.id ? `<@${mostActive.id}> (${mostActive.transactions} tx)` : 'N/A'}`,
                    ].join('\n'),
                    inline: false,
                },
            ],
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.debug(`[ECONOMY_STATS] Stats viewed for guild ${guildId}`);
    },
};
