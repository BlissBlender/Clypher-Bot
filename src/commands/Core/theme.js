import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import {
  getPresetList,
  getPresetColors,
  setGuildTheme,
  resetGuildTheme,
  loadGuildTheme,
  THEME_PRESETS,
} from '../../services/themeService.js';
import { logger } from '../../utils/logger.js';

const PRESET_EMOJIS = {
  default: '⚙️',
  midnight: '🌙',
  ocean: '🌊',
  sunset: '🌅',
  forest: '🌲',
  cyberpunk: '💜',
};

/** All 8 customizable semantic color keys with labels and defaults. */
const COLOR_KEYS = [
  { key: 'primary', label: 'Primary (brand)', default: '#0D1B2A' },
  { key: 'success', label: 'Success (rewards)', default: '#00E676' },
  { key: 'error', label: 'Error (failures)', default: '#FF1744' },
  { key: 'warning', label: 'Warning (alerts)', default: '#FFAB00' },
  { key: 'info', label: 'Info (help)', default: '#2979FF' },
  { key: 'money', label: 'Money (income)', default: '#FFD700' },
  { key: 'spending', label: 'Spending (purchases)', default: '#FF6D00' },
  { key: 'rare', label: 'Rare (special)', default: '#AA00FF' },
];

/** Holds the main interaction per guild so modals can refresh the view. */
const mainInteractions = new Map();

function buildCurrentThemeEmbed(config, guild) {
  const theme = config.theme || {};
  const presetName = theme.preset || 'default';
  const presetInfo = THEME_PRESETS[presetName];
  const presetLabel = presetInfo ? presetInfo.name : 'Custom';

  const fields = COLOR_KEYS.map(({ key, label, default: def }) => ({
    name: `🎨 ${label}`,
    value: `\`${theme.colors?.[key] || def}\``,
    inline: true,
  }));

  return createEmbed({
    title: `🎨 ${presetLabel} Theme — ${guild.name}`,
    description: presetInfo?.description
      ? `${presetInfo.description}\nPick a new preset below or customize individual colors.`
      : 'Custom theme — individual colors can be changed below.',
    color: 'primary',
    fields,
    footer: presetName === 'default' ? 'Using the default ClypherBot color palette.' : `Theme: ${presetLabel}`,
    guildId: guild.id,
  });
}

function buildPresetSelect() {
  const presets = getPresetList();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('theme_preset_select')
      .setPlaceholder('🎨 Select a theme preset...')
      .addOptions(
        presets.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.name)
            .setDescription(p.description.slice(0, 100))
            .setValue(p.key)
            .setEmoji(PRESET_EMOJIS[p.key] || '🎨')
        )
      )
  );
}

function buildActionButtons(hasCustomColors) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('theme_customize')
      .setLabel('✏️ Customize Colors')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('theme_reset')
      .setLabel('↩️ Reset to Default')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasCustomColors),
    new ButtonBuilder()
      .setCustomId('theme_refresh')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Primary),
  );
}

function hasCustomColors(config) {
  const theme = config.theme;
  return theme && theme.colors && Object.keys(theme.colors).length > 0 && theme.preset !== 'default';
}

async function applyPreset(client, guildId, presetName) {
  const colors = getPresetColors(presetName);
  await setGuildTheme(client, guildId, presetName, colors || {});
  await loadGuildTheme(client, guildId);
}

