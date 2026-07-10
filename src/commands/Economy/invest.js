import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

// Stock definitions — prices stored per-guild in a DB key
const STOCKS = [
    { symbol: 'TITN', name: 'Titan Corp', emoji: '🏢', basePrice: 150, volatility: 0.15 },
    { symbol: 'DISC', name: 'Discordia', emoji: '💬', basePrice: 220, volatility: 0.12 },
    { symbol: 'NVID', name: 'Nova Video', emoji: '🎮', basePrice: 480, volatility: 0.20 },
    { symbol: 'BANK', name: 'Bank of Bot', emoji: '🏦', basePrice: 95, volatility: 0.08 },
    { symbol: 'ENER', name: 'Energy Co', emoji: '⚡', basePrice: 65, volatility: 0.25 },
    { symbol: 'FOOD', name: 'FoodChain', emoji: '🍔', basePrice: 40, volatility: 0.10 },
    { symbol: 'META', name: 'Metaverse Inc', emoji: '🌐', basePrice: 310, volatility: 0.30 },
    { symbol: 'GOLD', name: 'Gold Reserve', emoji: '🥇', basePrice: 1800, volatility: 0.05 },
];

function getStocksKey(guildId) {
    return `stocks:${guildId}:prices`;
}

function getPortfolioKey(guildId, userId) {
    return `stocks:${guildId}:portfolio:${userId}`;
}

function generatePrices(stocks) {
    const prices = {};
    for (const stock of stocks) {
        const change = (Math.random() - 0.5) * 2 * stock.volatility;
        const newPrice = Math.max(1, Math.round(stock.basePrice * (1 + change)));
        prices[stock.symbol] = newPrice;
    }
    return prices;
}

async function getOrGeneratePrices(client, guildId) {
    try {
        const key = getStocksKey(guildId);
        const existing = await client.db.get(key);
        if (existing && existing.prices && existing.timestamp) {
            const age = Date.now() - existing.timestamp;
            // Regenerate prices every 30 minutes
            if (age < 30 * 60 * 1000) {
                return existing.prices;
            }
        }
        const prices = generatePrices(STOCKS);
        await client.db.set(key, { prices, timestamp: Date.now() });
        return prices;
    } catch {
        return generatePrices(STOCKS);
    }
}

async function getPortfolio(client, guildId, userId) {
    try {
        const key = getPortfolioKey(guildId, userId);
        const data = await client.db.get(key);
        return data || {};
    } catch {
        return {};
    }
}

