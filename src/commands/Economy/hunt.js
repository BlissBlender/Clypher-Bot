import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ANIMALS = [
    // Common
    { name: 'Rabbit', emoji: '🐇', rarity: 'common', value: 150 },
    { name: 'Squirrel', emoji: '🐿️', rarity: 'common', value: 100 },
    { name: 'Duck', emoji: '🦆', rarity: 'common', value: 120 },
    { name: 'Pheasant', emoji: '🐓', rarity: 'common', value: 180 },
    // Uncommon
    { name: 'Fox', emoji: '🦊', rarity: 'uncommon', value: 350 },
    { name: 'Deer', emoji: '🦌', rarity: 'uncommon', value: 500 },
    { name: 'Wild Boar', emoji: '🐗', rarity: 'uncommon', value: 400 },
    // Rare
    { name: 'Wolf', emoji: '🐺', rarity: 'rare', value: 800 },
    { name: 'Bear', emoji: '🐻', rarity: 'rare', value: 1200 },
    { name: 'Moose', emoji: '🫎', rarity: 'rare', value: 1000 },
    // Epic
    { name: 'Eagle', emoji: '🦅', rarity: 'epic', value: 2000 },
    { name: 'Panther', emoji: '🐆', rarity: 'epic', value: 2500 },
    // Legendary
    { name: 'Dragon', emoji: '🐉', rarity: 'legendary', value: 5000 },
    { name: 'Phoenix', emoji: '🦩', rarity: 'legendary', value: 7500 },
];

const HUNT_MESSAGES = [
    'You venture into the deep forest, rifle ready...',
    'Tracking footprints through the underbrush, you spot movement...',
    'You set up an ambush near the watering hole and wait...',
    'Following the sounds through the dense foliage...',
    'You climb to a vantage point and scan the terrain...',
];

function rollAnimal() {
    const rand = Math.random();
    let pool;
    if (rand < 0.4) {
        pool = ANIMALS.filter(a => a.rarity === 'common');
    } else if (rand < 0.65) {
        pool = ANIMALS.filter(a => a.rarity === 'uncommon');
    } else if (rand < 0.85) {
        pool = ANIMALS.filter(a => a.rarity === 'rare');
    } else if (rand < 0.95) {
        pool = ANIMALS.filter(a => a.rarity === 'epic');
    } else {
        pool = ANIMALS.filter(a => a.rarity === 'legendary');
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Go hunting for animals to earn money (requires Hunting Rifle)'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            throw createError(
                'Failed to load economy data',
                ErrorTypes.DATABASE,
                'Failed to load your economy data. Please try again later.',
                { userId, guildId }
            );
        }

        const hasHuntingRifle = userData.inventory?.hunting_rifle || 0;
        if (!hasHuntingRifle) {
            throw createError(
                'No Hunting Rifle',
                ErrorTypes.VALIDATION,
                'You need a **Hunting Rifle** to go hunting! Buy one from the shop with `/buy item_id:hunting_rifle`.',
                { userId, guildId }
            );
        }

        const lastHunt = userData.lastHunt || 0;
        if (now < lastHunt + botConfig.economy.huntCooldown) {
            const remaining = lastHunt + botConfig.economy.huntCooldown - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            throw createError(
                'Hunt cooldown active',
                ErrorTypes.RATE_LIMIT,
                `You need to let the wildlife settle. Wait **${hours}h ${minutes}m** before hunting again.`,
                { remaining, cooldownType: 'hunt' }
            );
        }

        const animal = rollAnimal();
        const huntMessage = HUNT_MESSAGES[Math.floor(Math.random() * HUNT_MESSAGES.length)];

        const baseEarned = Math.floor(Math.random() * (botConfig.economy.huntMaxReward - botConfig.economy.huntMinReward + 1)) + botConfig.economy.huntMinReward;
        const totalEarned = baseEarned + animal.value;

        userData.wallet = (userData.wallet || 0) + totalEarned;
        userData.lastHunt = now;

        await setEconomyData(client, guildId, userId, userData);

        const rarityColors = {
            common: '#95A5A6',
            uncommon: '#2ECC71',
            rare: '#3498DB',
            epic: '#9B59B6',
            legendary: '#F1C40F',
        };

        const embed = createEmbed({
            title: '🏹 Hunt Successful!',
            description: `${huntMessage}\n\nYou hunted a **${animal.emoji} ${animal.name}**!\n\n**Meat Value:** $${animal.value.toLocaleString()}\n**Expedition Bonus:** $${baseEarned.toLocaleString()}\n**Total Earned:** $${totalEarned.toLocaleString()}`,
            color: rarityColors[animal.rarity],
        })
            .addFields(
                { name: 'Rarity', value: animal.rarity.charAt(0).toUpperCase() + animal.rarity.slice(1), inline: true },
                { name: 'New Cash', value: `$${userData.wallet.toLocaleString()}`, inline: true },
            )
            .setFooter({ text: 'Next hunt available in 45 minutes.' });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'hunt' }),
};
