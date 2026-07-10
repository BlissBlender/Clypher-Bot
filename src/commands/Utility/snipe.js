import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getSnipedMessage } from '../../services/snipeService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('View the last deleted message in this channel'),
    category: 'Utility',

    async execute(interaction, config, client) {
        try {
            const snipe = getSnipedMessage(interaction.guildId, interaction.channelId);
            if (!snipe) {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({
                        title: 'Nothing to snipe',
                        description: 'No recently deleted messages in this channel.',
                        color: 'warning',
                    })],
                });
            }

            const embed = createEmbed({
                title: 'Sniped Message',
                description: snipe.content || '*No text content*',
                color: 'info',
            })
                .setAuthor({ name: snipe.authorTag || 'Unknown', iconURL: snipe.authorAvatar })
                .setFooter({ text: `Deleted` })
                .setTimestamp(snipe.deletedAt);

            if (snipe.attachments?.length > 0) {
                embed.setImage(snipe.attachments[0]);
            }

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'snipe' });
        }
    },
};