async function handlePresetSelect(interaction, client) {
  const presetName = interaction.values[0];
  await interaction.deferUpdate();
  await applyPreset(client, interaction.guildId, presetName);

  const guildConfig = await getGuildConfig(client, interaction.guildId);
  const embed = buildCurrentThemeEmbed(guildConfig, interaction.guild);
  const components = [buildActionButtons(hasCustomColors(guildConfig)), buildPresetSelect()];
  await interaction.editReply({ embeds: [embed], components });

  await interaction.followUp({
    embeds: [successEmbed('✅ Theme Applied', `The **${THEME_PRESETS[presetName]?.name || presetName}** theme is now active.`)],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Opens a dropdown to pick which color to customize, then shows a modal for that single color.
 * This avoids Discord's 5-text-input modal limit and is cleaner UX.
 */
async function handleCustomize(interaction) {
  const colorOptions = COLOR_KEYS.map(({ key, label, default: def }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription(`Default: ${def}`)
      .setValue(key)
  );

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('theme_color_select')
      .setPlaceholder('🎨 Pick a color to customize...')
      .addOptions(colorOptions)
  );

  await interaction.reply({
    embeds: [infoEmbed('Customize Color', 'Select which color you want to change.')],
    components: [selectRow],
    flags: MessageFlags.Ephemeral,
  });

  const colorSelect = await interaction.channel
    .awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.customId === 'theme_color_select',
      time: 30_000,
    })
    .catch(() => null);

  if (!colorSelect) {
    await interaction.editReply({
      embeds: [warningEmbed('Timed Out', 'Color selection timed out. Run `/theme` again to customize.')],
      components: [],
    }).catch(() => {});
    return;
  }

  const selectedKey = colorSelect.values[0];
  const colorInfo = COLOR_KEYS.find((c) => c.key === selectedKey);

  const modal = new ModalBuilder()
    .setCustomId(`theme_color_modal_${selectedKey}`)
    .setTitle(`🎨 Customize ${colorInfo.label}`);

  const input = new TextInputBuilder()
    .setCustomId('color_value')
    .setLabel(`Hex color (e.g. ${colorInfo.default})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(colorInfo.default)
    .setRequired(true)
    .setMaxLength(7)
    .setMinLength(7);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await colorSelect.showModal(modal);

  // Wait for modal submission
  const submitted = await colorSelect
    .awaitModalSubmit({
      filter: (i) => i.customId === `theme_color_modal_${selectedKey}` && i.user.id === interaction.user.id,
      time: 120_000,
    })
    .catch(() => null);

  if (!submitted) return;

  const hexValue = submitted.fields.getTextInputValue('color_value')?.trim().toUpperCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(hexValue)) {
    await submitted.reply({
      embeds: [warningEmbed('Invalid Color', `\`${hexValue}\` is not a valid hex color. Use format like \`${colorInfo.default}\`.` )],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildConfig = await getGuildConfig(submitted.client, submitted.guildId);
  const theme = guildConfig.theme || {};
  const currentColors = theme.colors || {};
  currentColors[selectedKey] = hexValue;

  await setGuildTheme(submitted.client, submitted.guildId, theme.preset || 'custom', currentColors);
  await loadGuildTheme(submitted.client, submitted.guildId);

  await submitted.reply({
    embeds: [successEmbed('✅ Color Updated', `**${colorInfo.label}** changed to \`${hexValue}\`.`)],
    flags: MessageFlags.Ephemeral,
  });

  // Refresh the main view
  const mainInteraction = mainInteractions.get(submitted.guildId);
  if (mainInteraction) {
    const updatedConfig = await getGuildConfig(submitted.client, submitted.guildId);
    const updatedEmbed = buildCurrentThemeEmbed(updatedConfig, submitted.guild);
    const updatedComponents = [buildActionButtons(hasCustomColors(updatedConfig)), buildPresetSelect()];
    await mainInteraction.editReply({ embeds: [updatedEmbed], components: updatedComponents }).catch(() => {});
  }
}

async function handleReset(interaction, client) {
  await interaction.deferUpdate();
  await resetGuildTheme(client, interaction.guildId);

  const guildConfig = await getGuildConfig(client, interaction.guildId);
  const embed = buildCurrentThemeEmbed(guildConfig, interaction.guild);
  const components = [buildActionButtons(false), buildPresetSelect()];
  await interaction.editReply({ embeds: [embed], components });

  await interaction.followUp({
    embeds: [successEmbed('↩️ Theme Reset', 'The theme has been reset to the **Default** palette.')],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRefresh(interaction, client) {
  await interaction.deferUpdate();
  await loadGuildTheme(client, interaction.guildId);

  const guildConfig = await getGuildConfig(client, interaction.guildId);
  const embed = buildCurrentThemeEmbed(guildConfig, interaction.guild);
  const components = [buildActionButtons(hasCustomColors(guildConfig)), buildPresetSelect()];
  await interaction.editReply({ embeds: [embed], components });
}

export default {
  data: new SlashCommandBuilder()
    .setName('theme')
    .setDescription('Customize the bot embed colors for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return replyUserError(interaction, {
          type: ErrorTypes.PERMISSION,
          message: 'You need the **Manage Server** permission to change the theme.',
        });
      }

      const guildConfig = await getGuildConfig(interaction.client, interaction.guildId);
      const embed = buildCurrentThemeEmbed(guildConfig, interaction.guild);
      const components = [buildActionButtons(hasCustomColors(guildConfig)), buildPresetSelect()];

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed], components });

      const replyMessage = await interaction.fetchReply().catch(() => null);
      if (!replyMessage) return;

      // Store per-guild so modals can update the correct view
      mainInteractions.set(interaction.guildId, interaction);

      const collector = replyMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 300_000,
      });

      collector.on('collect', async (componentInteraction) => {
        try {
          if (componentInteraction.isStringSelectMenu() && componentInteraction.customId === 'theme_preset_select') {
            await handlePresetSelect(componentInteraction, interaction.client);
            return;
          }

          if (componentInteraction.isButton()) {
            switch (componentInteraction.customId) {
              case 'theme_customize':
                await handleCustomize(componentInteraction);
                return;
              case 'theme_reset':
                await handleReset(componentInteraction, interaction.client);
                return;
              case 'theme_refresh':
                await handleRefresh(componentInteraction, interaction.client);
                return;
            }
          }
        } catch (error) {
          logger.error('Theme interaction error:', error);
          await replyUserError(componentInteraction, {
            type: ErrorTypes.UNKNOWN,
            message: 'An error occurred. Please try again.',
          }).catch(() => {});
        }
      });

      collector.on('end', () => {
        mainInteractions.delete(interaction.guildId);
      });
    } catch (error) {
      logger.error('Theme command error:', error);
      await replyUserError(interaction, {
        type: ErrorTypes.CONFIGURATION,
        message: 'Failed to open theme settings. Please try again.',
      });
    }
  },
};
