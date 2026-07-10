import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import gcreate from './gcreate.js';
import gend from './gend.js';
import gdelete from './gdelete.js';
import greroll from './greroll.js';

const HANDLERS = {
    create: gcreate,
    end: gend,
    delete: gdelete,
    reroll: greroll,
};

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create and manage server giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Start a new giveaway in a channel')
                .addStringOption((option) =>
                    option
                        .setName('duration')
                        .setDescription('How long the giveaway lasts (e.g., 1h, 30m, 5d)')
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('winners')
                        .setDescription('Number of winners to pick')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option.setName('prize').setDescription('Prize being given away').setRequired(true),
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Channel for the giveaway (defaults to current)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('end')
                .setDescription('End an active giveaway and pick winners')
                .addStringOption((option) =>
                    option.setName('messageid').setDescription('Giveaway message ID').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Delete a giveaway message and database entry')
                .addStringOption((option) =>
                    option.setName('messageid').setDescription('Giveaway message ID').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('reroll')
                .setDescription('Reroll winners for an ended giveaway')
                .addStringOption((option) =>
                    option.setName('messageid').setDescription('Giveaway message ID').setRequired(true),
                ),
        ),
    category: 'Giveaway',

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = HANDLERS[subcommand];
            if (!handler) {
                throw new Error(`Unknown giveaway subcommand: ${subcommand}`);
            }
            return handler.execute(interaction, config, client);
        } catch (error) {
            logger.error('Giveaway command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'giveaway',
                source: 'giveaway_router',
            });
        }
    },
};
