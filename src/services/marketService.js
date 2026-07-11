// marketService.js
// Player-driven marketplace with listings, fees, and expiration.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { BotConfig } from '../config/bot.js';
import { shopItems } from '../config/shop/items.js';
import { logTransaction } from './transactionService.js';

const MARKET_PREFIX = 'market';
const CONFIG = BotConfig.economy?.market || {};
const LISTING_FEE = CONFIG.listingFee || 0.05;
const SALE_TAX = CONFIG.saleTax || 0.03;
const MAX_LISTINGS = CONFIG.maxListingsPerUser || 10;
const DURATION_MS = CONFIG.listingDurationMs || 86400000;
const MIN_PRICE = CONFIG.minPrice || 100;

/**
 * Generate a unique listing ID.
 */
function generateListingId(sellerId) {
    return `ml_${Date.now().toString(36)}_${sellerId.slice(-4)}`;
}

/**
 * Create a marketplace listing.
 */
export async function createListing(client, guildId, sellerId, itemId, quantity, price) {
    // Validate item
    const item = shopItems.find(i => i.id === itemId);
    if (!item) {
        throw createError('Item not found', ErrorTypes.VALIDATION,
            `Item \`${itemId}\` does not exist.`,
            { itemId });
    }

    if (quantity < 1) {
        throw createError('Invalid quantity', ErrorTypes.VALIDATION,
            'Quantity must be at least 1.',
            { quantity });
    }

    if (price < MIN_PRICE) {
        throw createError('Price too low', ErrorTypes.VALIDATION,
            `Minimum listing price is ${MIN_PRICE.toLocaleString()} coins.`,
            { minPrice: MIN_PRICE });
    }

    // Check seller listings count
    const existingListings = await getSellerListings(client, guildId, sellerId);
    if (existingListings.length >= MAX_LISTINGS) {
        throw createError('Max listings', ErrorTypes.VALIDATION,
            `You can only have ${MAX_LISTINGS} active listings at a time.`,
            { maxListings: MAX_LISTINGS, current: existingListings.length });
    }

    // Check seller has the item
    const sellerData = await getEconomyData(client, guildId, sellerId);
    const owned = (sellerData.inventory || {})[itemId] || 0;
    if (owned < quantity) {
        throw createError('Insufficient items', ErrorTypes.VALIDATION,
            `You only have ${owned}x **${item.name}**, but you're trying to sell ${quantity}x.`,
            { owned, required: quantity, itemId });
    }

    // Calculate listing fee
    const totalPrice = price * quantity;
    const fee = Math.floor(totalPrice * LISTING_FEE);

    if (fee > 0 && (sellerData.wallet || 0) < fee) {
        throw createError('Insufficient funds for fee', ErrorTypes.VALIDATION,
            `The listing fee is ${fee.toLocaleString()} coins (${LISTING_FEE * 100}% of total price). You don't have enough cash.`,
            { fee, wallet: sellerData.wallet });
    }

    // Deduct fee and items
    if (fee > 0) {
        sellerData.wallet = (sellerData.wallet || 0) - fee;
    }
    sellerData.inventory[itemId] = (sellerData.inventory[itemId] || 0) - quantity;
    if (sellerData.inventory[itemId] <= 0) delete sellerData.inventory[itemId];
    sellerData.activeListings = (sellerData.activeListings || 0) + 1;
    await setEconomyData(client, guildId, sellerId, sellerData);

    // Create listing
    const listing = {
        id: generateListingId(sellerId),
        sellerId,
        guildId,
        itemId,
        itemName: item.name,
        itemEmoji: item.emoji || '📦',
        quantity,
        price,
        totalPrice,
        fee,
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + DURATION_MS,
    };

    const key = `${MARKET_PREFIX}:${guildId}:${listing.id}`;
    await client.db.set(key, listing);

    // Log the fee
    if (fee > 0) {
        await logTransaction(client, guildId, sellerId, {
            amount: -fee, type: 'EXPENSE', source: 'market_fee',
            description: `Listing fee for ${quantity}x ${item.name}`,
            metadata: { listingId: listing.id, itemId, quantity, price },
        });
    }

    logger.info(`[MARKET] Listing created: ${listing.id} — ${quantity}x ${itemId} @ ${price} ea`);
    return listing;
}

