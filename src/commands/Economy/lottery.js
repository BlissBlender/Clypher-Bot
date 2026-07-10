import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

const LOTTERY_KEY_PREFIX = 'lottery:';

function getLotteryKey(guildId) {
    return `${LOTTERY_KEY_PREFIX}${guildId}`;
}

async function getLottery(client, guildId) {
    try {
        const key = getLotteryKey(guildId);
        const data = await client.db.get(key);
        return data || { pool: 0, tickets: {}, totalTickets: 0, lastDraw: null, active: true };
    } catch {
        return { pool: 0, tickets: {}, totalTickets: 0, lastDraw: null, active: true };
    }
}

async function saveLottery(client, guildId, lottery) {
    try {
        const key = getLotteryKey(guildId);
        await client.db.set(key, lottery);
    } catch (error) {
        logger.error('Failed to save lottery:', error);
    }
}

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Buy lottery tickets for a chance to win the jackpot!')
        .addSubcommand((sub) =>
            sub
                .setName('buy')
                .setDescription('Buy lottery tickets')
                .addIntegerOption((opt) =>
                    opt
                        .setName('tickets')
                        .setDescription('Number of tickets to buy')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('status').setDescription('View the current lottery status'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('draw')
                .setDescription('Draw the lottery winner (Admin only)'),
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            const lottery = await getLottery(client, guildId);

            if (!lottery.active || lottery.totalTickets === 0) {
                const embed = infoEmbed(
                    '🎫 Lottery Status',
                    'There is no active lottery in this server. Buy the first ticket with `/lottery buy <tickets>` to start one!',
                );
                return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }

            const ticketBreakdown = Object.entries(lottery.tickets)
                .slice(0, 10)
                .map(([id, count]) => `<@${id}> — ${count} ticket(s)`)
                .join('\n');

            const embed = createEmbed({
                title: '🎫 Current Lottery',
                description:                        `**Jackpot:** **$${lottery.pool.toLocaleString()}**\n**Total Tickets Sold:** ${lottery.totalTickets}\n**Ticket Price:** $${botConfig.economy.lotteryTicketPrice.toLocaleString()}\n\n**Recent Buyers:**\n${ticketBreakdown || 'None yet'}`,
                color: 'primary',
            })
                .setFooter({ text: 'Buy tickets with /lottery buy. Admin can draw with /lottery draw.' });

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'draw') {
            const lottery = await getLottery(client, guildId);

            if (!lottery.active || lottery.totalTickets === 0) {
                throw createError(
                    'No lottery active',
                    ErrorTypes.VALIDATION,
                    'There are no lottery tickets sold yet. Wait for users to buy tickets first.',
                );
            }

            // Weighted random draw based on tickets owned
            const entries = Object.entries(lottery.tickets);
            const totalWeight = lottery.totalTickets;
            let rand = Math.floor(Math.random() * totalWeight);

            let winnerId = null;
            for (const [id, count] of entries) {
                rand -= count;
                if (rand < 0) {
                    winnerId = id;
                    break;
                }
            }

            if (!winnerId) {
                // Fallback to last entry
                winnerId = entries[entries.length - 1][0];
            }

            const prize = lottery.pool;
            lottery.active = false;
            lottery.lastDraw = Date.now();
            lottery.lastWinner = winnerId;
            lottery.lastPrize = prize;

            await saveLottery(client, guildId, lottery);

            // Credit the winner
            const winnerData = await getEconomyData(client, guildId, winnerId);
            winnerData.wallet = (winnerData.wallet || 0) + prize;
            await setEconomyData(client, guildId, winnerId, winnerData);

            const embed = successEmbed(
                '🎉 Lottery Drawn!',
                `**Congratulations <@${winnerId}>!**\n\nYou won the lottery jackpot of **$${prize.toLocaleString()}**! 🎊\n\n(New balance: $${(winnerData.wallet || 0).toLocaleString()})`,
            );

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        // Buy subcommand
        if (subcommand === 'buy') {
            const tickets = interaction.options.getInteger('tickets');
            const cost = tickets * botConfig.economy.lotteryTicketPrice;

            const userData = await getEconomyData(client, guildId, userId);
            if (!userData) {
                throw createError(
                    'Failed to load economy data',
                    ErrorTypes.DATABASE,
                    'Failed to load your economy data.',
                    { userId, guildId }
                );
            }

            if ((userData.wallet || 0) < cost) {
                throw createError(
                    'Insufficient funds',
                    ErrorTypes.VALIDATION,
                    `Buying ${tickets} ticket(s) costs **$${cost.toLocaleString()}**, but you only have **$${userData.wallet.toLocaleString()}**.`,
                    { required: cost, current: userData.wallet }
                );
            }

            userData.wallet -= cost;
            await setEconomyData(client, guildId, userId, userData);

            const lottery = await getLottery(client, guildId);
            lottery.pool = (lottery.pool || 0) + cost;
            lottery.tickets[userId] = (lottery.tickets[userId] || 0) + tickets;
            lottery.totalTickets = (lottery.totalTickets || 0) + tickets;
            lottery.active = true;
            await saveLottery(client, guildId, lottery);

            const embed = successEmbed(
                '🎫 Tickets Purchased!',
                `You bought **${tickets} lottery ticket(s)** for **$${cost.toLocaleString()}**!\n\nThe current jackpot is **$${lottery.pool.toLocaleString()}** with **${lottery.totalTickets}** total tickets sold. Good luck! 🍀`,
            ).addFields(
                { name: 'Your Tickets', value: `${lottery.tickets[userId]}`, inline: true },
                { name: 'New Cash', value: `$${userData.wallet.toLocaleString()}`, inline: true },
            );

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }
    }, { command: 'lottery' }),
};
