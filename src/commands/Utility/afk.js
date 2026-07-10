import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { setAFK } from '../../services/afkService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status')
        .addStringOption((option) =>
            option.setName('reason').setDescription('Why you are AFK').setMaxLength(200).setRequired(false),
        ),
    category: 'Utility',

    async execute(interaction, config, client) {
        try {
            const reason = interaction.options.getString('reason') || 'AFK';
            await setAFK(client, interaction.guildId, interaction.user.id, reason);

            const displayName = interaction.member?.displayName || interaction.user.username;
            const afkName = `[AFK] ${displayName}`.slice(0, 32);

            if (interaction.member?.manageable) {
                await interaction.member.setNickname(afkName).catch(() => {});
            }

            await InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: 'AFK Set',
                    description: `You are now AFK: **${reason}**\nMentioning you will show this status.`,
                    color: 'info',
                })],
            });
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'afk' });
        }
    },
};
