import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    // Positive
    'It is certain.',
    'It is decidedly so.',
    'Without a doubt.',
    'Yes – definitely.',
    'You may rely on it.',
    'As I see it, yes.',
    'Most likely.',
    'Outlook good.',
    'Yes.',
    'Signs point to yes.',
    // Neutral
    'Reply hazy, try again.',
    'Ask again later.',
    'Better not tell you now.',
    'Cannot predict now.',
    'Concentrate and ask again.',
    // Negative
    "Don't count on it.",
    'My reply is no.',
    'My sources say no.',
    'Outlook not so good.',
    'Very doubtful.',
];

const EIGHT_BALL_EMOTE = '🎱';

export default {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question and receive a cryptic answer!')
        .addStringOption((option) =>
            option
                .setName('question')
                .setDescription('Your question for the magic 8-ball')
                .setRequired(true)
                .setMaxLength(500),
        ),
    category: 'Fun',

    async execute(interaction, config, client) {
        try {
            const question = interaction.options.getString('question');
            const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

            const embed = successEmbed(
                `${EIGHT_BALL_EMOTE} Magic 8-Ball`,
                `**Question:** ${question}\n\n**Answer:** ${answer}`,
            );

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            logger.debug(`8ball command executed by user ${interaction.user.id}`);
        } catch (error) {
            logger.error('8ball command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: '8ball',
                source: '8ball_command',
            });
        }
    },
};
