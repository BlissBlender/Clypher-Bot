// pets.js — /pets
// Adopt, view, feed, and train pets.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { adoptPet, viewPets, feedPet, trainPet, getPetTypes } from '../../services/petService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pets')
        .setDescription('Manage your pets')
        .addSubcommand(sub =>
            sub.setName('adopt')
                .setDescription('Adopt a new pet')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Pet type to adopt')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐕 Dog - Work bonus', value: 'dog' },
                            { name: '🐈 Cat - Gambling bonus', value: 'cat' },
                            { name: '🐉 Dragon - Rare high bonus', value: 'dragon' },
                            { name: '🦉 Owl - Crime bonus', value: 'owl' },
                            { name: '🦊 Fox - Fishing bonus', value: 'fox' },
                            { name: '🐻 Bear - Mining bonus', value: 'bear' },
                        )
                )
                .addStringOption(opt => opt.setName('name').setDescription('Give your pet a name').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('view').setDescription('View your pets')
        )
        .addSubcommand(sub =>
            sub.setName('feed')
                .setDescription('Feed your pet')
                .addStringOption(opt => opt.setName('pet_id').setDescription('Pet ID to feed').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('train')
                .setDescription('Train your pet')
                .addStringOption(opt => opt.setName('pet_id').setDescription('Pet ID to train').setRequired(true))
        ),
    category: 'Economy',

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();
        const symbol = getCurrencySymbol();

        switch (subcommand) {
            case 'adopt': {
                const type = interaction.options.getString('type');
                const name = interaction.options.getString('name') || undefined;

                const result = await adoptPet(client, guildId, userId, type, name);

                const embed = createEmbed({
                    title: `🐾 New Pet Adopted!`,
                    description: `You adopted **${result.pet.emoji} ${result.pet.name}**!`,
                    color: 'money',
                    fields: [
                        { name: 'Pet ID', value: `\`${result.pet.id}\``, inline: true },
                        { name: 'Type', value: result.pet.emoji + ' ' + (getPetTypes().find(p => p.id === type)?.name || type), inline: true },
                        { name: 'Adoption Cost', value: `${symbol}${result.cost.toLocaleString()}`, inline: true },
                        { name: 'Bonus', value: Object.entries(result.pet.bonus).map(([k, v]) => `**${k}:** ${typeof v === 'number' && v < 1 ? `+${Math.round(v * 100)}%` : `x${v}`}`).join('\n') || 'None', inline: false },
                        { name: 'Care', value: 'Feed (`/pets feed`) and train (`/pets train`) to level up!', inline: false },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[PETS] ${userId} adopted ${type}: ${result.pet.id}`);
                break;
            }

            case 'view': {
                const pets = await viewPets(client, guildId, userId);

                if (pets.length === 0) {
                    throw createError('No pets', ErrorTypes.VALIDATION,
                        'You don\'t have any pets. Adopt one with `/pets adopt`!');
                }

                const lines = pets.map((p, i) => {
                    const xpBar = '█'.repeat(Math.min(Math.floor((p.xp / p.xpNeeded) * 10), 10)) + '░'.repeat(Math.max(10 - Math.floor((p.xp / p.xpNeeded) * 10), 0));
                    const bonusStr = Object.entries(p.currentBonus || {})
                        .map(([k, v]) => `${k}: ${typeof v === 'number' && v < 1 ? `+${Math.round(v * 100)}%` : `x${v.toFixed(2)}`}`)
                        .join(', ');
                    return `${p.emoji} **${p.name}** (ID: \`${p.id}\`)\n` +
                        `   **Level ${p.level}** • XP: \`${xpBar}\` ${p.xp}/${p.xpNeeded}\n` +
                        `   **Bonus:** ${bonusStr || 'None'}\n` +
                        `   🍖 Feed: ${p.canFeed ? '✅ Ready' : '⏳ Cooldown'} | 🏋️ Train: ${p.canTrain ? '✅ Ready' : '⏳ Cooldown'}`;
                });

                const embed = createEmbed({
                    title: '🐾 Your Pets',
                    description: lines.join('\n\n'),
                    color: 'info',
                    footer: `${pets.length}/5 pets • Feed: ${symbol}${500} | Train: ${symbol}${2000}`,
                    timestamp: true,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'feed': {
                const petId = interaction.options.getString('pet_id');
                const result = await feedPet(client, guildId, userId, petId);

                const embed = createEmbed({
                    title: '🍖 Pet Fed!',
                    description: `You fed **${result.pet.emoji} ${result.pet.name}**! Gained **${result.xpGained} XP**!${result.leveledUp ? `\n\n⭐ **Level Up! Now Level ${result.pet.level}!**` : ''}`,
                    color: result.leveledUp ? 'rare' : 'money',
                    fields: [
                        { name: 'Level', value: `${result.pet.level}`, inline: true },
                        { name: 'XP', value: `${result.pet.xp}/${result.pet.xpNeeded}`, inline: true },
                        { name: 'Cost', value: `${symbol}${result.cost.toLocaleString()}`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'train': {
                const petId = interaction.options.getString('pet_id');
                const result = await trainPet(client, guildId, userId, petId);

                const embed = createEmbed({
                    title: '🏋️ Pet Trained!',
                    description: `You trained **${result.pet.emoji} ${result.pet.name}**! Gained **${result.xpGained} XP**!${result.leveledUp ? `\n\n⭐ **Level Up! Now Level ${result.pet.level}!**` : ''}`,
                    color: result.leveledUp ? 'rare' : 'info',
                    fields: [
                        { name: 'Level', value: `${result.pet.level}`, inline: true },
                        { name: 'XP', value: `${result.pet.xp}/${result.pet.xpNeeded}`, inline: true },
                        { name: 'Cost', value: `${symbol}${result.cost.toLocaleString()}`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }
        }
    }, { command: 'pets' })
};
