import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from '../../utils/embeds.js';
import { createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import economyDashboard from './modules/economy_dashboard.js';
import profile from './profile.js';
import stats from './stats.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy commands and management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Open the economy management dashboard')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('View your economic profile')
                .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View server economy statistics')
        ),
    category: 'Economy',

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        // Dashboard requires ManageGuild; defer ephemerally for it
        if (subcommand === 'dashboard') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                throw createError(
                    'Permission denied',
                    ErrorTypes.PERMISSION,
                    'You need the **Manage Server** permission to use the economy dashboard.'
                );
            }
            const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
            if (!deferred) return;
            await economyDashboard.execute(interaction, config, client);
            return;
        }

        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        switch (subcommand) {
            case 'profile':
                await profile.execute(interaction, config, client);
                break;
            case 'stats':
                await stats.execute(interaction, config, client);
                break;
        }
    }
};