import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a direct message to a user (Staff only)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to send a DM to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to send')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('anonymous')
                .setDescription('Send the message anonymously (default: false)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn('DM interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm',
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const message = interaction.options.getString('message');
        const anonymous = interaction.options.getBoolean('anonymous') || false;

        try {
            if (message.length > 2000) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Messages must be under 2,000 characters.',
                });
            }

            if (targetUser.bot) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.USER_INPUT,
                    message: 'You cannot send DMs to bot accounts.',
                });
            }

            const sanitized = sanitizeMarkdown(message);
            const senderName = anonymous
                ? '*Staff Team*'
                : `**${interaction.member?.displayName || interaction.user.username}**`;

            const dmChannel = await targetUser.createDM();

            // ── Gorgeous DM embed sent to the user ──
            const messageLines = sanitized.substring(0, 3800).split('\n');
            const quotedMessage = messageLines.map(line => `> ${line}`).join('\n');

            await dmChannel.send({
                embeds: [
                    createEmbed({
                        title: '📨 New Staff Message',
                        description: [
                            '',
                            '✦ ─── ⋅ ⋅ ─── ✦ ─── ⋅ ⋅ ─── ✦',
                            '',
                            `👤 **From:** ${senderName}`,
                            '',
                            '💬 **Message:**',
                            quotedMessage,
                            '',
                            '✦ ─── ⋅ ⋅ ─── ✦ ─── ⋅ ⋅ ─── ✦',
                            '',
                            '> 💡 This is an official staff communication.',
                            '> Replies to this message are **not monitored**.',
                            '> Contact a moderator in the server if needed.',
                        ].join('\n'),
                        color: 'primary',
                        thumbnail: interaction.guild.iconURL({ size: 256 }) || undefined,
                        footer: `📬 ${interaction.guild.name} · Staff Communication`,
                        timestamp: true,
                    }),
                ],
            });

            // ── Log the action ──
            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: 'DM Sent',
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Anonymous: ${anonymous ? 'Yes' : 'No'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length,
                    },
                },
            });

            // ── Confirmation for the moderator ──
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    createEmbed({
                        title: '✅ DM Delivered',
                        description: [
                            '',
                            '✦ ─── ⋅ ⋅ ─── ✦ ─── ⋅ ⋅ ─── ✦',
                            '',
                            `📨 **To:** ${targetUser} \`${targetUser.tag}\``,
                            `👤 **Moderator:** ${anonymous ? '*Anonymous*' : `**${interaction.user.username}**`}`,
                            `🔒 **Anonymous:** ${anonymous ? '✅ Yes' : '❌ No'}`,
                            '',
                            '💬 **Message:**',
                            `> ${sanitized.substring(0, 500).split('\n').join('\n> ')}`,
                            '',
                            '✦ ─── ⋅ ⋅ ─── ✦ ─── ⋅ ⋅ ─── ✦',
                            '',
                            '🟢 **Successfully delivered**',
                            `🆔 Logger: \`${interaction.id}\``,
                        ].join('\n'),
                        color: 'success',
                        thumbnail: targetUser.displayAvatarURL({ size: 128 }),
                        footer: '📬 Staff Communication System',
                        timestamp: true,
                    }),
                ],
            });
        } catch (error) {
            logger.error('DM command error:', error);

            if (error.code === 50007) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.USER_INPUT,
                    message: `Could not send a DM to **${targetUser.tag}**. They may have DMs disabled or be blocking the bot.`,
                });
            }

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: `Failed to send DM: ${error.message}`,
            });
        }
    },
};