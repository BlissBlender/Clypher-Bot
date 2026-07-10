import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ROASTS = [
    "You're not stupid; you just have bad luck thinking.",
    '{target}, you bring everyone a lot of joy — when you leave.',
    'I would agree with you, but then we would both be wrong.',
    '{target}, your secrets are safe with me. I never listen anyway.',
    'You have the perfect face for radio.',
    "Somewhere out there, a tree is breathing oxygen you've wasted.",
    "You're proof that evolution can go in reverse.",
    '{target}, you have the charm of a malfunctioning toaster.',
    'I have seen more attractive garbage cans.',
    "You're not a complete idiot — some parts are missing.",
    'Your brain is like a browser with 100 tabs open and all of them are frozen.',
    '{target}, you are the human equivalent of a syntax error.',
    "You have the emotional range of a brick wall, but less helpful.",
    'I would explain it to you, but I left my crayons at home.',
    'You are what happens when a GPS says "recalculating" one too many times.',
    '{target}, you have the energy of a forgotten pizza roll.',
    "You're the reason they put instructions on shampoo bottles.",
    'If ignorance is bliss, you must be the happiest person alive.',
    '{target}, you have the social grace of a crashed server.',
    'You are a walking, talking typo.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Roast someone with a fiery insult!')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('Who to roast')
                .setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction, config, client) {
        try {
            const target = interaction.options.getUser('target');
            const targetDisplay = target.id === interaction.user.id ? 'yourself' : `<@${target.id}>`;

            if (target.bot) {
                const embed = successEmbed(
                    '🔥 Roast failed!',
                    `Sorry <@${interaction.user.id}>, I can't roast my fellow bots! We're in this together. 🤖`,
                );
                return await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            }

            const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)]
                .replace('{target}', targetDisplay);

            const embed = successEmbed(
                '🔥 Roast!',
                `${roast}\n\n— <@${interaction.user.id}>`,
            );

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            logger.debug(`Roast command: ${interaction.user.id} roasted ${target.id}`);
        } catch (error) {
            logger.error('Roast command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'roast',
                source: 'roast_command',
            });
        }
    },
};
