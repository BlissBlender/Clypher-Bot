import { SlashCommandBuilder } from 'discord.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import define from './define.js';
import urban from './urban.js';
import google from './google.js';

const HANDLERS = {
    define,
    urban,
    google,
};

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search dictionaries and the web')
        .addSubcommand((sub) =>
            sub
                .setName('define')
                .setDescription('Look up a word definition')
                .addStringOption((option) =>
                    option.setName('word').setDescription('Word to look up').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('urban')
                .setDescription('Search Urban Dictionary')
                .addStringOption((option) =>
                    option.setName('term').setDescription('Term to look up').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('google')
                .setDescription('Generate a Google search link')
                .addStringOption((option) =>
                    option.setName('query').setDescription('What to search for').setRequired(true),
                ),
        ),
    category: 'Search',

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = HANDLERS[subcommand];
            if (!handler) {
                throw new Error(`Unknown search subcommand: ${subcommand}`);
            }
            return handler.execute(interaction, config, client);
        } catch (error) {
            logger.error('Search command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'search',
                source: 'search_router',
            });
        }
    },
};
