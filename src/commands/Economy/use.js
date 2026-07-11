// use.js — /use
// Consume/use items from inventory. Supports all item effect types.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { shopItems, getRarityEmoji, RARITIES } from '../../config/shop/items.js';
import { logTransaction } from '../../services/transactionService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RARITY_LIST = Object.keys(RARITIES);

export default {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use/consume an item from your inventory')
        .addStringOption(opt =>
            opt.setName('item')
                .setDescription('Item ID to use')
                .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('quantity')
                .setDescription('Quantity to use')
                .setRequired(false)
                .setMinValue(1)
        ),
    category: 'Economy',

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const itemId = interaction.options.getString('item').toLowerCase();
        const quantity = interaction.options.getInteger('quantity') || 1;

        const item = shopItems.find(i => i.id === itemId);
        if (!item) {
            throw createError('Item not found', ErrorTypes.VALIDATION,
                `Item \`${itemId}\` not found. Check your inventory with \`/inventory\`.`,
                { itemId });
        }

        // Collectible items can't be "used" — they're display-only
        if (item.category === 'collectible' || item.effect?.type === 'collectible') {
            throw createError('Cannot use collectible', ErrorTypes.VALIDATION,
                `**${item.name}** is a collectible item and cannot be used. It exists in your inventory as a status symbol!`,
                { itemId });
        }

        const userData = await getEconomyData(client, guildId, userId);
        const inventory = userData.inventory || {};
        const owned = inventory[itemId] || 0;

        if (owned < quantity) {
            throw createError('Insufficient items', ErrorTypes.VALIDATION,
                `You only have ${owned}x **${item.name}**, but you're trying to use ${quantity}x.`,
                { owned, required: quantity, itemId });
        }

        const effects = [];
        let resultDescription = '';
        let embedColor = 'money';

        switch (item.effect?.type) {

            // ── 🍀 Gambling Boost ──────────────────────────
            case 'gamble_boost': {
                const uses = (item.effect.uses || 1) * quantity;
                userData.inventory[`gamble_boost`] = (userData.inventory[`gamble_boost`] || 0) + uses;
                effects.push(`🎲 +${uses} gambling boost use(s)`);
                resultDescription = `You activated **${quantity}x ${item.name}**! You now have ${userData.inventory.gamble_boost} gambling boost uses.`;
                break;
            }

            // ── 🃏 Gamble Save (Joker Card) ────────────────
            case 'gamble_save': {
                const saves = (item.effect.savePercent || 1.0);
                userData.inventory[`gamble_save`] = (userData.inventory[`gamble_save`] || 0) + quantity;
                effects.push(`🃏 +${quantity} gamble save(s) — keeps your bet if you lose!`);
                resultDescription = `You activated **${quantity}x ${item.name}**! Your next ${quantity} gambling loss(es) will be refunded.`;
                break;
            }

            // ── 🏦 Bank Capacity ────────────────────────────
            case 'bank_capacity': {
                if (item.effect.increase) {
                    userData.bankLevel = (userData.bankLevel || 0) + quantity;
                    const increase = (item.effect.increase || 10000) * quantity;
                    effects.push(`📈 Bank capacity +${increase.toLocaleString()}`);
                    resultDescription = `You used **${quantity}x ${item.name}**! Bank capacity increased by ${increase.toLocaleString()} CR!`;
                } else if (item.effect.multiplier) {
                    userData.upgrades = userData.upgrades || {};
                    userData.upgrades[itemId] = true;
                    effects.push(`🏦 Bank capacity multiplier x${item.effect.multiplier}`);
                    resultDescription = `You installed **${item.name}**! Bank capacity multiplier activated!`;
                }
                break;
            }

            // ── 💰 Bank Interest ────────────────────────────
            case 'bank_interest': {
                userData.upgrades = userData.upgrades || {};
                userData.upgrades[itemId] = true;
                const rate = (item.effect.interestRate || 0.02) * 100;
                effects.push(`💸 Passive bank interest: ${rate}%`);
                resultDescription = `You activated **${item.name}**! Your bank will now generate ${rate}% interest over time.`;
                break;
            }

            // ── 📈 Investment ───────────────────────────────
            case 'investment': {
                userData.upgrades = userData.upgrades || {};
                userData.upgrades[itemId] = true;
                effects.push(`📈 Investment opportunities unlocked!`);
                resultDescription = `You activated **${item.name}**! Advanced investment options are now available.`;
                break;
            }

            // ── 📋 Command Boost ────────────────────────────
            case 'command_boost': {
                const cmd = item.effect.command || 'work';
                const uses = (item.effect.uses || 1) * quantity;
                userData.inventory[`boost_${cmd}`] = (userData.inventory[`boost_${cmd}`] || 0) + uses;
                effects.push(`⚡ +${uses} extra use(s) of \`/${cmd}\``);
                resultDescription = `You activated **${quantity}x ${item.name}**! You can now use \`/${cmd}\` ${uses} more time(s) without cooldown.`;
                break;
            }

            // ── ⚡ Earnings Boost ───────────────────────────
            case 'earnings_boost': {
                const multiplier = item.effect.multiplier || 2.0;
                const uses = (item.effect.uses || 3) * quantity;
                const source = item.effect.source || 'all';
                userData.inventory[`earnings_boost`] = (userData.inventory[`earnings_boost`] || 0) + uses;
                // Use highest multiplier to avoid weaker boosters overwriting stronger ones
                userData.inventory[`earnings_multiplier`] = Math.max(
                    userData.inventory[`earnings_multiplier`] || 1, multiplier
                );
                effects.push(`💰 x${multiplier} earnings boost for ${uses} action(s)`);
                resultDescription = `You consumed **${quantity}x ${item.name}**! Your next ${uses} economy actions will earn ${(multiplier - 1) * 100}% more!`;
                break;
            }

            // ── 🗺️ Treasure Hunt ───────────────────────────
            case 'treasure_hunt': {
                const min = item.effect.min || 5000;
                const max = item.effect.max || 50000;
                let totalReward = 0;
                for (let i = 0; i < quantity; i++) {
                    totalReward += Math.floor(Math.random() * (max - min + 1)) + min;
                }
                userData.wallet = (userData.wallet || 0) + totalReward;
                effects.push(`💰 +${totalReward.toLocaleString()} CR discovered!`);
                resultDescription = `You used **${quantity}x ${item.name}** and discovered **${totalReward.toLocaleString()} CR** in treasure!`;
                break;
            }

            // ── 🎁 Mystery Box ──────────────────────────────
            case 'mystery_box': {
                const possibleRarities = item.effect.possibleRarities || ['common', 'uncommon', 'rare'];
                const guaranteed = item.effect.guaranteedRarity;
                for (let i = 0; i < quantity; i++) {
                    const rarityRoll = guaranteed
                        ? possibleRarities[Math.floor(Math.random() * possibleRarities.length)]
                        : weightedRandom(possibleRarities);
                    const rarityConfig = RARITIES[rarityRoll] || RARITIES.common;
                    // Find a random item of matching rarity
                    const matchingItems = shopItems.filter(si => si.rarity === rarityRoll && si.id !== 'mystery_box' && si.id !== 'premium_box');
                    if (matchingItems.length > 0) {
                        const won = matchingItems[Math.floor(Math.random() * matchingItems.length)];
                        userData.inventory[won.id] = (userData.inventory[won.id] || 0) + 1;
                        effects.push(`${rarityConfig.emoji} +1x **${won.name}** (${rarityConfig.name})`);
                    } else {
                        // Fallback: give coins
                        const coinReward = rarityRoll === 'common' ? 1000 : rarityRoll === 'uncommon' ? 5000 : rarityRoll === 'rare' ? 15000 : rarityRoll === 'epic' ? 50000 : 200000;
                        userData.wallet = (userData.wallet || 0) + coinReward;
                        effects.push(`💰 +${coinReward.toLocaleString()} CR (${rarityConfig.name} drop)`);
                    }
                }
                resultDescription = `You opened **${quantity}x ${item.name}**!`;
                embedColor = 'rare';
                break;
            }

            // ── 🛡️ Robbery Protection ──────────────────────
            case 'robbery_protection': {
                if (item.effect.oneTime) {
                    userData.inventory[`protection_charge`] = (userData.inventory[`protection_charge`] || 0) + quantity;
                    effects.push(`🔒 +${quantity} protection charge(s) — one robbery blocked each`);
                } else {
                    userData.upgrades = userData.upgrades || {};
                    userData.upgrades.robbery_protection = true;
                    effects.push(`🔒 Permanent robbery protection active`);
                }
                resultDescription = `You activated **${item.name}**! Your cash is now protected from thieves.`;
                break;
            }

            // ── 🥩 Pet Food (used via /pets feed — stores food charges) ──
            case 'pet_food': {
                const xpGain = (item.effect.xpGain || 15) * quantity;
                userData.inventory[`pet_food_charges`] = (userData.inventory[`pet_food_charges`] || 0) + quantity;
                userData.inventory[`pet_xp_boost`] = (userData.inventory[`pet_xp_boost`] || 0) + xpGain;
                effects.push(`🐾 +${quantity} pet food charge(s) (+${xpGain} XP when fed)`);
                resultDescription = `You stored **${quantity}x ${item.name}**! Feed your pet with \`/pets feed\` to use the XP boost.`;
                break;
            }

            // ── 🧸 Pet Toy ──────────────────────────────────
            case 'pet_toy': {
                const mult = item.effect.xpMultiplier || 1.5;
                userData.inventory[`pet_toy_boost`] = (userData.inventory[`pet_toy_boost`] || 0) + quantity;
                effects.push(`🧸 x${mult} pet training XP for ${quantity} training(s)`);
                resultDescription = `You gave your pet a **${item.name}**! Next ${quantity} training(s) will give ${Math.round((mult - 1) * 100)}% more XP.`;
                break;
            }

            // ── 🏠 Pet Upgrade ──────────────────────────────
            case 'pet_upgrade': {
                userData.upgrades = userData.upgrades || {};
                userData.upgrades[itemId] = true;
                effects.push(`🐾 Passive pet XP: ${item.effect.passiveXpPerHour || 5} XP/hour`);
                resultDescription = `You set up the **${item.name}**! Your pets now gain ${item.effect.passiveXpPerHour || 5} XP per hour passively.`;
                break;
            }

            // ── 🧰 Repair Kit ───────────────────────────────
            case 'repair': {
                const repairAmt = (item.effect.repairAmount || 50) * quantity;
                effects.push(`🔧 Repairs ${repairAmt} durability across your tools`);
                resultDescription = `You used **${quantity}x ${item.name}**! Your tools are repaired by ${repairAmt} durability total.`;
                break;
            }

            // ── 🛠️ Tool (passive effects, just mark as used) ─
            case 'mining_yield':
            case 'fishing_yield':
            case 'work_yield':
            case 'hunting_yield':
            case 'cooking_yield':
            case 'cooking_unlock':
            case 'crime_boost':
            case 'treasure_boost':
            case 'daily_bonus': {
                // These are passive tool effects — no activation needed
                effects.push(`🛠️ Tool equipped — passive bonus active`);
                resultDescription = `You equipped **${item.name}**! Its passive bonus is now active.`;
                break;
            }

            // ── ❓ Unknown effect type ──────────────────────
            default: {
                effects.push('✅ Item consumed');
                resultDescription = `You used **${quantity}x ${item.name}**.`;
                embedColor = 'info';
            }
        }

        // Remove from inventory (unless it's a tool that stays equipped)
        if (item.type !== 'tool' || item.effect?.type === 'treasure_hunt' || item.effect?.type === 'mystery_box') {
            userData.inventory[itemId] = (userData.inventory[itemId] || 0) - quantity;
            if (userData.inventory[itemId] <= 0) {
                delete userData.inventory[itemId];
            }
        }

        await setEconomyData(client, guildId, userId, userData);

        await logTransaction(client, guildId, userId, {
            amount: 0, type: 'EXPENSE', source: 'item_use',
            description: `Used ${quantity}x ${item.name} (${item.effect?.type || 'unknown'})`,
            metadata: { itemId, quantity, effects, effectType: item.effect?.type },
        });

        const rarityEmoji = getRarityEmoji(item.rarity);

        const embed = createEmbed({
            title: `${rarityEmoji} Item Used`,
            description: resultDescription,
            color: embedColor,
            fields: effects.length > 0 ? [{ name: '📦 Results', value: effects.join('\n'), inline: false }] : [],
            footer: `${(userData.inventory[itemId] || 0)}x ${item.name} remaining`,
        });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`[USE] ${userId} used ${quantity}x ${itemId} (${item.effect?.type || 'none'})`);
    }, { command: 'use' })
};

/**
 * Weighted random selection for mystery box rarity drops.
 * Common: 45%, Uncommon: 30%, Rare: 15%, Epic: 8%, Legendary: 2%
 */
function weightedRandom(rarities) {
    const weights = {
        common: 45, uncommon: 30, rare: 15, epic: 8, legendary: 2,
    };
    const pool = [];
    for (const r of rarities) {
        const w = weights[r] || 10;
        for (let i = 0; i < w; i++) pool.push(r);
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
