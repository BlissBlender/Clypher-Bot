// market.js — /market
// Player-driven marketplace.

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { createListing, buyListing, cancelListing, getActiveListings, getSellerListings } from '../../services/marketService.js';
import { shopItems } from '../../config/shop/items.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Browse and trade in the player marketplace')
        .addSubcommand(sub =>
            sub.setName('browse')
                .setDescription('Browse active listings')
                .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setRequired(false).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('sell')
                .setDescription('List an item for sale')
                .addStringOption(opt => opt.setName('item').setDescription('Item ID to sell').setRequired(true))
                .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity to sell').setRequired(true).setMinValue(1))
                .addIntegerOption(opt => opt.setName('price').setDescription('Price per item').setRequired(true).setMinValue(100))
        )
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Purchase from a listing')
                .addStringOption(opt => opt.setName('listing_id').setDescription('Listing ID to buy from').setRequired(true))
                .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity to buy').setRequired(false).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Cancel your listing')
                .addStringOption(opt => opt.setName('listing_id').setDescription('Listing ID to cancel').setRequired(true))
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
            case 'browse': {
                const page = interaction.options.getInteger('page') || 1;
                const { listings, total, totalPages } = await getActiveListings(client, guildId, page);

                if (listings.length === 0) {
                    throw createError('No listings', ErrorTypes.VALIDATION,
                        'No active listings on the marketplace. Be the first to sell something with `/market sell`!');
                }

                const lines = listings.map(l =>
                    `${l.itemEmoji} **${l.itemName}** x${l.quantity} — ${symbol}${l.price.toLocaleString()} ea = ${symbol}${(l.price * l.quantity).toLocaleString()}\n` +
                    `   🆔 \`${l.id}\` • Seller: <@${l.sellerId}> • Expires: <t:${Math.floor(l.expiresAt / 1000)}:R>`
                );

                const embed = createEmbed({
                    title: '🏪 Player Marketplace',
                    description: lines.join('\n\n'),
                    color: 'economy',
                    footer: `Page ${page}/${totalPages} • ${total} active listing(s)`,
                    timestamp: true,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'sell': {
                const itemId = interaction.options.getString('item').toLowerCase();
                const quantity = interaction.options.getInteger('quantity');
                const price = interaction.options.getInteger('price');

                const item = shopItems.find(i => i.id === itemId);
                if (!item) {
                    throw createError('Item not found', ErrorTypes.VALIDATION,
                        `Item \`${itemId}\` not found in the shop catalog.`);
                }

                const listing = await createListing(client, guildId, userId, itemId, quantity, price);

                const embed = createEmbed({
                    title: '📦 Item Listed!',
                    description: `Your **${item.name}** x${quantity} is now on the marketplace!`,
                    color: 'money',
                    fields: [
                        { name: 'Listing ID', value: `\`${listing.id}\``, inline: true },
                        { name: 'Price', value: `${symbol}${price.toLocaleString()} each`, inline: true },
                        { name: 'Total Value', value: `${symbol}${(price * quantity).toLocaleString()}`, inline: true },
                        { name: 'Listing Fee', value: `${symbol}${listing.fee.toLocaleString()} (5%)`, inline: true },
                        { name: 'Expires', value: `<t:${Math.floor(listing.expiresAt / 1000)}:R>`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[MARKET] ${userId} listed ${quantity}x ${itemId} @ ${price}`);
                break;
            }

            case 'buy': {
                const listingId = interaction.options.getString('listing_id');
                const quantity = interaction.options.getInteger('quantity') || 1;

                const result = await buyListing(client, guildId, listingId, userId, quantity);

                const embed = createEmbed({
                    title: '🛒 Purchase Successful!',
                    description: `You bought ${result.quantity}x from listing \`${listingId}\`!`,
                    color: 'money',
                    fields: [
                        { name: 'Total Cost', value: `${symbol}${result.totalCost.toLocaleString()}`, inline: true },
                        { name: 'Tax (3%)', value: `${symbol}${result.tax.toLocaleString()}`, inline: true },
                        { name: 'Seller Receives', value: `${symbol}${result.sellerPayout.toLocaleString()}`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'cancel': {
                const listingId = interaction.options.getString('listing_id');
                const result = await cancelListing(client, guildId, listingId, userId);

                const embed = createEmbed({
                    title: '🚫 Listing Cancelled',
                    description: result.message,
                    color: 'warning',
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }
        }
    }, { command: 'market' })
};
