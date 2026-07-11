// achievements.js — /achievements
// View achievements, progress, and claim rewards.

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { getUserAchievements, claimAchievementReward, getAllAchievements } from '../../services/achievementService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your achievements and claim rewards'),
    category: 'Economy',

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const symbol = getCurrencySymbol();

        const achievements = await getUserAchievements(client, guildId, userId);
        const unlocked = achievements.filter(a => a.unlocked);
        const total = achievements.length;
        const points = unlocked.filter(a => a.unlockedAt > 0).length * 10;

        // Group by category
        const byCategory = {};
        for (const ach of achievements) {
            if (!byCategory[ach.category]) byCategory[ach.category] = [];
            byCategory[ach.category].push(ach);
        }

        let currentPage = 0;
        const categories = Object.keys(byCategory);

        const buildEmbed = (page) => {
            const cat = categories[page];
            const items = byCategory[cat] || [];
            const catUnlocked = items.filter(i => i.unlocked && i.unlockedAt > 0).length;

            const lines = items.map(ach => {
                const isUnlocked = ach.unlocked && ach.unlockedAt > 0;
                const icon = isUnlocked ? (ach.rewarded ? '✅' : '🆕') : '🔒';
                const progress = ach.category === 'wealth'
                    ? ` (${symbol}${ach.progress.toLocaleString()}/${symbol}${ach.threshold.toLocaleString()})`
                    : ` (${ach.progress}/${ach.threshold})`;
                return `${icon} **${ach.name}**${isUnlocked ? '' : progress}\n   ${ach.desc}${isUnlocked ? ` — Reward: ${symbol}${ach.reward.toLocaleString()}` : ''}`;
            });

            const embed = createEmbed({
                title: `🏆 Achievements`,
                description: `**${unlocked.filter(a => a.unlockedAt > 0).length}/${total}** unlocked • **${points}** points\n\n### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catUnlocked}/${items.length})\n${lines.join('\n\n')}`,
                color: 'rare',
                footer: `Page ${page + 1}/${categories.length}`,
                timestamp: true,
            });

            return embed;
        };

        const buildComponents = (page) => {
            const cat = categories[page];
            const items = byCategory[cat] || [];
            const unclaimedRewards = items.filter(a => a.unlocked && a.unlockedAt > 0 && !a.rewarded);

            const row1 = new ActionRowBuilder();
            if (categories.length > 1) {
                row1.addComponents(
                    new ButtonBuilder().setCustomId('ach_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('ach_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page === categories.length - 1),
                );
            }
            return { components: row1.components.length > 0 ? [row1] : [] };
        };

        const message = await InteractionHelper.safeEditReply(interaction, {
            embeds: [buildEmbed(currentPage)],
            components: buildComponents(currentPage).components,
        });

        if (categories.length <= 1) return;

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && (i.customId === 'ach_prev' || i.customId === 'ach_next'),
            time: 60000,
        });

        collector.on('collect', async (btnInt) => {
            await btnInt.deferUpdate();
            if (btnInt.customId === 'ach_prev' && currentPage > 0) currentPage--;
            else if (btnInt.customId === 'ach_next' && currentPage < categories.length - 1) currentPage++;
            await btnInt.editReply({ embeds: [buildEmbed(currentPage)], components: buildComponents(currentPage).components });
        });

        collector.on('end', async () => {
            try { await message.edit({ components: [] }); } catch { /* ignore */ }
        });
    }, { command: 'achievements' })
};
