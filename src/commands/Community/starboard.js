import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getStarboardConfig, saveStarboardConfig } from '../../services/starboardService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Configure the starboard system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Set up the starboard channel')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Channel for starred messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('threshold')
                        .setDescription('Reactions needed to star (default: 3)')
                        .setMinValue(1)
                        .setMaxValue(50)
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option.setName('emoji').setDescription('Star emoji (default: ⭐)').setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('disable').setDescription('Disable the starboard'),
        )
        .addSubcommand((sub) =>
            sub.setName('status').setDescription('View starboard configuration'),
        ),
    category: 'Community',

    async execute(interaction, config, client) {
        try {
            const sub = interaction.options.getSubcommand();

            if (sub === 'setup') {
                const channel = interaction.options.getChannel('channel');
                const threshold = interaction.options.getInteger('threshold') ?? 3;
                const emoji = interaction.options.getString('emoji') ?? '⭐';

                await saveStarboardConfig(client, interaction.guildId, {
                    enabled: true,
                    channelId: channel.id,
                    threshold,
                    emoji,
                });

                return InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({
                        title: 'Starboard Enabled',
                        description: `Starred messages will appear in ${channel} after **${threshold}** ${emoji} reactions.`,
                        color: 'success',
                    })],
                });
            }

            if (sub === 'disable') {
                await saveStarboardConfig(client, interaction.guildId, { enabled: false });
                return InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({
                        title: 'Starboard Disabled',
                        description: 'The starboard has been turned off.',
                        color: 'warning',
                    })],
                });
            }

            const starConfig = await getStarboardConfig(client, interaction.guildId);
            const status = starConfig?.enabled
                ? `**Enabled** in <#${starConfig.channelId}> (${starConfig.threshold || 3} ${starConfig.emoji || '⭐'})`
                : '**Disabled**';

            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: 'Starboard Status',
                    description: status,
                    color: 'info',
                })],
            });
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'starboard' });
        }
    },
};
