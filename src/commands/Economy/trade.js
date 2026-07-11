// trade.js — /trade
// Peer-to-peer trading with double confirmation.

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { createTrade, confirmTrade, cancelTrade, declineTrade, getTrade } from '../../services/tradeService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade items and currency with other users')
        .addSubcommand(sub =>
            sub.setName('request')
                .setDescription('Send a trade request to a user')
                .addUserOption(opt => opt.setName('user').setDescription('User to trade with').setRequired(true))
                .addIntegerOption(opt => opt.setName('offer_currency').setDescription('Currency you offer').setRequired(false))
                .addStringOption(opt => opt.setName('offer_items').setDescription('Items you offer (format: item_id:qty,item_id2:qty)').setRequired(false))
                .addIntegerOption(opt => opt.setName('request_currency').setDescription('Currency you want').setRequired(false))
                .addStringOption(opt => opt.setName('request_items').setDescription('Items you want (format: item_id:qty)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('accept').setDescription('Accept a trade').addStringOption(opt => opt.setName('trade_id').setDescription('Trade ID to accept').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('decline').setDescription('Decline a trade').addStringOption(opt => opt.setName('trade_id').setDescription('Trade ID to decline').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('cancel').setDescription('Cancel a trade').addStringOption(opt => opt.setName('trade_id').setDescription('Trade ID to cancel').setRequired(true))
        ),
    category: 'Economy',

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();
        const symbol = getCurrencySymbol();

        switch (subcommand) {
            case 'request': {
                const targetUser = interaction.options.getUser('user');
                if (targetUser.bot) throw createError('Cannot trade with bots', ErrorTypes.VALIDATION, 'You cannot trade with bots.');
                if (targetUser.id === userId) throw createError('Cannot trade self', ErrorTypes.VALIDATION, 'You cannot trade with yourself.');

                const offerCurrency = interaction.options.getInteger('offer_currency') || 0;
                const requestCurrency = interaction.options.getInteger('request_currency') || 0;
                const offerItemsStr = interaction.options.getString('offer_items') || '';
                const requestItemsStr = interaction.options.getString('request_items') || '';

                if (offerCurrency <= 0 && !offerItemsStr && requestCurrency <= 0 && !requestItemsStr) {
                    throw createError('Empty trade', ErrorTypes.VALIDATION, 'You must offer or request something.');
                }

                const parseItems = (str) => {
                    if (!str) return {};
                    const items = {};
                    for (const part of str.split(',')) {
                        const [id, qty] = part.trim().split(':');
                        if (id && qty) items[id.trim()] = parseInt(qty) || 1;
                    }
                    return items;
                };

                const offer = {
                    currency: offerCurrency,
                    items: parseItems(offerItemsStr),
                    requestCurrency,
                    requestItems: parseItems(requestItemsStr),
                };

                const trade = await createTrade(client, guildId, userId, targetUser.id, offer);

                const embed = createEmbed({
                    title: '🔄 Trade Request Sent',
                    description: `Trade request sent to **${targetUser.username}**!`,
                    color: 'info',
                    fields: [
                        {
                            name: '📝 Trade ID',
                            value: `\`${trade.id}\``,
                            inline: false,
                        },
                        {
                            name: `${interaction.user.username} offers`,
                            value: offer.currency > 0 ? `${symbol}${offer.currency.toLocaleString()}` : 'Nothing',
                            inline: true,
                        },
                        {
                            name: `${targetUser.username} offers`,
                            value: requestCurrency > 0 ? `${symbol}${requestCurrency.toLocaleString()}` : 'Nothing',
                            inline: true,
                        },
                    ],
                    footer: 'The recipient must accept within 2 minutes.',
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[TRADE] Request sent from ${userId} to ${targetUser.id}: ${trade.id}`);

                // DM the recipient
                try {
                    const dmEmbed = createEmbed({
                        title: '🔄 New Trade Request',
                        description: `${interaction.user.username} wants to trade with you!`,
                        color: 'info',
                        fields: [
                            { name: 'Trade ID', value: `\`${trade.id}\``, inline: false },
                            { name: 'They offer', value: offer.currency > 0 ? `${symbol}${offer.currency.toLocaleString()}` : 'Nothing', inline: true },
                            { name: 'They want', value: requestCurrency > 0 ? `${symbol}${requestCurrency.toLocaleString()}` : 'Nothing', inline: true },
                            { name: 'To accept', value: `\`/trade accept trade_id:${trade.id}\``, inline: false },
                            { name: 'To decline', value: `\`/trade decline trade_id:${trade.id}\``, inline: false },
                        ],
                    });
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch { /* DM may be closed */ }
                break;
            }

            case 'accept': {
                const tradeId = interaction.options.getString('trade_id');
                const result = await confirmTrade(client, guildId, tradeId, userId);

                const embed = createEmbed({
                    title: result.completed ? '✅ Trade Completed!' : '⏳ Trade Confirmed',
                    description: result.message,
                    color: result.completed ? 'money' : 'info',
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'decline': {
                const tradeId = interaction.options.getString('trade_id');
                const result = await declineTrade(client, guildId, tradeId, userId);

                const embed = createEmbed({
                    title: '❌ Trade Declined',
                    description: result.message,
                    color: 'spending',
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'cancel': {
                const tradeId = interaction.options.getString('trade_id');
                const result = await cancelTrade(client, guildId, tradeId, userId);

                const embed = createEmbed({
                    title: '🚫 Trade Cancelled',
                    description: result.message,
                    color: 'warning',
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }
        }
    }, { command: 'trade' })
};
