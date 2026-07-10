import { createRequire } from 'module';
import { GatewayDispatchEvents } from 'discord.js';
import { logger } from '../../utils/logger.js';
import lavalinkConfig from '../../config/lavalink.js';
import { setupPlayerHandler } from './playerHandler.js';

const require = createRequire(import.meta.url);
const { Riffy } = require('riffy');

/**
 * Check whether Lavalink is pointing at a real remote host (not localhost).
 * On Render / Railway there is no local Lavalink, so we skip music entirely
 * to avoid infinite ECONNREFUSED reconnect loops.
 */
function isLavalinkConfiguredForProduction() {
    if (!lavalinkConfig.nodes?.length) return false;

    // If ALL nodes point at localhost/127.0.0.1 and we're in production, skip
    const allLocal = lavalinkConfig.nodes.every((n) => {
        const host = (n.host || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    });

    if (allLocal && process.env.NODE_ENV === 'production') {
        logger.warn('Lavalink is configured with localhost in production — skipping music initialization.');
        logger.warn('To enable music, deploy a Lavalink server and set LAVALINK_HOST to its address.');
        return false;
    }

    return true;
}

export function initializeMusic(client) {
    if (!lavalinkConfig.nodes?.length) {
        logger.warn('No Lavalink nodes configured. Music commands will be unavailable.');
        logger.warn('To enable music, deploy a Lavalink server and set LAVALINK_HOST in your environment.');
        return;
    }

    if (!isLavalinkConfiguredForProduction()) {
        return;
    }

    client.riffy = new Riffy(client, lavalinkConfig.nodes, {
        send: (payload) => {
            const guild = client.guilds.cache.get(payload.d.guild_id);
            if (guild) {
                guild.shard.send(payload);
            }
        },
        defaultSearchPlatform: lavalinkConfig.defaultSearchPlatform,
        restVersion: lavalinkConfig.restVersion,
        bypassChecks: {
            nodeFetchInfo: true,
        },
    });

    setupPlayerHandler(client);

    client.on('raw', (packet) => {
        if (
            ![
                GatewayDispatchEvents.VoiceStateUpdate,
                GatewayDispatchEvents.VoiceServerUpdate,
            ].includes(packet.t)
        ) {
            return;
        }
        client.riffy.updateVoiceState(packet);
    });

    client.riffy.on('playerError', (player, error) => {
        logger.error(`Music player error in guild ${player.guildId}:`, error);
    });

    logger.info(`Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`);
}

export function initRiffyAfterReady(client) {
    if (client.riffy && client.user?.id) {
        client.riffy.init(client.user.id);
        logger.info('Riffy voice connection manager initialized.');
    }
}