async function savePortfolio(client, guildId, userId, portfolio) {
    try {
        const key = getPortfolioKey(guildId, userId);
        await client.db.set(key, portfolio);
    } catch (error) {
        logger.error('Failed to save portfolio:', error);
    }
}

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('invest')
        .setDescription('Buy and sell stocks on the bot stock market!')
        .addSubcommand((sub) =>
            sub
                .setName('buy')
                .setDescription('Buy shares of a stock')
                .addStringOption((opt) =>
                    opt.setName('symbol').setDescription('Stock symbol to buy').setRequired(true),
                )
                .addIntegerOption((opt) =>
                    opt.setName('shares').setDescription('Number of shares to buy').setRequired(true).setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('sell')
                .setDescription('Sell shares of a stock')
                .addStringOption((opt) =>
                    opt.setName('symbol').setDescription('Stock symbol to sell').setRequired(true),
                )
                .addIntegerOption((opt) =>
                    opt.setName('shares').setDescription('Number of shares to sell').setRequired(true).setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('portfolio').setDescription('View your stock portfolio'),
        )
        .addSubcommand((sub) =>
            sub.setName('market').setDescription('View current stock prices'),
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();

        const prices = await getOrGeneratePrices(client, guildId);
        const userData = await getEconomyData(client, guildId, userId);

        if (subcommand === 'market') {
            const lines = STOCKS.map((s) => {
                const price = prices[s.symbol] || s.basePrice;
                const change = ((price - s.basePrice) / s.basePrice * 100).toFixed(1);
                const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➖';
                return `${s.emoji} **${s.symbol}** — ${s.name}\n   Price: **$${price.toLocaleString()}** ${arrow} (${change}%)`;
            });

            const embed = createEmbed({
                title: '📊 Stock Market',
                description: lines.join('\n\n'),
                color: 'primary',
            }).setFooter({ text: 'Prices update every 30 minutes. Use /invest buy/sell to trade.' });

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'portfolio') {
            const portfolio = await getPortfolio(client, guildId, userId);
            const entries = Object.entries(portfolio);

            if (entries.length === 0) {
                const embed = warningEmbed(
                    '📂 Empty Portfolio',
                    'You don\'t own any stocks yet. Use `/invest buy <symbol> <shares>` to start trading!',
                );
                return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }

            let totalValue = 0;
            const lines = entries.map(([symbol, shares]) => {
                const stock = STOCKS.find((s) => s.symbol === symbol);
                const price = prices[symbol] || 0;
                const value = price * shares;
                totalValue += value;
                return `${stock?.emoji || '📄'} **${symbol}** — ${shares} shares × $${price.toLocaleString()} = **$${value.toLocaleString()}**`;
            });

            const embed = createEmbed({
                title: '📂 Your Portfolio',
                description: lines.join('\n'),
                color: 'primary',
            }).addFields(
                { name: 'Total Value', value: `$${totalValue.toLocaleString()}`, inline: true },
                { name: 'Cash Balance', value: `$${(userData?.wallet || 0).toLocaleString()}`, inline: true },
            );

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        const symbol = interaction.options.getString('symbol').toUpperCase();
        const stock = STOCKS.find((s) => s.symbol === symbol);
        if (!stock) {
            throw createError(
                'Invalid symbol',
                ErrorTypes.VALIDATION,
                `Unknown stock symbol **${symbol}**. Use \`/invest market\` to see available stocks.`,
                { symbol }
            );
        }

        const shares = interaction.options.getInteger('shares');
        const currentPrice = prices[symbol] || stock.basePrice;

        if (subcommand === 'buy') {
            const cost = currentPrice * shares;
            if ((userData?.wallet || 0) < cost) {
                throw createError(
                    'Insufficient funds',
                    ErrorTypes.VALIDATION,
                    `Buying ${shares} shares of **${symbol}** costs **$${cost.toLocaleString()}**, but you only have **$${(userData?.wallet || 0).toLocaleString()}**.`,
                    { required: cost, current: userData.wallet }
                );
            }

            userData.wallet = (userData.wallet || 0) - cost;
            await setEconomyData(client, guildId, userId, userData);

            const portfolio = await getPortfolio(client, guildId, userId);
            portfolio[symbol] = (portfolio[symbol] || 0) + shares;
            await savePortfolio(client, guildId, userId, portfolio);

            const embed = successEmbed(
                '📈 Shares Purchased!',
                `You bought **${shares} shares** of ${stock.emoji} **${symbol}** (${stock.name}) at **$${currentPrice.toLocaleString()}**/share for a total of **$${cost.toLocaleString()}**!`,
            ).addFields(
                { name: 'Total Shares', value: `${portfolio[symbol]}`, inline: true },
                { name: 'Cash Left', value: `$${userData.wallet.toLocaleString()}`, inline: true },
            );

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'sell') {
            const portfolio = await getPortfolio(client, guildId, userId);
            const owned = portfolio[symbol] || 0;

            if (owned < shares) {
                throw createError(
                    'Not enough shares',
                    ErrorTypes.VALIDATION,
                    `You own **${owned} shares** of **${symbol}**, but you tried to sell **${shares}**.`,
                    { owned, requested: shares }
                );
            }

            const revenue = currentPrice * shares;
            userData.wallet = (userData.wallet || 0) + revenue;
            await setEconomyData(client, guildId, userId, userData);

            portfolio[symbol] = owned - shares;
            if (portfolio[symbol] <= 0) delete portfolio[symbol];
            await savePortfolio(client, guildId, userId, portfolio);

            const embed = successEmbed(
                '📉 Shares Sold!',
                `You sold **${shares} shares** of ${stock.emoji} **${symbol}** (${stock.name}) at **$${currentPrice.toLocaleString()}**/share for a total of **$${revenue.toLocaleString()}**!`,
            ).addFields(
                { name: 'Shares Remaining', value: `${portfolio[symbol] || 0}`, inline: true },
                { name: 'New Cash', value: `$${userData.wallet.toLocaleString()}`, inline: true },
            );

            return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }
    }, { command: 'invest' }),
};
