import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MINE_LOCATIONS = [
    "abandoned gold mine",
    "dark, damp cave",
    "backyard rock quarry",
    "volcanic obsidian vent",
    "deep-sea mineral trench",
];

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Go mining to earn money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastMine = userData.lastMine || 0;
            const hasDiamondPickaxe = userData.inventory["diamond_pickaxe"] || 0;
            const hasPickaxe = userData.inventory["pickaxe"] || 0;

            if (now < lastMine + botConfig.economy.cooldowns.mine) {
                const remaining = lastMine + botConfig.economy.cooldowns.mine - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Mining cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `Your pickaxe is cooling down. Wait for **${hours}h ${minutes}m** before mining again.`,
                    { remaining, cooldownType: 'mine' }
                );
            }

            const baseEarned =
                Math.floor(
                    Math.random() * (botConfig.economy.mineMaxReward - botConfig.economy.mineMinReward + 1),
                ) + botConfig.economy.mineMinReward;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            if (hasDiamondPickaxe > 0) {
                finalEarned = Math.floor(baseEarned * botConfig.economy.diamondPickaxeMultiplier);
                multiplierMessage = `\n💎 **Diamond Pickaxe Bonus: +100%**`;
            } else if (hasPickaxe > 0) {
                finalEarned = Math.floor(baseEarned * botConfig.economy.pickaxeMultiplier);
                multiplierMessage = `\n⛏️ **Pickaxe Bonus: +20%**`;
            }

            const location =
                MINE_LOCATIONS[
                    Math.floor(Math.random() * MINE_LOCATIONS.length)
                ];

            userData.wallet += finalEarned;
userData.lastMine = now;

            await setEconomyData(client, guildId, userId, userData);

            const embed = createEmbed({
                title: "💰 Mining Expedition Successful!",
                description: `You explored a **${location}** and managed to find minerals worth **$${finalEarned.toLocaleString()}**!${multiplierMessage}`,
                color: 'money'
            })
                .addFields({
                    name: "New Cash Balance",
                    value: `$${userData.wallet.toLocaleString()}`,
                    inline: true,
                })
                .setFooter({ text: `Next mine available in 1 hour.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'mine' })
};