/**
 * Buy from a listing.
 */
export async function buyListing(client, guildId, listingId, buyerId, quantity = 1) {
    const key = `${MARKET_PREFIX}:${guildId}:${listingId}`;
    const listing = await client.db.get(key, null);

    if (!listing || listing.status !== 'active') {
        throw createError('Listing not found', ErrorTypes.VALIDATION,
            'This listing no longer exists or has been sold.',
            { listingId });
    }

    if (listing.sellerId === buyerId) {
        throw createError('Cannot buy own listing', ErrorTypes.VALIDATION,
            'You cannot buy your own listing.',
            { listingId });
    }

    if (Date.now() > listing.expiresAt) {
        listing.status = 'expired';
        await client.db.set(key, listing);
        throw createError('Listing expired', ErrorTypes.VALIDATION,
            'This listing has expired.',
            { listingId });
    }

    if (quantity > listing.quantity) {
        throw createError('Insufficient quantity', ErrorTypes.VALIDATION,
            `This listing only has ${listing.quantity}x available.`,
            { available: listing.quantity, requested: quantity });
    }

    const totalCost = listing.price * quantity;
    const tax = Math.floor(totalCost * SALE_TAX);
    const sellerPayout = totalCost - tax;

    // Check buyer has funds
    const buyerData = await getEconomyData(client, guildId, buyerId);
    if ((buyerData.wallet || 0) < totalCost) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `You need ${totalCost.toLocaleString()} coins to buy ${quantity}x ${listing.itemName}.`,
            { required: totalCost, wallet: buyerData.wallet });
    }

    // Get seller data
    const sellerData = await getEconomyData(client, guildId, listing.sellerId);

    // Execute transaction
    buyerData.wallet = (buyerData.wallet || 0) - totalCost;
    sellerData.wallet = (sellerData.wallet || 0) + sellerPayout;

    // Transfer items
    buyerData.inventory = buyerData.inventory || {};
    buyerData.inventory[listing.itemId] = (buyerData.inventory[listing.itemId] || 0) + quantity;

    // Update listing
    listing.quantity -= quantity;
    if (listing.quantity <= 0) {
        listing.status = 'sold';
        // Update seller's active listing count
        sellerData.activeListings = Math.max(0, (sellerData.activeListings || 1) - 1);
    }

    // Save all
    await setEconomyData(client, guildId, buyerId, buyerData);
    await setEconomyData(client, guildId, listing.sellerId, sellerData);
    await client.db.set(key, listing);

    // Log transactions
    await logTransaction(client, guildId, buyerId, {
        amount: -totalCost, type: 'EXPENSE', source: 'market_buy',
        description: `Purchased ${quantity}x ${listing.itemName} from marketplace`,
        metadata: { listingId, sellerId: listing.sellerId, itemId: listing.itemId },
    });
    await logTransaction(client, guildId, listing.sellerId, {
        amount: sellerPayout, type: 'INCOME', source: 'market_sale',
        description: `Sold ${quantity}x ${listing.itemName} on marketplace`,
        metadata: { listingId, buyerId, itemId: listing.itemId, tax },
    });

    logger.info(`[MARKET] ${buyerId} bought ${quantity}x ${listing.itemId} from ${listing.sellerId} for ${totalCost}`);
    return { listing, totalCost, tax, sellerPayout, quantity };
}

/**
 * Cancel a listing (refund items).
 */
