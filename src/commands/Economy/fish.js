import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FISH_TYPES = [
    { name: 'Bass', emoji: '🐟', rarity: 'common' },
    { name: 'Salmon', emoji: '🐟', rarity: 'common' },
    { name: 'Trout', emoji: '🐟', rarity: 'common' },
    { name: 'Tuna', emoji: '🐠', rarity: 'uncommon' },
    { name: 'Swordfish', emoji: '🐠', rarity: 'uncommon' },
    { name: 'Octopus', emoji: '🐙', rarity: 'rare' },
    { name: 'Lobster', emoji: '🦞', rarity: 'rare' },
    { name: 'Shark', emoji: '🦈', rarity: 'epic' },
    { name: 'Whale', emoji: '🐋', rarity: 'legendary' },
];

const CATCH_MESSAGES = [
    "You cast your line into the crystal clear waters...",
    "You wait patiently as your bobber floats...",
    "After a few minutes of waiting, you feel a tug...",
    "The water ripples as something takes your bait...",
    "You reel in your catch with expert precision...",
];

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing to catch fish and earn money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastFish = userData.lastFish || 0;
            const hasFishingRod = userData.inventory["fishing_rod"] || 0;

            if (now < lastFish + botConfig.economy.cooldowns.fish) {
                const remaining = lastFish + botConfig.economy.cooldowns.fish - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Fishing cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `You're too tired to fish right now. Rest for **${hours}h ${minutes}m** before fishing again.`,
                    { remaining, cooldownType: 'fish' }
                );
            }

            const rand = Math.random();
            let fishCaught;
            
            if (rand < 0.5) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'common')[Math.floor(Math.random() * 3)];
            } else if (rand < 0.75) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'uncommon')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.9) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'rare')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.98) {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'epic');
            } else {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'legendary');
            }

            const baseEarned = Math.floor(
                Math.random() * (botConfig.economy.fishMaxReward - botConfig.economy.fishMinReward + 1)
            ) + botConfig.economy.fishMinReward;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            if (hasFishingRod > 0) {
                finalEarned = Math.floor(baseEarned * botConfig.economy.fishingRodMultiplier);
                multiplierMessage = `\n🎣 **Fishing Rod Bonus: +50%**`;
            }

            const catchMessage = CATCH_MESSAGES[Math.floor(Math.random() * CATCH_MESSAGES.length)];

            // Give cash + store fish in inventory for cooking
            userData.wallet += finalEarned;
            userData.inventory = userData.inventory || {};
            userData.inventory.fish = (userData.inventory.fish || 0) + 1;
            userData.lastFish = now;

            await setEconomyData(client, guildId, userId, userData);

            const rarityColors = {
                common: '#95A5A6',
                uncommon: '#2ECC71',
                rare: '#3498DB',
                epic: '#9B59B6',
                legendary: '#F1C40F'
            };

            const embed = createEmbed({
                title: 'Fishing Success!',
                description: `${catchMessage}\n\nYou caught a **${fishCaught.emoji} ${fishCaught.name}**!\n\n**Sold for:** **$${finalEarned.toLocaleString()}**\n**Fish stored:** +1 🐟 (use with \`/cook\`)${multiplierMessage}`,
                color: rarityColors[fishCaught.rarity]
            })
                .addFields(
                    {
                        name: "New Cash Balance",
                        value: `$${userData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "Rarity",
                        value: fishCaught.rarity.charAt(0).toUpperCase() + fishCaught.rarity.slice(1),
                        inline: true,
                    },
                    {
                        name: "Fish in Inventory",
                        value: `${userData.inventory.fish}`,
                        inline: true,
                    }
                )
                .setFooter({ text: 'Next fishing trip available in 45 minutes.' });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'fish' })
};