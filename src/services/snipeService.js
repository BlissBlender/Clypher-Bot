const snipeCache = new Map();
const MAX_CACHE_SIZE = 500;

export function cacheDeletedMessage(message) {
    if (!message.guild || message.author?.bot || !message.content && message.attachments.size === 0) {
        return;
    }

    const key = `${message.guild.id}:${message.channel.id}`;
    snipeCache.set(key, {
        content: message.content || null,
        authorId: message.author?.id,
        authorTag: message.author?.tag,
        authorAvatar: message.author?.displayAvatarURL({ size: 128 }),
        attachments: [...message.attachments.values()].map((a) => a.url),
        deletedAt: Date.now(),
        createdAt: message.createdTimestamp,
    });

    if (snipeCache.size > MAX_CACHE_SIZE) {
        const oldest = snipeCache.keys().next().value;
        snipeCache.delete(oldest);
    }
}

export function getSnipedMessage(guildId, channelId) {
    return snipeCache.get(`${guildId}:${channelId}`) || null;
}
