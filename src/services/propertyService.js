// propertyService.js
// Property system with buy, upgrade, sell, and passive income.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { logTransaction } from './transactionService.js';
import { BotConfig } from '../config/bot.js';

const PROPERTY_TYPES = BotConfig.economy?.properties || {};
const MAX_LEVEL = PROPERTY_TYPES.maxLevel || 10;
const UPGRADE_COST_MULTIPLIER = PROPERTY_TYPES.upgradeCostMultiplier || 2.0;
const INCOME_PER_LEVEL = PROPERTY_TYPES.incomePerLevel || 1.5;

/**
 * Get property type definitions.
 */
export function getPropertyTypes() {
    return [
        { id: 'starterHouse', ...PROPERTY_TYPES.starterHouse, maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
        { id: 'shop',         ...PROPERTY_TYPES.shop,         maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
        { id: 'warehouse',    ...PROPERTY_TYPES.warehouse,    maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
        { id: 'factory',      ...PROPERTY_TYPES.factory,      maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
        { id: 'office',       ...PROPERTY_TYPES.office,       maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
        { id: 'mansion',      ...PROPERTY_TYPES.mansion,      maxLevel: MAX_LEVEL, upgradeCostMultiplier: UPGRADE_COST_MULTIPLIER, incomePerLevel: INCOME_PER_LEVEL },
    ].filter(p => p.price && p.income);
}

/**
 * Find a property type by ID.
 */
function getPropertyType(propertyId) {
    return getPropertyTypes().find(p => p.id === propertyId);
}

/**
 * Calculate upgrade cost for a property.
 */
function getUpgradeCost(propertyType, level) {
    return Math.floor(propertyType.price * Math.pow(UPGRADE_COST_MULTIPLIER, level - 1) * 0.5);
}

/**
 * Calculate property value based on type and level.
 */
function getPropertyValue(propertyType, level) {
    return Math.floor(propertyType.price * Math.pow(1.2, level - 1));
}

/**
 * Calculate daily income for a property.
 */
function getDailyIncome(propertyType, level) {
    return Math.floor(propertyType.income * Math.pow(INCOME_PER_LEVEL, level - 1));
}

/**
 * Buy a property.
 */
export async function buyProperty(client, guildId, userId, propertyId) {
    const propertyType = getPropertyType(propertyId);
    if (!propertyType) {
        throw createError('Invalid property', ErrorTypes.VALIDATION,
            `Property type \`${propertyId}\` does not exist.`,
            { propertyId });
    }

    const userData = await getEconomyData(client, guildId, userId);
    const properties = Array.isArray(userData.properties) ? userData.properties : [];

    // Check if user already owns this property type
    if (properties.some(p => p.propertyId === propertyId)) {
        throw createError('Already owned', ErrorTypes.VALIDATION,
            `You already own a **${propertyType.name}**. Upgrade it instead.`,
            { propertyId });
    }

    const price = propertyType.price;
    if ((userData.wallet || 0) < price) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `You need ${price.toLocaleString()} coins to buy a **${propertyType.name}**. You have ${(userData.wallet || 0).toLocaleString()} coins.`,
            { required: price, wallet: userData.wallet });
    }

    // Create property
    const property = {
        propertyId,
        name: propertyType.name,
        emoji: propertyType.emoji || '🏠',
        level: 1,
        value: getPropertyValue(propertyType, 1),
        income: getDailyIncome(propertyType, 1),
        purchasedAt: Date.now(),
        totalEarned: 0,
    };

    // Deduct cost
    userData.wallet = (userData.wallet || 0) - price;
    userData.properties = [...properties, property];

    await setEconomyData(client, guildId, userId, userData);

    await logTransaction(client, guildId, userId, {
        amount: -price, type: 'EXPENSE', source: 'property_buy',
        description: `Purchased ${propertyType.emoji} ${propertyType.name}`,
        metadata: { propertyId, level: 1, propertyValue: property.value },
    });

    logger.info(`[PROPERTY] ${userId} bought ${propertyId} for ${price}`);
    return { property, price };
}

/**
 * View a user's properties.
 */
export async function viewProperties(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const properties = Array.isArray(userData.properties) ? userData.properties : [];

    return properties.map(p => {
        const propType = getPropertyType(p.propertyId);
        return {
            ...p,
            upgradeCost: propType ? getUpgradeCost(propType, p.level) : 0,
            nextIncome: propType ? getDailyIncome(propType, p.level + 1) : null,
        };
    });
}

/**
 * Upgrade a property.
 */
export async function upgradeProperty(client, guildId, userId, propertyId) {
    const propertyType = getPropertyType(propertyId);
    if (!propertyType) {
        throw createError('Invalid property', ErrorTypes.VALIDATION,
            `Property type \`${propertyId}\` does not exist.`,
            { propertyId });
    }

    const userData = await getEconomyData(client, guildId, userId);
    const properties = Array.isArray(userData.properties) ? userData.properties : [];
    const index = properties.findIndex(p => p.propertyId === propertyId);

    if (index === -1) {
        throw createError('Property not found', ErrorTypes.VALIDATION,
            `You don't own a **${propertyType.name}**.`,
            { propertyId });
    }

    const property = properties[index];
    if (property.level >= MAX_LEVEL) {
        throw createError('Max level', ErrorTypes.VALIDATION,
            `Your **${propertyType.name}** is already at max level ${MAX_LEVEL}.`,
            { propertyId, level: property.level, maxLevel: MAX_LEVEL });
    }

    const cost = getUpgradeCost(propertyType, property.level);
    if ((userData.wallet || 0) < cost) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `You need ${cost.toLocaleString()} coins to upgrade your **${propertyType.name}** to level ${property.level + 1}.`,
            { required: cost, wallet: userData.wallet, propertyId, nextLevel: property.level + 1 });
    }

    // Upgrade
    userData.wallet = (userData.wallet || 0) - cost;
    property.level += 1;
    property.value = getPropertyValue(propertyType, property.level);
    property.income = getDailyIncome(propertyType, property.level);
    properties[index] = property;
    userData.properties = properties;

    await setEconomyData(client, guildId, userId, userData);

    await logTransaction(client, guildId, userId, {
        amount: -cost, type: 'EXPENSE', source: 'property_upgrade',
        description: `Upgraded ${propertyType.emoji} ${propertyType.name} to level ${property.level}`,
        metadata: { propertyId, newLevel: property.level, newValue: property.value, newIncome: property.income },
    });

    logger.info(`[PROPERTY] ${userId} upgraded ${propertyId} to level ${property.level} for ${cost}`);
    return { property, cost, oldLevel: property.level - 1 };
}

/**
 * Sell a property.
 */
export async function sellProperty(client, guildId, userId, propertyId) {
    const propertyType = getPropertyType(propertyId);
    if (!propertyType) {
        throw createError('Invalid property', ErrorTypes.VALIDATION,
            `Property type \`${propertyId}\` does not exist.`,
            { propertyId });
    }

    const userData = await getEconomyData(client, guildId, userId);
    const properties = Array.isArray(userData.properties) ? userData.properties : [];
    const index = properties.findIndex(p => p.propertyId === propertyId);

    if (index === -1) {
        throw createError('Property not found', ErrorTypes.VALIDATION,
            `You don't own a **${propertyType.name}**.`,
            { propertyId });
    }

    const property = properties[index];
    const sellPrice = Math.floor(property.value * 0.75); // 75% of current value

    userData.wallet = (userData.wallet || 0) + sellPrice;
    userData.properties = [...properties.slice(0, index), ...properties.slice(index + 1)];

    await setEconomyData(client, guildId, userId, userData);

    await logTransaction(client, guildId, userId, {
        amount: sellPrice, type: 'INCOME', source: 'property_sell',
        description: `Sold ${propertyType.emoji} ${propertyType.name} (Level ${property.level})`,
        metadata: { propertyId, level: property.level, sellPrice },
    });

    logger.info(`[PROPERTY] ${userId} sold ${propertyId} (Lv.${property.level}) for ${sellPrice}`);
    return { property, sellPrice };
}

/**
 * Collect passive income from all properties.
 */
export async function collectPropertyIncome(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const properties = Array.isArray(userData.properties) ? userData.properties : [];

    if (properties.length === 0) return { totalIncome: 0, properties: [] };

    let totalIncome = 0;
    const updatedProperties = [];

    for (const prop of properties) {
        const propType = getPropertyType(prop.propertyId);
        if (!propType) continue;

        const income = getDailyIncome(propType, prop.level);
        prop.totalEarned = (prop.totalEarned || 0) + income;
        totalIncome += income;
        updatedProperties.push(prop);
    }

    userData.wallet = (userData.wallet || 0) + totalIncome;
    userData.properties = updatedProperties;
    await setEconomyData(client, guildId, userId, userData);

    if (totalIncome > 0) {
        await logTransaction(client, guildId, userId, {
            amount: totalIncome, type: 'INCOME', source: 'property_income',
            description: `Passive income from ${updatedProperties.length} property(ies)`,
            metadata: { propertyCount: updatedProperties.length },
        });
    }

    return { totalIncome, properties: updatedProperties };
}
