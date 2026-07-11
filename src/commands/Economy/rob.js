import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, warningEmbed, buildUserErrorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { botConfig } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logTransaction } from '../../services/transactionService.js';

export default {
    skipRegistration: true,
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to rob another user (very risky)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to rob')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const robberId = interaction.user.id;
            const victimUser = interaction.options.getUser("user");
            const guildId = interaction.guildId;
            const now = Date.now();

            if (robberId === victimUser.id) {
                throw createError(
                    "Cannot rob self",
                    ErrorTypes.VALIDATION,
                    "You cannot rob yourself.",
                    { robberId, victimId: victimUser.id }
                );
            }
            
            if (victimUser.bot) {
                throw createError(
                    "Cannot rob bot",
                    ErrorTypes.VALIDATION,
                    "You cannot rob a bot.",
                    { victimId: victimUser.id, isBot: true }
                );
            }

            const robberData = await getEconomyData(client, guildId, robberId);
            const victimData = await getEconomyData(client, guildId, victimUser.id);
            
            if (!robberData || !victimData) {
                throw createError(
                    "Failed to load economy data",
                    ErrorTypes.DATABASE,
                    "Failed to load economy data. Please try again later.",
                    { robberId: !!robberData, victimId: !!victimData, guildId }
                );
            }
            
            const lastRob = robberData.lastRob || 0;

            const robConfig = botConfig.economy?.rob || {};
            const robCooldown = robConfig.cooldownMs || botConfig.economy.cooldowns.rob;

            if (now < lastRob + robCooldown) {
                const remaining = lastRob + robCooldown - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

                throw createError(
                    "Robbery cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    `You need to lay low. Wait **${hours}h ${minutes}m** before attempting another robbery.`,
                    { remaining, hours, minutes, cooldownType: 'rob' }
                );
            }

            const minWallet = robConfig.antiAbuseMinWallet || 1000;
            if (victimData.wallet < minWallet) {
                throw createError(
                    "Victim too poor",
                    ErrorTypes.VALIDATION,
                    `${victimUser.username} is too poor. They need at least ${minWallet.toLocaleString()} cash to be worth robbing.`,
                    { victimWallet: victimData.wallet, required: minWallet }
                );
            }

            // ── Check protection items ──
            const protectionItems = robConfig.protectionItems || ['personal_safe', 'insurance_policy', 'guard_dog'];
            let hasProtection = false;
            let protectionType = '';

            for (const protItem of protectionItems) {
                const count = victimData.inventory[protItem] || 0;
                if (count > 0) {
                    hasProtection = true;
                    protectionType = protItem;
                    break;
                }
            }

            // Check if victim has robbery protection upgrade
            if (victimData.upgrades?.robbery_protection) {
                hasProtection = true;
                protectionType = 'robbery_protection';
            }

            if (hasProtection) {
                robberData.lastRob = now;
                await setEconomyData(client, guildId, robberId, robberData);

                const protNames = {
                    personal_safe: 'Personal Safe',
                    insurance_policy: 'Insurance Policy',
                    guard_dog: 'Guard Dog',
                    robbery_protection: 'Robbery Protection',
                };

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        warningEmbed(
                            'Robbery Blocked',
                            `${victimUser.username} was prepared! Your attempt failed because they have a **${protNames[protectionType] || protectionItem}**. You got away clean but didn't gain anything.`
                        )
                    ],
                });
            }

            // ── Success probability with pet bonus ──
            let successRate = robConfig.baseSuccessRate ?? botConfig.economy.robSuccessRate ?? 0.35;
            // Check if robber has a cat that gives luck bonus (pets is an array)
            const hasCat = Array.isArray(robberData.pets) && robberData.pets.some(p => p?.type === 'cat');
            if (hasCat) {
                successRate += 0.05; // 5% bonus from cat
            }
            const isSuccessful = Math.random() < successRate;
            let resultEmbed;
            let amountStolen = 0;
            let fineAmount = 0;

            if (isSuccessful) {
                const stealPercent = robConfig.maxStealPercent ?? botConfig.economy.robPercentage ?? 0.25;
                amountStolen = Math.floor(victimData.wallet * stealPercent);

                robberData.wallet = (robberData.wallet || 0) + amountStolen;
                victimData.wallet = (victimData.wallet || 0) - amountStolen;

                resultEmbed = createEmbed({
                    title: 'Robbery Successful',
                    description: `You successfully stole **$${amountStolen.toLocaleString()}** from ${victimUser.username}!`,
                    color: 'money'
                });
            } else {
                const finePercent = robConfig.failFinePercent ?? botConfig.economy.robFinePercentage ?? 0.15;
                fineAmount = Math.floor((robberData.wallet || 0) * finePercent);

                if ((robberData.wallet || 0) < fineAmount) {
                    robberData.wallet = 0;
                } else {
                    robberData.wallet = (robberData.wallet || 0) - fineAmount;
                }

                resultEmbed = buildUserErrorEmbed(
                    'unknown',
                    `You failed the robbery and were caught! You were fined **$${fineAmount.toLocaleString()}** of your own cash.`,
                    { titleOverride: 'Robbery Failed' }
                );
            }

            robberData.lastRob = now;
            robberData.totalTransactions = (robberData.totalTransactions || 0) + 1;
            robberData.totalEarned = (robberData.totalEarned || 0) + (isSuccessful ? amountStolen : 0);
            robberData.totalSpent = (robberData.totalSpent || 0) + (!isSuccessful ? fineAmount : 0);

            await setEconomyData(client, guildId, robberId, robberData);
            await setEconomyData(client, guildId, victimUser.id, victimData);

            // Log transactions
            if (isSuccessful) {
                await logTransaction(client, guildId, robberId, {
                    amount: amountStolen, type: 'INCOME', source: 'rob',
                    description: `Stole from ${victimUser.username}`,
                    metadata: { victimId: victimUser.id },
                });
                await logTransaction(client, guildId, victimUser.id, {
                    amount: -amountStolen, type: 'EXPENSE', source: 'rob',
                    description: `Stolen by ${interaction.user.username}`,
                    metadata: { robberId },
                });
            }

            resultEmbed
                .addFields(
                    {
                        name: `Your New Cash (${interaction.user.username})`,
                        value: `$${robberData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: `Victim's New Cash (${victimUser.username})`,
                        value: `$${victimData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                )
                .setFooter({ text: `Next robbery available in 4 hours.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'rob' })
};