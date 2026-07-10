import { getMemberInvitesKey, getInviteTrackingKey } from '../utils/database/keys.js';

export async function cacheGuildInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        const snapshot = {};
        for (const [code, invite] of invites) {
            snapshot[code] = {
                code,
                uses: invite.uses ?? 0,
                inviterId: invite.inviter?.id ?? null,
            };
        }
        await guild.client.db.set(getInviteTrackingKey(guild.id), snapshot);
    } catch {
        // Missing Manage Server permission
    }
}

export async function trackMemberJoin(member) {
    try {
        const invites = await member.guild.invites.fetch();
        const previous = (await member.client.db.get(getInviteTrackingKey(member.guild.id))) || {};
        let usedInvite = null;

        for (const [code, invite] of invites) {
            const prevUses = previous[code]?.uses ?? 0;
            if ((invite.uses ?? 0) > prevUses) {
                usedInvite = invite;
                break;
            }
        }

        await cacheGuildInvites(member.guild);

        if (!usedInvite?.inviter) return null;

        const inviterId = usedInvite.inviter.id;
        const key = getMemberInvitesKey(member.guild.id, inviterId);
        const data = (await member.client.db.get(key)) || { count: 0, invited: [] };
        data.count = (data.count || 0) + 1;
        data.invited = [...(data.invited || []), { userId: member.id, joinedAt: Date.now() }].slice(-100);
        await member.client.db.set(key, data);

        return { inviterId, code: usedInvite.code };
    } catch {
        return null;
    }
}

export async function getMemberInviteStats(client, guildId, userId) {
    return (await client.db.get(getMemberInvitesKey(guildId, userId))) || { count: 0, invited: [] };
}

export async function getInviteLeaderboard(client, guildId, limit = 10) {
    if (!client.db?.list) return [];

    const prefix = `guild:${guildId}:invites:`;
    let keys = await client.db.list(prefix);
    if (!Array.isArray(keys)) {
        keys = [];
    }

    const results = [];
    for (const key of keys) {
        const userId = key.split(':').pop();
        const data = await client.db.get(key);
        if (data?.count > 0) {
            results.push({ userId, count: data.count });
        }
    }

    return results.sort((a, b) => b.count - a.count).slice(0, limit);
}
