// moderation.js — /moderation dashboard command

import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';

import {
    buildModDashboardView,
    handleDashboardComponent,
    createDashboardCollectorFilter,
    isModDashboardCustomId,
} from './modules/moderation_dashboard.js';
import { getModerationConfig } from '../../services/moderationService.js';

const DASHBOARD_TIMEOUT_MS = 10 * 60 * 1000;

async function ensureManageGuild(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await replyUserError(interaction, {
            type: ErrorTypes.PERMISSION,
            message: 'You need the **Manage Server** permission to manage moderation settings.',
        });
        return false;
    }
    return true;
}

export default {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Configure anti-link, anti-spam, and auto-moderation')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((sub) =>
            sub
                .setName('dashboard')
                .setDescription('Open the interactive moderation dashboard'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('view')
                .setDescription('View current moderation settings'),
        ),

    category: 'Moderation',

    async execute(interaction, config, client) {
        try {
            if (!(await ensureManageGuild(interaction))) return;

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'view') {
                const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
                if (!deferred) return;

                const modConfig = await getModerationConfig(client, interaction.guildId);
                const view = await buildModDashboardView(client, interaction.guildId, interaction.guild, 'overview');
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [view.embed],
                    components: [],
                });
                return;
            }

            // ── Dashboard ──
            const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
            if (!deferred) return;

            const view = await buildModDashboardView(client, interaction.guildId, interaction.guild, 'overview');
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [view.embed],
                components: view.components,
            });

            const replyMessage = await interaction.fetchReply().catch(() => null);
            if (!replyMessage) return;

            const collector = replyMessage.createMessageComponentCollector({
                filter: createDashboardCollectorFilter(interaction.user.id, interaction.guildId),
                time: DASHBOARD_TIMEOUT_MS,
            });

            collector.on('collect', async (componentInteraction) => {
                try {
                    if (!isModDashboardCustomId(componentInteraction.customId)) return;
                    await handleDashboardComponent(componentInteraction, client);
                } catch (error) {
                    logger.error('[Moderation] Dashboard interaction failed:', {
                        error: error.message,
                        customId: componentInteraction.customId,
                        guildId: componentInteraction.guildId,
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    const finalView = await buildModDashboardView(client, interaction.guildId, interaction.guild, 'overview');
                    const disabledComponents = finalView.components.map((row) => {
                        const newRow = row.toJSON();
                        newRow.components = newRow.components.map((comp) => ({ ...comp, disabled: true }));
                        return newRow;
                    });
                    await replyMessage.edit({ components: disabledComponents }).catch(() => {});
                } catch {
                    // Ignore errors on dashboard expiry
                }
            });
        } catch (error) {
            logger.error('[Moderation] Command failed:', {
                error: error.message,
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });
            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Failed to open moderation dashboard.',
            }).catch(() => {});
        }
    },
};
