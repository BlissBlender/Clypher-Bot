import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor } from '../config/bot.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { getWelcomeConfig } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { setBirthday as dbSetBirthday } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
    getModerationConfig,
    recordJoin,
    enableRaidLockdown,
    sendRaidAlert,
} from '../services/moderationService.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        const client = member.client;
        
        const config = await getGuildConfig(client, guild.id);
        
        const welcomeConfig = await getWelcomeConfig(client, guild.id);
        
        const welcomeChannelId = welcomeConfig?.channelId;

        if (welcomeConfig?.enabled && welcomeChannelId) {
            const channel = guild.channels.cache.get(welcomeChannelId);
            if (channel?.isTextBased?.()) {
                const me = guild.members.me;
                const permissions = me ? channel.permissionsFor(me) : null;
                if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                    return;
                }

                const formatData = { user, guild, member };
                const welcomeMessage = formatWelcomeMessage(
                    welcomeConfig.welcomeMessage || welcomeConfig.welcomeEmbed?.description || 'Welcome {user} to {server}!',
                    formatData
                );

                const messageContent = welcomeConfig.welcomePing ? user.toString() : null;

                const embedTitle = formatWelcomeMessage(
                    welcomeConfig.welcomeEmbed?.title || '🎉 Welcome!',
                    formatData
                );
                const embedFooter = welcomeConfig.welcomeEmbed?.footer
                    ? formatWelcomeMessage(welcomeConfig.welcomeEmbed.footer, formatData)
                    : `Welcome to ${guild.name}!`;

                const canEmbed = permissions.has(PermissionFlagsBits.EmbedLinks);

                if (!canEmbed) {
                    await channel.send({
                        content: messageContent || welcomeMessage
                    });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(welcomeConfig.welcomeEmbed?.color || getColor('success'))
                        .setTitle(embedTitle)
                        .setDescription(welcomeMessage)
                        .setThumbnail(user.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                            { name: 'Member Count', value: guild.memberCount.toString(), inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: embedFooter });
                    
                    if (welcomeConfig.welcomeImage) {
                        embed.setImage(welcomeConfig.welcomeImage);
                    } else if (welcomeConfig.welcomeEmbed?.image?.url) {
                        embed.setImage(welcomeConfig.welcomeEmbed.image.url);
                    }
                    
                    await channel.send({ 
                        content: messageContent,
                        embeds: [embed] 
                    });
                }
            }
        }
        
        if (welcomeConfig?.roleIds && welcomeConfig.roleIds.length > 0) {
            const delay = welcomeConfig.autoRoleDelay || 0;
            const singleRoleId = welcomeConfig.roleIds[0];
            
            if (delay > 0) {
                const timeout = setTimeout(async () => {
                    const role = guild.roles.cache.get(singleRoleId);
                    if (role) {
                        await assignRoleSafely(member, role);
                    }
                }, delay * 1000);
                if (typeof timeout.unref === 'function') {
                    timeout.unref();
                }
            } else {
                const role = guild.roles.cache.get(singleRoleId);
                if (role) {
                    await assignRoleSafely(member, role);
                }
            }
        }
        
        if (config?.verification?.enabled || config?.verification?.autoVerify?.enabled) {
            await handleVerification(member, guild, config.verification, client);
        }

        // ── Anti-Raid: track joins and detect spikes ──
        await handleAntiRaidCheck(member, guild, client);

        try {
            await logEvent({
                client: client,
                guildId: guild.id,
                eventType: EVENT_TYPES.MEMBER_JOIN,
                data: {
                    title: 'User joined',
                    lines: [
                        `**User:** ${user.toString()} (${user.displayName !== user.username ? `@${user.displayName}` : user.tag})`,
                        `**ID:** \`${user.id}\``,
                        `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                        `**Members:** ${guild.memberCount}`,
                    ],
                    quoted: false,
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    userId: user.id,
                }
            });
        } catch (error) {
            logger.debug('Error logging member join:', error);
        }

        try {
            const counters = await getServerCounters(client, guild.id);
            for (const counter of counters) {
                if (counter && counter.type && counter.channelId && counter.enabled !== false) {
                    await updateCounter(client, guild, counter);
                }
            }
        } catch (error) {
            logger.debug('Error updating counters on member join:', error);
        }

        try {
            const backupKey = `guild:${guild.id}:birthdays:left`;
            const backup = (await client.db.get(backupKey)) || {};
            if (backup[user.id]) {
                const { month, day } = backup[user.id];
                await dbSetBirthday(client, guild.id, user.id, month, day);
                delete backup[user.id];
                await client.db.set(backupKey, backup);
                logger.debug(`Birthday restored for user ${user.id} in guild ${guild.id}`);
            }
        } catch (error) {
            logger.debug('Error restoring birthday on member join:', error);
        }
        
    } catch (error) {
        logger.error('Error in guildMemberAdd event:', error);
    }
  }
};

async function handleVerification(member, guild, verificationConfig, client) {
    const { autoVerifyOnJoin } = await import('../services/verificationService.js');
    
    try {
        const result = await autoVerifyOnJoin(client, guild, member, verificationConfig);
        
        if (result.autoVerified) {
            logger.info('User auto-verified on join', {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                roleName: result.roleName,
                criteria: result.criteria
            });
        } else {
            logger.debug('User not auto-verified on join', {
                guildId: guild.id,
                userId: member.id,
                reason: result.reason
            });
        }

    } catch (error) {
        logger.error('Error in auto-verification for member', {
            guildId: guild.id,
            userId: member.id,
            userTag: member.user.tag,
            error: error.message
        });
    }
}

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);
    } catch (error) {
        logger.warn(`Failed to assign role ${role.id} to member ${member.id}:`, error);
    }
}

/**
 * Anti-Raid: Track join rate, trigger lockdown if threshold exceeded.
 */
async function handleAntiRaidCheck(member, guild, client) {
    try {
        const modConfig = await getModerationConfig(client, guild.id);
        const ar = modConfig.antiRaid;
        if (!ar?.enabled) return;

        // Record this join
        const joins = recordJoin(guild.id);

        // Calculate join rate within detection window
        const now = Date.now();
        const windowMs = ar.detectionWindowMs || 60000;
        const recentJoins = joins.filter(t => now - t < windowMs);
        const joinCount = recentJoins.length;
        const threshold = ar.joinThreshold || 10;

        // If threshold exceeded, trigger raid protection
        if (joinCount >= threshold) {
            logger.warn(`[Anti-Raid] Raid detected in guild ${guild.id} — ${joinCount} joins in ${windowMs / 1000}s`);

            // 1. Enable lockdown
            if (ar.action === 'lockdown' || ar.action === 'lockdown_alert') {
                await enableRaidLockdown(guild);
            }

            // 2. Alert moderators
            if (ar.alertModerators !== false) {
                await sendRaidAlert(client, guild.id, modConfig, 'Join Spike',
                    `**${joinCount} users** joined in the last **${windowMs / 1000}s** (threshold: ${threshold}).\nAction: ${ar.action || 'lockdown'}`
                );
            }

            // 3. Restrict suspicious users (new accounts)
            if (ar.restrictNewAccounts !== false) {
                const accountAge = now - member.user.createdTimestamp;
                const maxAge = ar.newAccountAgeMs || 604800000; // 7 days
                if (accountAge < maxAge) {
                    try {
                        // Timeout the suspicious user for 1 hour
                        await member.timeout(3600000, 'Anti-Raid: New account joining during raid spike');
                        logger.info(`[Anti-Raid] Restricted new account ${member.user.tag} in guild ${guild.id}`);
                    } catch (timeoutError) {
                        logger.warn(`[Anti-Raid] Could not restrict new account ${member.user.id}:`, timeoutError.message);
                    }
                }
            }
        }
    } catch (error) {
        logger.error(`[Anti-Raid] Error checking raid for guild ${guild.id}:`, error);
    }
}
