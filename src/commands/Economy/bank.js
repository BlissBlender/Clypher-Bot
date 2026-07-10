import { SlashCommandBuilder } from 'discord.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import deposit from './deposit.js';
import withdraw from './withdraw.js';

const HANDLERS = {
    deposit,
    withdraw,
};

export default {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Manage your bank deposits and withdrawals')
        .addSubcommand((sub) =>
            sub
                .setName('deposit')
                .setDescription('Deposit money from your wallet into your bank')
                .addStringOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('Amount to deposit (number or "all")')
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('withdraw')
                .setDescription('Withdraw money from your bank into your wallet')
                .addIntegerOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1),
                ),
        ),
    category: 'Economy',

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = HANDLERS[subcommand];
            if (!handler) {
                throw new Error(`Unknown bank subcommand: ${subcommand}`);
            }
            return handler.execute(interaction, config, client);
        } catch (error) {
            logger.error('Bank command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'bank',
                source: 'bank_router',
            });
        }
    },
};
