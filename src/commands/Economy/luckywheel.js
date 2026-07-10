import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const WHEEL_SEGMENTS = [
    // Big wins (rare)
    { label: '💰 JACKPOT!', emoji: '💰', multiplier: 20, weight: 2, color: '#F1C40F' },
    // Medium wins
    { label: 'Great Win', emoji: '💎', multiplier: 5, weight: 8, color: '#9B59B6' },
    { label: 'Nice Win', emoji: '🎉', multiplier: 3, weight: 15, color: '#2ECC71' },
    // Small wins
    { label: 'Small Win', emoji: '🍀', multiplier: 2, weight: 20, color: '#3498DB' },
    { label: 'Tiny Win', emoji: '🪙', multiplier: 1.5, weight: 20, color: '#95A5A6' },
    // Neutral
    { label: 'Free Spin', emoji: '🔄', freeSpin: true, weight: 10, color: '#1ABC9C' },
    // Losses
    { label: 'Lose Half', emoji: '💔', loseHalf: true, weight: 10, color: '#E74C3C' },
    { label: 'Nothing', emoji: '😔', multiplier: 0, weight: 15, color: '#7F8C8D' },
];

const SPIN_MESSAGES = [
    'The wheel spins rapidly, colours blurring together...',
    'You give the wheel a mighty spin and hold your breath...',
    'The wheel creaks as it turns, the pointer bouncing...',
    'Fortune favours the bold — the wheel is spinning!',
];

function weightedRandom(segments) {
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const segment of segments) {
        rand -= segment.weight;
        if (rand <= 0) return segment;
    }
    return segments[0];
}

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('luckywheel')
        .setDescription('Spin the lucky wheel for a chance to win big! Costs $500 to spin.'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            throw createError(
                'Failed to load economy data',
                ErrorTypes.DATABASE,
                'Failed to load your economy data.',
                { userId, guildId }
            );
        }

        const lastSpin = userData.lastWheel || 0;
        if (now < lastSpin + botConfig.economy.cooldowns.wheel) {
            const remaining = lastSpin + botConfig.economy.cooldowns.wheel - now;
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            throw createError(
                'Wheel cooldown active',
                ErrorTypes.RATE_LIMIT,
                `The wheel needs to reset. Spin again in **${minutes}m ${seconds}s**.`,
                { remaining, cooldownType: 'wheel' }
            );
        }

        if ((userData.wallet || 0) < botConfig.economy.luckyWheelCost) {
            throw createError(
                'Insufficient funds',
                ErrorTypes.VALIDATION,
                `Spinning the wheel costs **$${botConfig.economy.luckyWheelCost.toLocaleString()}**, but you only have **$${userData.wallet.toLocaleString()}**.`,
                { required: botConfig.economy.luckyWheelCost, current: userData.wallet }
            );
        }

        userData.wallet -= botConfig.economy.luckyWheelCost;
        const result = weightedRandom(WHEEL_SEGMENTS);
        const spinMessage = SPIN_MESSAGES[Math.floor(Math.random() * SPIN_MESSAGES.length)];

        let outcomeDescription = '';
        let payout = 0;

        if (result.loseHalf) {
            const lost = Math.floor((userData.wallet || 0) / 2);
            userData.wallet -= lost;
            outcomeDescription = `💔 **You lost half your cash!** -$${lost.toLocaleString()}`;
        } else if (result.freeSpin) {
            // Refund the spin cost
            userData.wallet += botConfig.economy.luckyWheelCost;
            outcomeDescription = '🔄 **Free Spin!** You get to spin again for free!';
        } else if (result.multiplier && result.multiplier > 0) {
            payout = Math.floor(botConfig.economy.luckyWheelCost * result.multiplier);
            userData.wallet += payout;
            outcomeDescription = `${result.emoji} **${result.label}!** You won **$${payout.toLocaleString()}**!`;
        } else {
            outcomeDescription = `${result.emoji} **Nothing this time.** Better luck next spin!`;
        }

        userData.lastWheel = now;
        await setEconomyData(client, guildId, userId, userData);

        const embed = createEmbed({
            title: '🎡 Lucky Wheel',
            description: `${spinMessage}\n\n**→ ${result.emoji} ${result.label} ←**\n\n${outcomeDescription}`,
            color: result.color || '#95A5A6',
        })
            .addFields(
                { name: 'Cost', value: `$${botConfig.economy.luckyWheelCost.toLocaleString()}`, inline: true },
                { name: 'New Cash', value: `$${userData.wallet.toLocaleString()}`, inline: true },
            )
            .setFooter({ text: 'Next spin available in 10 minutes.' });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'luckywheel' }),
};
