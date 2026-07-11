// property.js — /property
// Buy, view, upgrade, and sell properties.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { buyProperty, viewProperties, upgradeProperty, sellProperty, getPropertyTypes } from '../../services/propertyService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('property')
        .setDescription('Manage your properties')
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Buy a property')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Property type to buy')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Starter House - 100,000 coins', value: 'starterHouse' },
                            { name: 'Small Shop - 250,000 coins', value: 'shop' },
                            { name: 'Warehouse - 500,000 coins', value: 'warehouse' },
                            { name: 'Industrial Factory - 1,000,000 coins', value: 'factory' },
                            { name: 'Corporate Office - 2,000,000 coins', value: 'office' },
                            { name: 'Luxury Mansion - 5,000,000 coins', value: 'mansion' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('view').setDescription('View your properties')
        )
        .addSubcommand(sub =>
            sub.setName('upgrade')
                .setDescription('Upgrade a property')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Property type to upgrade')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Starter House', value: 'starterHouse' },
                            { name: 'Small Shop', value: 'shop' },
                            { name: 'Warehouse', value: 'warehouse' },
                            { name: 'Industrial Factory', value: 'factory' },
                            { name: 'Corporate Office', value: 'office' },
                            { name: 'Luxury Mansion', value: 'mansion' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('sell')
                .setDescription('Sell a property')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Property type to sell')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Starter House', value: 'starterHouse' },
                            { name: 'Small Shop', value: 'shop' },
                            { name: 'Warehouse', value: 'warehouse' },
                            { name: 'Industrial Factory', value: 'factory' },
                            { name: 'Corporate Office', value: 'office' },
                            { name: 'Luxury Mansion', value: 'mansion' },
                        )
                )
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
            case 'buy': {
                const type = interaction.options.getString('type');
                const result = await buyProperty(client, guildId, userId, type);

                const propertyTypes = getPropertyTypes();
                const propType = propertyTypes.find(p => p.id === type);

                const embed = createEmbed({
                    title: `🏠 Property Purchased!`,
                    description: `You now own a **${result.property.emoji} ${result.property.name}**!`,
                    color: 'money',
                    fields: [
                        { name: 'Purchase Price', value: `${symbol}${result.price.toLocaleString()}`, inline: true },
                        { name: 'Level', value: `${result.property.level}`, inline: true },
                        { name: 'Current Value', value: `${symbol}${result.property.value.toLocaleString()}`, inline: true },
                        { name: 'Daily Income', value: `${symbol}${result.property.income.toLocaleString()}/day`, inline: true },
                        { name: 'Next Upgrade Cost', value: propType ? `${symbol}${Math.floor(propType.price * 0.5).toLocaleString()}` : 'N/A', inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[PROPERTY] ${userId} bought ${type} for ${result.price}`);
                break;
            }

            case 'view': {
                const properties = await viewProperties(client, guildId, userId);

                if (properties.length === 0) {
                    throw createError('No properties', ErrorTypes.VALIDATION,
                        'You don\'t own any properties yet. Buy one with `/property buy`!');
                }

                const lines = properties.map((p, i) =>
                    `${p.emoji} **${p.name}** (Lv.${p.level})\n` +
                    `   **Value:** ${symbol}${p.value.toLocaleString()} | **Income:** ${symbol}${p.income.toLocaleString()}/day\n` +
                    `   **Upgrade:** ${symbol}${p.upgradeCost.toLocaleString()} → Lv.${Math.min(p.level + 1, 10)}` +
                    (p.nextIncome ? ` (${symbol}${p.nextIncome.toLocaleString()}/day)` : ' (MAX)') +
                    `\n   **Total Earned:** ${symbol}${(p.totalEarned || 0).toLocaleString()}`
                );

                const totalIncome = properties.reduce((s, p) => s + p.income, 0);
                const totalValue = properties.reduce((s, p) => s + p.value, 0);

                const embed = createEmbed({
                    title: '🏘️ Your Properties',
                    description: lines.join('\n\n'),
                    color: 'economy',
                    fields: [
                        { name: '📊 Summary', value: `**Total Properties:** ${properties.length}\n**Total Value:** ${symbol}${totalValue.toLocaleString()}\n**Total Daily Income:** ${symbol}${totalIncome.toLocaleString()}`, inline: false },
                    ],
                    timestamp: true,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'upgrade': {
                const type = interaction.options.getString('type');
                const result = await upgradeProperty(client, guildId, userId, type);

                const embed = createEmbed({
                    title: `⬆️ Property Upgraded!`,
                    description: `Your **${result.property.emoji} ${result.property.name}** is now Level ${result.property.level}!`,
                    color: 'money',
                    fields: [
                        { name: 'Upgrade Cost', value: `${symbol}${result.cost.toLocaleString()}`, inline: true },
                        { name: 'Level', value: `${result.oldLevel} → ${result.property.level}`, inline: true },
                        { name: 'New Value', value: `${symbol}${result.property.value.toLocaleString()}`, inline: true },
                        { name: 'New Income', value: `${symbol}${result.property.income.toLocaleString()}/day`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[PROPERTY] ${userId} upgraded ${type} to Lv.${result.property.level}`);
                break;
            }

            case 'sell': {
                const type = interaction.options.getString('type');
                const result = await sellProperty(client, guildId, userId, type);

                const embed = createEmbed({
                    title: '💰 Property Sold!',
                    description: `You sold your **${result.property.emoji} ${result.property.name}** (Lv.${result.property.level}) for **${symbol}${result.sellPrice.toLocaleString()}**!`,
                    color: 'money',
                    fields: [
                        { name: 'Sale Price', value: `${symbol}${result.sellPrice.toLocaleString()} (75% of value)`, inline: true },
                        { name: 'Original Level', value: `${result.property.level}`, inline: true },
                    ],
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                logger.info(`[PROPERTY] ${userId} sold ${type} for ${result.sellPrice}`);
                break;
            }
        }
    }, { command: 'property' })
};
