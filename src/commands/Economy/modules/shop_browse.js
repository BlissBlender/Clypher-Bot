import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import { shopItems, getRarityEmoji, getRarityColor, ITEM_CATEGORIES } from '../../../config/shop/items.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        try {
            const ITEMS_PER_PAGE = 8;
            const totalPages = Math.ceil(shopItems.length / ITEMS_PER_PAGE);
            let currentPage = 1;

            const createShopEmbed = (page) => {
                const startIndex = (page - 1) * ITEMS_PER_PAGE;
                const pageItems = shopItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                const fieldItems = pageItems.map(item => {
                    const rarityEmoji = getRarityEmoji(item.rarity);
                    const cat = ITEM_CATEGORIES[item.category] || { emoji: '📦', name: 'Item' };
                    return {
                        name: `${rarityEmoji} ${item.name}`,
                        value: [
                            `*${item.description}*`,
                            `💵 **${item.price.toLocaleString()}** CR \u2022 ${cat.emoji} ${cat.name} \u2022 ${rarityEmoji} ${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}`,
                            `\`/${'buy item_id:' + item.id + ' quantity:1'}\``,
                        ].join('\n'),
                        inline: false,
                    };
                });

                return createEmbed({
                    title: '🛒 CHARON Marketplace',
                    description: [
                        'Welcome to the CHARON Economy Shop! Browse items by page.',
                        '',
                        '**Buy items:** `/buy item_id:<id> quantity:<amount>`',
                        '**View inventory:** `/inventory`',
                        '**Use items:** `/use item:<id>`',
                    ].join('\n'),
                    color: 'economy',
                    fields: [
                        {
                            name: `📋 Page ${page}/${totalPages} \u2022 ${shopItems.length} items`,
                            value: '\u200b',
                            inline: false,
                        },
                        ...fieldItems,
                    ],
                    footer: `Page ${page}/${totalPages} • ${shopItems.length} items • CHARON Economy`,
                });
            };

            const createShopComponents = (page) => {
                const rows = [];
                
                // Pagination buttons
                if (totalPages > 1) {
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('shop_prev')
                                .setLabel('⬅️ Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === 1),
                            new ButtonBuilder()
                                .setCustomId('shop_index')
                                .setLabel(`Page ${page}/${totalPages}`)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('shop_next')
                                .setLabel('Next ➡️')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === totalPages),
                        ),
                    );
                }
                return rows;
            };

            const message = await interaction.reply({
                embeds: [createShopEmbed(currentPage)],
                components: createShopComponents(currentPage),
                flags: 0,
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000,
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.reply({ content: '❌ You cannot use these buttons. Run `/shop` to get your own shop view.', flags: 64 });
                    return;
                }
                const { customId } = buttonInteraction;
                if (customId === 'shop_prev' || customId === 'shop_next') {
                    await buttonInteraction.deferUpdate();
                    if (customId === 'shop_prev' && currentPage > 1) currentPage--;
                    else if (customId === 'shop_next' && currentPage < totalPages) currentPage++;
                    await buttonInteraction.editReply({
                        embeds: [createShopEmbed(currentPage)],
                        components: createShopComponents(currentPage),
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    const disabledComponents = createShopComponents(currentPage);
                    disabledComponents.forEach(row => row.components.forEach(btn => btn.setDisabled(true)));
                    await message.edit({ components: disabledComponents });
                } catch (_) {}
            });
        } catch (error) {
            logger.error('shop_browse error:', error);
            await interaction.reply({ content: '❌ An error occurred while loading the shop.', flags: MessageFlags.Ephemeral });
        }
    },
};