// moderationAntiNuke.js — Monitors destructive actions and triggers anti-nuke protection
//
// This file exports multiple event handlers that are individually registered by the
// event loader's file-level export pattern. Because the loader reads exports with
// `event?.name`, each handler is a separate named export with { name, execute }.

import { Events, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';
import { createEmbed } from '../utils/embeds.js';
import {
    getModerationConfig,
    recordNukeAction,
    getTotalNukeActions,
} from '../services/moderationService.js';
import { getColor } from '../config/bot.js';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Check anti-nuke config and punish if threshold is exceeded.
 */
async function checkNukeThreshold(guild, client, actionType, executorId = null, details = '') {
    try {
        const modConfig = await getModerationConfig(client, guild.id);
        const an = modConfig.antiNuke;
        if (!an?.enabled) return;

        // Record the action
        recordNukeAction(guild.id, actionType);
        const total = getTotalNukeActions(guild.id);
        const threshold = an.actionThreshold || 5;

        if (total < threshold) return;

        logger.warn(`[Anti-Nuke] Nuke detected in guild ${guild.id} — ${total} destructive actions in ${(an.detectionWindowMs || 10000) / 1000}s`);

        // 1. Try to find and punish the executor
        if (executorId && an.action === 'punish') {
            try {
                const member = await guild.members.fetch(executorId).catch(() => null);
                if (member) {
                    // Remove dangerous permissions
                    try {
                        // If they have admin, remove it temporarily
                        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                            // We can't directly remove admin from a member, but we can
                            // kick them and notify admins
                            await member.kick('Anti-Nuke: Mass destructive action detected');
                            logger.info(`[Anti-Nuke] Kicked executor ${executorId} from guild ${guild.id}`);
                        } else {
                            // Timeout for 1 hour
                            await member.timeout(3600000, 'Anti-Nuke: Destructive action spike detected');
                            logger.info(`[Anti-Nuke] Timed out executor ${executorId} in guild ${guild.id}`);
                        }
                    } catch (punishError) {
                        logger.warn(`[Anti-Nuke] Could not punish executor ${executorId}:`, punishError.message);
                    }
                }
            } catch {
                // User might already be banned
            }
        }

        // 2. Remove bot's admin perms from dangerous roles to prevent further damage
        try {
            const botMember = guild.members.me;
            if (botMember) {
                // Try to lock down by denying ManageChannels and ManageRoles for @everyone
                await guild.roles.everyone.setPermissions(
                    guild.roles.everyone.permissions.remove([
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageRoles,
                        PermissionFlagsBits.ManageWebhooks,
                        PermissionFlagsBits.BanMembers,
                        PermissionFlagsBits.KickMembers,
                        PermissionFlagsBits.Administrator,
                    ])
                ).catch(() => {});
            }
        } catch (permError) {
            logger.warn(`[Anti-Nuke] Could not adjust @everyone permissions:`, permError.message);
        }

        // 3. Notify staff
        if (an.notifyStaff !== false) {
            const logChannelId = modConfig.logChannelId;
            if (logChannelId) {
                const channel = guild.channels.cache.get(logChannelId);
                if (channel?.isTextBased()) {
                    const embed = createEmbed({
                        title: '💣 NUKE DETECTED — Auto-Protection Activated',
                        color: 'error',
                        fields: [
                            { name: 'Destructive Actions', value: `${total} in ${(an.detectionWindowMs || 10000) / 1000}s`, inline: true },
                            { name: 'Action Type', value: actionType, inline: true },
                            { name: 'Details', value: details || 'Mass destructive action detected', inline: false },
                            { name: 'Action Taken', value: executorId ? `Punished <@${executorId}>` : 'Permissions restricted', inline: false },
                            { name: 'Server', value: guild.name, inline: true },
                            { name: '⚠️', value: 'Check audit log immediately. Some settings may need manual restoration.', inline: false },
                        ],
                        timestamp: true,
                    });
                    await channel.send({ embeds: [embed], content: '@here' });
                }
            }
        }
    } catch (error) {
        logger.error(`[Anti-Nuke] Error in nuke check for guild ${guild.id}:`, error);
    }
}

// ── Channel Delete ───────────────────────────────────────────

