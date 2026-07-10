import { getAFKKey } from '../utils/database/keys.js';

export async function setAFK(client, guildId, userId, reason = 'AFK') {
    const key = getAFKKey(guildId, userId);
    await client.db.set(key, {
        reason: reason.slice(0, 200),
        setAt: Date.now(),
    });
}

export async function getAFK(client, guildId, userId) {
    const key = getAFKKey(guildId, userId);
    const data = await client.db.get(key);
    if (!data?.reason) return null;
    return data;
}

export async function clearAFK(client, guildId, userId) {
    const key = getAFKKey(guildId, userId);
    await client.db.delete(key);
}

export async function handleAFKMention(message, client) {
    if (!message.guild || message.author.bot) return false;

    const authorAFK = await getAFK(client, message.guild.id, message.author.id);
    if (authorAFK) {
        await clearAFK(client, message.guild.id, message.author.id);

        // Restore nickname by removing the [AFK] prefix if it's still there
        if (message.member?.nickname?.startsWith('[AFK] ')) {
            const originalName = message.member.nickname.slice(6).trim();
            if (originalName) {
                await message.member.setNickname(originalName).catch(() => {});
            }
        }

        const { createEmbed } = await import('../utils/embeds.js');
        await message.reply({
            embeds: [createEmbed({
                title: 'Welcome back!',
                description: 'Your AFK status has been removed.',
                color: 'success',
            })],
        }).catch(() => {});
    }

    const mentions = [...message.mentions.users.values()].filter((u) => !u.bot && u.id !== message.author.id);
    if (mentions.length === 0) return false;

    const lines = [];
    for (const user of mentions.slice(0, 5)) {
        const afk = await getAFK(client, message.guild.id, user.id);
        if (afk) {
            const ago = afk.setAt ? `<t:${Math.floor(afk.setAt / 1000)}:R>` : 'recently';
            lines.push(`**${user.displayName}** is AFK: ${afk.reason} (since ${ago})`);
        }
    }

    if (lines.length === 0) return false;

    const { createEmbed } = await import('../utils/embeds.js');
    await message.reply({
        embeds: [createEmbed({
            title: 'AFK',
            description: lines.join('\n'),
            color: 'info',
        })],
    }).catch(() => {});
    return true;
}
