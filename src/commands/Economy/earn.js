import { SlashCommandBuilder } from 'discord.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import daily from './daily.js';
import work from './work.js';
import beg from './beg.js';
import fish from './fish.js';
import mine from './mine.js';
import crime from './crime.js';
import rob from './rob.js';
import gamble from './gamble.js';
import hustle from './slut.js';

const HANDLERS = {
    daily,
    work,
    beg,
    fish,
    mine,
    crime,
    rob,
    gamble,
    hustle,
};

export default {
    data: new SlashCommandBuilder()
        .setName('earn')
        .setDescription('Earn money through various activities')
        .addSubcommand((sub) =>
            sub.setName('daily').setDescription('Claim your daily cash reward'),
        )
        .addSubcommand((sub) =>
            sub.setName('work').setDescription('Work to earn some money'),
        )
        .addSubcommand((sub) =>
            sub.setName('beg').setDescription('Beg for spare change'),
        )
        .addSubcommand((sub) =>
            sub.setName('fish').setDescription('Go fishing to earn money'),
        )
        .addSubcommand((sub) =>
            sub.setName('mine').setDescription('Mine for valuable resources'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('crime')
                .setDescription('Commit a crime to earn money (risky)')
                .addStringOption((option) =>
                    option
                        .setName('type')
                        .setDescription('Type of crime to commit')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pickpocketing', value: 'pickpocketing' },
                            { name: 'Burglary', value: 'burglary' },
                            { name: 'Bank Heist', value: 'bank-heist' },
                            { name: 'Art Theft', value: 'art-theft' },
                            { name: 'Cybercrime', value: 'cybercrime' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('rob')
                .setDescription('Attempt to rob another user (very risky)')
                .addUserOption((option) =>
                    option.setName('user').setDescription('User to rob').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('gamble')
                .setDescription('Gamble your money for a chance to win more')
                .addIntegerOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('Amount of cash to gamble')
                        .setRequired(true)
                        .setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('hustle').setDescription('Take a risky side hustle for quick cash'),
        ),
    category: 'Economy',

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = HANDLERS[subcommand];
            if (!handler) {
                throw new Error(`Unknown earn subcommand: ${subcommand}`);
            }
            return handler.execute(interaction, config, client);
        } catch (error) {
            logger.error('Earn command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'earn',
                source: 'earn_router',
            });
        }
    },
};