export const antiNukeChannelDelete = {
    name: Events.ChannelDelete,
    async execute(channel, client) {
        if (!channel.guild) return;
        try {
            // Fetch audit log to find who deleted it
            let executorId = null;
            try {
                const auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 12, // CHANNEL_DELETE
                });
                const entry = auditLogs.entries.first();
                if (entry && entry.target.id === channel.id) {
                    executorId = entry.executor?.id || null;
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                channel.guild, client, 'channelDeletions',
                executorId,
                `Channel **${channel.name}** (${channel.id}) deleted`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in channelDelete:`, error);
        }
    },
};

// ── Channel Create (spam) ────────────────────────────────────

export const antiNukeChannelCreate = {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        if (!channel.guild) return;
        try {
            let executorId = null;
            try {
                const auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 10, // CHANNEL_CREATE
                });
                const entry = auditLogs.entries.first();
                if (entry && entry.target.id === channel.id) {
                    executorId = entry.executor?.id || null;
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                channel.guild, client, 'channelCreations',
                executorId,
                `Channel **${channel.name}** (${channel.id}) created`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in channelCreate:`, error);
        }
    },
};

// ── Role Delete ──────────────────────────────────────────────

export const antiNukeRoleDelete = {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
        if (!role.guild) return;
        try {
            let executorId = null;
            try {
                const auditLogs = await role.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 32, // ROLE_DELETE
                });
                const entry = auditLogs.entries.first();
                if (entry && entry.target.id === role.id) {
                    executorId = entry.executor?.id || null;
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                role.guild, client, 'roleDeletions',
                executorId,
                `Role **${role.name}** (${role.id}) deleted`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in roleDelete:`, error);
        }
    },
};

// ── Role Create (spam) ───────────────────────────────────────

export const antiNukeRoleCreate = {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
        if (!role.guild) return;
        try {
            let executorId = null;
            try {
                const auditLogs = await role.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 30, // ROLE_CREATE
                });
                const entry = auditLogs.entries.first();
                if (entry && entry.target.id === role.id) {
                    executorId = entry.executor?.id || null;
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                role.guild, client, 'roleCreations',
                executorId,
                `Role **${role.name}** (${role.id}) created`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in roleCreate:`, error);
        }
    },
};

// ── Guild Ban Add ────────────────────────────────────────────

export const antiNukeGuildBanAdd = {
    name: Events.GuildBanAdd,
    async execute(ban, client) {
        if (!ban.guild) return;
        try {
            let executorId = null;
            try {
                const auditLogs = await ban.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 22, // MEMBER_BAN_ADD
                });
                const entry = auditLogs.entries.first();
                if (entry && entry.target.id === ban.user.id) {
                    executorId = entry.executor?.id || null;
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                ban.guild, client, 'bans',
                executorId,
                `User **${ban.user.tag}** (${ban.user.id}) banned`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in guildBanAdd:`, error);
        }
    },
};

// ── Webhook Update (create/delete) ───────────────────────────

export const antiNukeWebhookUpdate = {
    name: Events.WebhooksUpdate,
    async execute(channel, client) {
        // WebhooksUpdate fires for any webhook change in a channel
        // We can't easily distinguish create vs delete without audit logs
        if (!channel.guild) return;
        try {
            // Check both create and delete in audit log
            let executorId = null;
            let actionType = 'webhookCreations';
            try {
                // Try create first
                let auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 1,
                    actionType: 50, // WEBHOOK_CREATE
                });
                let entry = auditLogs.entries.first();
                if (entry && entry.extra?.channel?.id === channel.id) {
                    executorId = entry.executor?.id || null;
                    actionType = 'webhookCreations';
                } else {
                    // Try delete
                    auditLogs = await channel.guild.fetchAuditLogs({
                        limit: 1,
                        actionType: 51, // WEBHOOK_DELETE
                    });
                    entry = auditLogs.entries.first();
                    if (entry && entry.extra?.channel?.id === channel.id) {
                        executorId = entry.executor?.id || null;
                        actionType = 'webhookDeletions';
                    }
                }
            } catch { /* no audit access */ }

            await checkNukeThreshold(
                channel.guild, client, actionType,
                executorId,
                `Webhook ${actionType === 'webhookCreations' ? 'created' : 'deleted'} in #${channel.name}`
            );
        } catch (error) {
            logger.error(`[Anti-Nuke] Error in webhookUpdate:`, error);
        }
    },
};
