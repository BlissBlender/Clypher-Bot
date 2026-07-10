import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("eleaderboard")
        .setDescription("View the server's top 10 richest users.")
        .setDMPermission(false),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const guildId = interaction.guildId;

            logger.debug(`[ECONOMY] Leaderboard requested`, { guildId });

            const economyPrefix = `economy:${guildId}:`;

            let allUserData = [];

            // Try indexed DB listing first
            let allKeys = [];
            let listed = false;
            if (client.db?.list && typeof client.db.list === 'function') {
                try {
                    const keys = await client.db.list(economyPrefix);
                    if (Array.isArray(keys)) {
                        allKeys = keys;
                        listed = true;
                    }
                } catch (listError) {
                    logger.warn(`Failed to list economy keys for guild ${guildId}:`, listError.message);
                }
            }

            if (listed && allKeys.length > 0) {
                // Use indexed keys
                for (const key of allKeys) {
                    const userId = key.replace(economyPrefix, '');
                    const userData = await client.db.get(key);
                    if (userData) {
                        allUserData.push({
                            userId,
                            net_worth: (userData.wallet || 0) + (userData.bank || 0),
                        });
                    }
                }
            } else {
                // Fallback: scan all guild members (in-memory DB doesn't support .list())
                try {
                    // Use cached members first (no API call), fall back to fetch
                    let members = interaction.guild.members.cache;
                    if (!members.size) {
                        members = await interaction.guild.members.fetch().catch(() => new Map());
                    }
                    for (const [userId, member] of members) {
                        if (member.user.bot) continue;
                        const userData = await client.db.get(`${economyPrefix}${userId}`);
                        if (userData && ((userData.wallet || 0) > 0 || (userData.bank || 0) > 0)) {
                            allUserData.push({
                                userId,
                                net_worth: (userData.wallet || 0) + (userData.bank || 0),
                            });
                        }
                    }
                } catch (memberError) {
                    logger.error(`Failed to fetch members for economy leaderboard in guild ${guildId}:`, memberError);
                }
            }

            if (allUserData.length === 0) {
                throw createError(
                    'No economy data found',
                    ErrorTypes.VALIDATION,
                    'No economy data found for this server.'
                );
            }

            allUserData.sort((a, b) => b.net_worth - a.net_worth);

            const topUsers = allUserData.slice(0, 10);
            const userRank =
                allUserData.findIndex((u) => u.userId === interaction.user.id) +
                1;
            const rankEmoji = ["🥇", "🥈", "🥉"];
            const leaderboardEntries = [];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                const emoji = rankEmoji[i] || `**#${rank}**`;

                leaderboardEntries.push(
                    `${emoji} <@${user.userId}> - 🏦 ${user.net_worth.toLocaleString()}`,
                );
            }

            logger.info(`[ECONOMY] Leaderboard generated`, { 
                guildId, 
                userCount: allUserData.length,
                userRank 
            });

            const description = leaderboardEntries.length > 0
                ? leaderboardEntries.join("\n")
                : "No economy data is available for this server yet.";

            const embed = createEmbed({
                title: `Economy Leaderboard`,
                description,
                color: 'money',
                footer: `Your Rank: ${userRank > 0 ?`#${userRank}`: "No ranking data available"}`,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'eleaderboard' })
};