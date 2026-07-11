// transactions.js — /transactions
// View transaction history, search, and stats.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { getCurrencySymbol } from '../../utils/economy.js';
import { getTransactions, searchTransactions, getTransactionStats } from '../../services/transactionService.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('transactions')
        .setDescription('View your transaction history')
        .addSubcommand(sub =>
            sub.setName('recent').setDescription('Show your recent transactions')
        )
        .addSubcommand(sub =>
            sub.setName('search')
                .setDescription('Search your transaction history')
                .addStringOption(opt => opt.setName('query').setDescription('Search query (source, description)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('stats').setDescription('View your transaction statistics')
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
            case 'recent': {
                const txs = await getTransactions(client, guildId, userId, 15);
                if (txs.length === 0) {
                    throw createError('No transactions', ErrorTypes.VALIDATION,
                        'You have no transactions yet. Start earning with `/earn daily`!');
                }

                const lines = txs.map((tx, i) => {
                    const sign = tx.type === 'INCOME' ? '+' : (tx.type === 'EXPENSE' ? '-' : '↔');
                    const icon = tx.type === 'INCOME' ? '🟢' : (tx.type === 'EXPENSE' ? '🔴' : '🔄');
                    const time = `<t:${Math.floor(tx.timestamp / 1000)}:R>`;
                    return `${icon} \`${sign}${symbol}${Math.abs(tx.amount).toLocaleString()}\` • ${tx.source} • ${time}`;
                });

                const embed = createEmbed({
                    title: '📋 Recent Transactions',
                    description: lines.join('\n'),
                    color: 'info',
                    footer: `Showing last ${txs.length} transactions`,
                    timestamp: true,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'search': {
                const query = interaction.options.getString('query');
                const results = await searchTransactions(client, guildId, userId, { search: query, limit: 20 });

                if (results.length === 0) {
                    throw createError('No results', ErrorTypes.VALIDATION,
                        `No transactions found matching \`${query}\`.`);
                }

                const lines = results.map((tx, i) => {
                    const sign = tx.type === 'INCOME' ? '+' : (tx.type === 'EXPENSE' ? '-' : '↔');
                    const icon = tx.type === 'INCOME' ? '🟢' : (tx.type === 'EXPENSE' ? '🔴' : '🔄');
                    return `${icon} \`${sign}${symbol}${Math.abs(tx.amount).toLocaleString()}\` • ${tx.source} • ${tx.description || ''}`;
                });

                const embed = createEmbed({
                    title: `🔍 Search: "${query}"`,
                    description: lines.join('\n') || 'No matching transactions.',
                    color: 'info',
                    footer: `${results.length} result(s) found`,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }

            case 'stats': {
                const stats = await getTransactionStats(client, guildId, userId);

                const embed = createEmbed({
                    title: '📊 Transaction Statistics',
                    color: 'money',
                    fields: [
                        {
                            name: '📈 Summary',
                            value: [
                                `**Total Transactions:** ${stats.total}`,
                                `**Total Income:** ${symbol}${stats.totalIncome.toLocaleString()} (${stats.incomeCount} tx)`,
                                `**Total Expenses:** ${symbol}${stats.totalExpense.toLocaleString()} (${stats.expenseCount} tx)`,
                                `**Total Transfers:** ${symbol}${stats.totalTransfers.toLocaleString()} (${stats.transferCount} tx)`,
                            ].join('\n'),
                            inline: false,
                        },
                        {
                            name: '🏆 Biggest',
                            value: [
                                `**Income:** ${symbol}${stats.biggestIncome.amount.toLocaleString()} (${stats.biggestIncome.source})`,
                                `**Expense:** ${symbol}${stats.biggestExpense.amount.toLocaleString()} (${stats.biggestExpense.source})`,
                            ].join('\n'),
                            inline: false,
                        },
                        {
                            name: '📂 By Source',
                            value: Object.entries(stats.bySource)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10)
                                .map(([source, count]) => `**${source}:** ${count}`)
                                .join('\n') || 'No data',
                            inline: false,
                        },
                    ],
                    timestamp: true,
                });

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
                break;
            }
        }

        logger.debug(`[ECONOMY] Transactions ${subcommand} viewed for ${userId}`);
    }, { command: 'transactions' })
};
