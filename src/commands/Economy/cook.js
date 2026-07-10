import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RECIPES = [
    { name: 'Grilled Fish', emoji: '🐟', ingredients: { fish: 3 }, sellValue: 600, xp: 10 },
    { name: 'Fish Stew', emoji: '🍲', ingredients: { fish: 5 }, sellValue: 1200, xp: 25 },
    { name: 'Sashimi Platter', emoji: '🍣', ingredients: { fish: 8 }, sellValue: 2500, xp: 50 },
    { name: 'Seafood Feast', emoji: '🦐', ingredients: { fish: 12 }, sellValue: 5000, xp: 100 },
];

const COOK_MESSAGES = [
    'You fire up the stove and get cooking...',
    'With expert knife skills, you prepare the ingredients...',
    'The kitchen fills with an amazing aroma as you cook...',
    'You follow the recipe carefully, adding a personal touch...',
];

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('cook')
        .setDescription('Cook meals from fish you\'ve caught and sell them!')
        .addStringOption((option) =>
            option
                .setName('recipe')
                .setDescription('Which recipe to cook')
                .setRequired(true)
                .addChoices(
                    { name: 'Grilled Fish (3 fish)', value: 'Grilled Fish' },
                    { name: 'Fish Stew (5 fish)', value: 'Fish Stew' },
                    { name: 'Sashimi Platter (8 fish)', value: 'Sashimi Platter' },
                    { name: 'Seafood Feast (12 fish)', value: 'Seafood Feast' },
                ),
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const recipeName = interaction.options.getString('recipe');

        const userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            throw createError(
                'Failed to load economy data',
                ErrorTypes.DATABASE,
                'Failed to load your economy data. Please try again later.',
                { userId, guildId }
            );
        }

        const recipe = RECIPES.find(r => r.name === recipeName);
        if (!recipe) {
            throw createError(
                'Recipe not found',
                ErrorTypes.VALIDATION,
                'That recipe does not exist.',
                { recipeName }
            );
        }

        const inventory = userData.inventory || {};
        const fishCount = inventory.fish || 0;
        const requiredFish = recipe.ingredients.fish;

        if (fishCount < requiredFish) {
            throw createError(
                'Not enough fish',
                ErrorTypes.VALIDATION,
                `You need **${requiredFish} fish** to cook ${recipe.emoji} **${recipe.name}**, but you only have **${fishCount} fish**. Catch more with \`/fish\`!`,
                { required: requiredFish, current: fishCount }
            );
        }

        inventory.fish = fishCount - requiredFish;
        userData.inventory = inventory;
        userData.wallet = (userData.wallet || 0) + recipe.sellValue;

        await setEconomyData(client, guildId, userId, userData);

        const cookMessage = COOK_MESSAGES[Math.floor(Math.random() * COOK_MESSAGES.length)];

        const embed = createEmbed({
            title: '🍳 Cooking Complete!',
            description: `${cookMessage}\n\nYou cooked a **${recipe.emoji} ${recipe.name}** and sold it for **$${recipe.sellValue.toLocaleString()}**!\n\n**Fish Used:** ${requiredFish}\n**Fish Remaining:** ${inventory.fish}`,
            color: 'success',
        })
            .addFields(
                { name: 'New Cash', value: `$${userData.wallet.toLocaleString()}`, inline: true },
                { name: 'Recipe XP', value: `+${recipe.xp}`, inline: true },
            );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'cook' }),
};
