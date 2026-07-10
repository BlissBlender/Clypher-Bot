const CONFIG_KEY_PREFIX = 'guild:';

function getConfigKey(guildId) {
    return `${CONFIG_KEY_PREFIX}${guildId}:starboard`;
}

export async function getStarboardConfig(client, guildId) {
    return (await client.db.get(getConfigKey(guildId))) || null;
}

export async function saveStarboardConfig(client, guildId, config) {
    await client.db.set(getConfigKey(guildId), config);
}

export async function handleStarboardReaction(reaction, client) {
    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }

    const message = reaction.message;
    if (!message.guild || message.author?.bot) return;

    const config = await getStarboardConfig(client, message.guild.id);
    if (!config?.enabled || !config.channelId) return;

    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    if (config.emoji && emoji !== config.emoji && reaction.emoji.name !== config.emoji) return;

    const threshold = config.threshold || 3;
    const count = reaction.count ?? 0;
    if (count < threshold) return;

    const starboardChannel = await message.guild.channels.fetch(config.channelId).catch(() => null);
    if (!starboardChannel?.isTextBased()) return;

    const existingKey = `guild:${message.guild.id}:starboard:msg:${message.id}`;
    const existing = await client.db.get(existingKey);
    if (existing?.starboardMessageId) {
        const starMsg = await starboardChannel.messages.fetch(existing.starboardMessageId).catch(() => null);
        if (starMsg) {
            await starMsg.edit({ content: `${emoji} **${count}** | ${message.channel}` }).catch(() => {});
        }
        return;
    }

    const { createEmbed } = await import('../utils/embeds.js');
    const embed = createEmbed({
        description: message.content?.slice(0, 2000) || '*No text content*',
        color: 'warning',
    })
        .setAuthor({
            name: message.author?.tag || 'Unknown',
            iconURL: message.author?.displayAvatarURL(),
        })
        .addFields({ name: 'Source', value: `[Jump to message](${message.url})`, inline: true })
        .setTimestamp(message.createdAt);

    if (message.attachments.size > 0) {
        embed.setImage(message.attachments.first().url);
    }

    const starMsg = await starboardChannel.send({
        content: `${emoji} **${count}** | ${message.channel}`,
        embeds: [embed],
    });

    await client.db.set(existingKey, { starboardMessageId: starMsg.id, originalMessageId: message.id });
}
