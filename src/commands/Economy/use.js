// use.js — /use
// Consume/use items from inventory.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { shopItems } from '../../config/shop/items.js';
import { logTransaction } from '../../services/transactionService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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
                `Item \`${itemId}\` not found. Check your inventory for available items.`,
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
        let embedColor = 'info';

        // Handle different item effects
        if (item.effect?.type === 'gamble_boost') {
            // Lucky clover/charm — add lucky_clover uses to inventory
            const usesItemId = itemId === 'lucky_clover' ? 'lucky_clover' : 'lucky_charm';
            const uses = item.effect.uses || 1;
            userData.inventory[usesItemId] = (userData.inventory[usesItemId] || 0) + (uses * quantity);
            effects.push(`🍀 +${uses * quantity} gambling luck use(s)`);
            resultDescription = `You activated **${quantity}x ${item.name}**! You now have ${userData.inventory[usesItemId]} gambling boost uses.`;
        } else if (item.effect?.type === 'bank_capacity') {
            // Bank note — increase bank level
            userData.bankLevel = (userData.bankLevel || 0) + quantity;
            const increase = (item.effect.increase || 10000) * quantity;
            effects.push(`📈 Bank capacity increased by ${increase.toLocaleString()}`);
            resultDescription = `You used **${quantity}x ${item.name}**! Your bank capacity increased by ${increase.toLocaleString()} coins!`;
        } else if (item.effect?.type === 'command_boost') {
            // Extra work shift / ammo pack
            const boostItemId = `boost_${item.effect.command}`;
            userData.inventory[boostItemId] = (userData.inventory[boostItemId] || 0) + (item.effect.uses || 1) * quantity;
            effects.push(`⚡ +${(item.effect.uses || 1) * quantity} use(s) of \`/${item.effect.command}\``);
            resultDescription = `You activated **${quantity}x ${item.name}**! You can now use \`/${item.effect.command}\` an extra ${(item.effect.uses || 1) * quantity} time(s).`;
        } else if (item.effect?.type === 'robbery_protection') {
            // Personal safe — mark as active
            userData.upgrades = userData.upgrades || {};
            userData.upgrades.robbery_protection = true;
            effects.push('🔒 Robbery protection active');
            resultDescription = `You activated **${item.name}**! Your cash is now protected from thieves.`;
        } else {
            // Generic consumable — just mark as used
            effects.push('✅ Item consumed');
            resultDescription = `You used **${quantity}x ${item.name}**.`;
        }

        // Remove from inventory
        userData.inventory[itemId] = (userData.inventory[itemId] || 0) - quantity;
        if (userData.inventory[itemId] <= 0) {
            delete userData.inventory[itemId];
        }

        await setEconomyData(client, guildId, userId, userData);

        // Track as a transaction
        await logTransaction(client, guildId, userId, {
            amount: 0, type: 'EXPENSE', source: 'item_use',
            description: `Used ${quantity}x ${item.name}`,
            metadata: { itemId, quantity, effects },
        });

        const embed = createEmbed({
            title: `📦 Item Used`,
            description: resultDescription,
            color: embedColor,
            fields: effects.length > 0 ? [{ name: 'Effects Applied', value: effects.join('\n'), inline: false }] : [],
            footer: `Remaining: ${userData.inventory[itemId] || 0}x ${item.name}`,
        });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`[USE] ${userId} used ${quantity}x ${itemId}`);
    }, { command: 'use' })
};
