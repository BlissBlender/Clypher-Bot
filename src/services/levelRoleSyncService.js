import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData, saveLevelingConfig } from './leveling.js';

async function listLevelUserIds(client, guildId) {
    if (!client.db?.list) return [];

    // Primary: correct key format with `guild:` prefix
    const CORRECT_PREFIX = `guild:${guildId}:leveling:users:`;
    // Legacy fallback: old key format without `guild:` prefix
    const LEGACY_PREFIX = `${guildId}:leveling:users:`;
    const prefixes = [CORRECT_PREFIX, LEGACY_PREFIX];
    const userIds = new Set();

    for (const prefix of prefixes) {
        let keys = await client.db.list(prefix).catch(() => []);
        if (!Array.isArray(keys)) {
            keys = typeof keys === 'object' && keys !== null ? Object.keys(keys) : [];
        }

        for (const key of keys) {
            if (!key.startsWith(prefix)) continue;
            const userId = key.slice(prefix.length);
            if (/^\d{17,19}$/.test(userId)) userIds.add(userId);

            // Migrate legacy keys to correct format with sanitization
            if (prefix === LEGACY_PREFIX) {
                const correctKey = `guild:${guildId}:leveling:users:${userId}`;
                const data = await client.db.get(key).catch(() => null);
                if (data) {
                    const sanitized = {
                        xp: Math.max(0, Number(data.xp) || 0),
                        level: Math.max(0, Math.min(Number(data.level) || 0, 1000)), // matches MAX_LEVEL in services/leveling.js
                        totalXp: Math.max(0, Number(data.totalXp) || 0),
                        lastMessage: Number(data.lastMessage) || 0,
                        rank: Number(data.rank) || 0
                    };
                    await client.db.set(correctKey, sanitized).catch(() => {});
                    await client.db.delete(key).catch(() => {});
                }
            }
        }
    }

    return [...userIds];
}

async function tryAwardRole(member, roleId, level) {
    const role = member.guild.roles.cache.get(roleId) || (await member.guild.roles.fetch(roleId).catch(() => null));
    if (!role || member.roles.cache.has(roleId)) return false;

    await member.roles.add(role, `Level ${level} reward (startup sync)`);
    return true;
}

export async function reconcileLevelRoles(client, guildId = null) {
    const summary = {
        scannedGuilds: 0,
        prunedRewardEntries: 0,
        rolesReAwarded: 0,
        errors: 0,
    };

    const guilds = guildId
        ? [client.guilds.cache.get(guildId)].filter(Boolean)
        : [...client.guilds.cache.values()];

    for (const guild of guilds) {
        summary.scannedGuilds += 1;

        try {
            const cfg = await getLevelingConfig(client, guild.id);
            if (cfg.enabled === false) continue;

            const rewards = { ...(cfg.roleRewards || {}) };
            if (Object.keys(rewards).length === 0) continue;

            let configChanged = false;

            for (const [level, roleId] of Object.entries(rewards)) {
                const role =
                    guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
                if (!role) {
                    delete rewards[level];
                    configChanged = true;
                    summary.prunedRewardEntries += 1;
                    logger.warn(
                        `Removed missing level ${level} reward role ${roleId} from config in guild ${guild.id}`,
                    );
                }
            }

            if (configChanged) {
                cfg.roleRewards = rewards;
                await saveLevelingConfig(client, guild.id, cfg);
            }

            if (Object.keys(rewards).length === 0) continue;

            const userIds = await listLevelUserIds(client, guild.id);

            for (const userId of userIds) {
                const levelData = await getUserLevelData(client, guild.id, userId);
                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) continue;

                for (const [levelStr, roleId] of Object.entries(rewards)) {
                    const requiredLevel = Number(levelStr);
                    if (!Number.isFinite(requiredLevel) || levelData.level < requiredLevel) continue;

                    try {
                        const awarded = await tryAwardRole(member, roleId, requiredLevel);
                        if (awarded) summary.rolesReAwarded += 1;
                    } catch (awardError) {
                        summary.errors += 1;
                        logger.warn(
                            `Could not re-award level ${requiredLevel} role to ${userId} in guild ${guild.id}:`,
                            awardError.message,
                        );
                    }
                }
            }
        } catch (error) {
            summary.errors += 1;
            logger.warn(`Level role sync failed for guild ${guild.id}:`, error.message);
        }
    }

    return summary;
}
