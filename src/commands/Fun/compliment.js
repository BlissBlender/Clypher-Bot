import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COMPLIMENTS = [
    'You are a literal ray of sunshine, {target}. Never change.',
    '{target}, you have the kindest heart and the sharpest mind.',
    'Your energy is infectious in the best way possible, {target}.',
    '{target}, you make the world a better place just by being in it.',
    'You are more thoughtful than a handwritten letter, {target}.',
    '{target}, your smile could light up an entire server.',
    'You have the wisdom of an elder and the spirit of a child, {target}.',
    '{target}, you are proof that good people still exist.',
    'Your vibe attracts your tribe, and you have the best vibes, {target}.',
    '{target}, you are the human equivalent of a perfect high-five.',
    'You are worth more than all the treasure in the world, {target}.',
    '{target}, your potential is limitless — and you are already amazing.',
    'You have a beautiful soul and it shows in everything you do, {target}.',
    '{target}, you are stronger than you think and braver than you believe.',
    'Your presence is a gift, {target}.',
    '{target}, you have the rare gift of making people feel seen and valued.',
    'You are doing great, {target}. Keep going!',
    '{target}, you have excellent taste, great ideas, and amazing friends.',
    'Your kindness is your superpower, {target}.',
    '{target}, you are absolutely crushing this thing called life!',
];

export default {
    data: new SlashCommandBuilder()
        .setName('compliment')
        .setDescription('Brighten someone\'s day with a random compliment!')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('Who to compliment')
                .setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction, config, client) {
        try {
            const target = interaction.options.getUser('target');
            const targetDisplay = target.id === interaction.user.id ? 'yourself' : `<@${target.id}>`;

            const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)]
                .replace('{target}', targetDisplay);

            const embed = successEmbed(
                '💖 Compliment!',
                `${compliment}\n\n— <@${interaction.user.id}>`,
            );

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            logger.debug(`Compliment command: ${interaction.user.id} complimented ${target.id}`);
        } catch (error) {
            logger.error('Compliment command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'compliment',
                source: 'compliment_command',
            });
        }
    },
};