export async function cancelListing(client, guildId, listingId, userId) {
    const key = `${MARKET_PREFIX}:${guildId}:${listingId}`;
    const listing = await client.db.get(key, null);

    if (!listing) {
        throw createError('Listing not found', ErrorTypes.VALIDATION,
            'This listing does not exist.',
            { listingId });
    }

    if (listing.sellerId !== userId) {
        throw createError('Not your listing', ErrorTypes.PERMISSION,
            'You can only cancel your own listings.',
            { listingId, sellerId: listing.sellerId });
    }

    if (listing.status !== 'active') {
        throw createError('Listing not active', ErrorTypes.VALIDATION,
            `This listing is already ${listing.status}.`,
            { listingId, status: listing.status });
    }

    // Refund items
    const sellerData = await getEconomyData(client, guildId, userId);
    sellerData.inventory = sellerData.inventory || {};
    sellerData.inventory[listing.itemId] = (sellerData.inventory[listing.itemId] || 0) + listing.quantity;
    sellerData.activeListings = Math.max(0, (sellerData.activeListings || 1) - 1);
    await setEconomyData(client, guildId, userId, sellerData);

    listing.status = 'cancelled';
    await client.db.set(key, listing);

    logger.info(`[MARKET] Listing ${listingId} cancelled by ${userId}`);
    return { listing, message: `Cancelled listing for ${listing.quantity}x ${listing.itemName}. Items returned to inventory.` };
}

/**
 * Get active listings.
 */
export async function getActiveListings(client, guildId, page = 1, perPage = 10) {
    try {
        const allKeys = await client.db.list(`${MARKET_PREFIX}:${guildId}:`) || [];
        const listings = [];
        const now = Date.now();

        for (const key of allKeys) {
            const listing = await client.db.get(key, null);
            if (listing && listing.status === 'active' && now < listing.expiresAt) {
                listings.push(listing);
            }
            // Cleanup expired with status update
            if (listing && listing.status === 'active' && now >= listing.expiresAt) {
                listing.status = 'expired';
                await client.db.set(key, listing);
            }
        }

        listings.sort((a, b) => a.createdAt - b.createdAt);
        const total = listings.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const paged = listings.slice(start, start + perPage);

        return { listings: paged, total, totalPages, page };
    } catch (error) {
        logger.error(`[MARKET] Failed to get listings for guild ${guildId}:`, error);
        return { listings: [], total: 0, totalPages: 0, page: 1 };
    }
}

/**
 * Get a seller's listings.
 */
export async function getSellerListings(client, guildId, sellerId) {
    try {
        const allKeys = await client.db.list(`${MARKET_PREFIX}:${guildId}:`) || [];
        const now = Date.now();
        const listings = [];

        for (const key of allKeys) {
            const listing = await client.db.get(key, null);
            if (listing && listing.sellerId === sellerId) {
                if (listing.status === 'active' && now >= listing.expiresAt) {
                    listing.status = 'expired';
                    await client.db.set(key, listing);
                }
                listings.push(listing);
            }
        }

        return listings;
    } catch (error) {
        logger.error(`[MARKET] Failed to get seller listings for ${sellerId}:`, error);
        return [];
    }
}

/**
 * Clean up expired listings (restore items to seller).
 */
export async function cleanupExpiredListings(client, guildId) {
    try {
        const allKeys = await client.db.list(`${MARKET_PREFIX}:${guildId}:`) || [];
        const now = Date.now();
        let cleaned = 0;

        for (const key of allKeys) {
            const listing = await client.db.get(key, null);
            if (listing && listing.status === 'active' && now >= listing.expiresAt) {
                listing.status = 'expired';

                // Return items to seller
                const sellerData = await getEconomyData(client, guildId, listing.sellerId);
                sellerData.inventory = sellerData.inventory || {};
                sellerData.inventory[listing.itemId] = (sellerData.inventory[listing.itemId] || 0) + listing.quantity;
                sellerData.activeListings = Math.max(0, (sellerData.activeListings || 1) - 1);
                await setEconomyData(client, guildId, listing.sellerId, sellerData);
                await client.db.set(key, listing);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[MARKET] Cleaned up ${cleaned} expired listings in guild ${guildId}`);
        }
        return cleaned;
    } catch (error) {
        logger.error(`[MARKET] Cleanup error in guild ${guildId}:`, error);
        return 0;
    }
}
