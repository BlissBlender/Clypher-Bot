import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SLOT_EMOJIS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🔔'];

const PAYOUTS = {
    '🍒🍒🍒': { label: 'Cherry Trip', multiplier: 3 },
    '🍋🍋🍋': { label: 'Lemon Party', multiplier: 5 },
    '🍊🍊🍊': { label: 'Orange Crush', multiplier: 7 },
    '🍇🍇🍇': { label: 'Grape Escape', multiplier: 10 },
    '💎💎💎': { label: 'Diamond Jackpot!', multiplier: 50 },
    '7️⃣7️⃣7️⃣': { label: 'Lucky Sevens!', multiplier: 100 },
    '⭐⭐⭐': { label: 'Starstruck!', multiplier: 25 },
    '🔔🔔🔔': { label: 'Bell Ringer!', multiplier: 15 },
};

function spinReels() {
    return Array.from({ length: 3 }, () => SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)]);
}

function getResult(reels) {
    const key = reels.join('');
    return PAYOUTS[key] || null;
}

function buildBoard(reels) {
    return [
        '╔═══════════╗',
        `║ ${reels[0]} │ ${reels[1]} │ ${reels[2]} ║`,
        '╚═══════════╝',
    ].join('\n');
}

export default {
    data: new SlashCommandBuilder()
        .setName('slot')
        .setDescription('Spin the slot machine and test your luck!'),
    category: 'Fun',

    async execute(interaction, config, client) {
        try {
            await InteractionHelper.safeDefer(interaction);

            const reels = spinReels();
            const win = getResult(reels);
            const board = buildBoard(reels);

            let description;
            if (win) {
                description = `${board}\n\n🎉 **${win.label}** — You won with a multiplier of **×${win.multiplier}**!`;
            } else {
                description = `${board}\n\n😔 No luck this time. Better luck next spin!`;
            }

            const embed = successEmbed('🎰 Slot Machine', description);

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            logger.debug(`Slot command executed by user ${interaction.user.id}`);
        } catch (error) {
            logger.error('Slot command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'slot',
                source: 'slot_command',
            });
        }
    },
};
