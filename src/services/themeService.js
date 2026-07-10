/**
 * Theme Service
 *
 * Manages per-guild color theme overrides and pre-defined theme presets.
 *
 * Architecture:
 *   ┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
 *   │  /theme command  │────►│  themeService.js  │────►│  guildConfig  │
 *   │  (admin sets     │     │  (cache + presets) │     │  (DB storage) │
 *   │   theme)         │     │                    │     │               │
 *   └─────────────────┘     └────┬───────────────┘     └───────────────┘
 *                                │
 *                    ┌───────────▼────────────┐
 *                    │   embeds.js             │
 *                    │   createEmbed({guildId})│
 *                    └───────────┬────────────┘
 *                                │
 *                    ┌───────────▼────────────┐
 *                    │   bot.js                │
 *                    │   getColor(color, fall, │
 *                    │     overrides)          │
 *                    └────────────────────────┘
 */

import { logger } from '../utils/logger.js';

// ──────────────────────────────────────────────
// THEME PRESETS — pre-defined color palettes
// Each preset overrides the botConfig.embeds.colors defaults.
// ──────────────────────────────────────────────

/** @type {Object<string, {name: string, description: string, colors: Object<string, string>}>} */
export const THEME_PRESETS = {
  default: {
    name: 'Default',
    description: 'The standard ClypherBot color palette — premium navy and vibrant accents.',
    colors: {}, // Empty = use botConfig defaults
  },
  midnight: {
    name: 'Midnight',
    description: 'Dark, sleek blues and deep purples for a stealthy look.',
    colors: {
      primary: '#0A0E27',
      secondary: '#141838',
      success: '#00C853',
      error: '#FF1744',
      warning: '#FFD740',
      info: '#448AFF',
      money: '#FFD700',
      spending: '#FF9100',
      rare: '#D500F9',
      economy: '#FFD700',
      birthday: '#D500F9',
      moderation: '#651FFF',
      gray: '#78909C',
    },
  },
  ocean: {
    name: 'Ocean',
    description: 'Aquatic blues, teals, and seafoam greens — cool and refreshing.',
    colors: {
      primary: '#0D2538',
      secondary: '#1A3A4A',
      success: '#00BFA5',
      error: '#FF5252',
      warning: '#FFD740',
      info: '#40C4FF',
      money: '#FFD740',
      spending: '#FF6E40',
      rare: '#7C4DFF',
      economy: '#FFD740',
      birthday: '#FF4081',
      moderation: '#448AFF',
      gray: '#78909C',
    },
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm oranges, pinks, and golden hues — cozy and inviting.',
    colors: {
      primary: '#1A0E2E',
      secondary: '#2D1B36',
      success: '#69F0AE',
      error: '#FF5252',
      warning: '#FFD740',
      info: '#40C4FF',
      money: '#FFD740',
      spending: '#FF6E40',
      rare: '#E040FB',
      economy: '#FFD740',
      birthday: '#FF4081',
      moderation: '#7C4DFF',
      gray: '#78909C',
    },
  },
  forest: {
    name: 'Forest',
    description: 'Earthy greens, browns, and natural tones — grounded and organic.',
    colors: {
      primary: '#1B2E1B',
      secondary: '#263D26',
      success: '#69F0AE',
      error: '#FF5252',
      warning: '#FFD740',
      info: '#40C4FF',
      money: '#FFD740',
      spending: '#FF6E40',
      rare: '#B388FF',
      economy: '#FFD740',
      birthday: '#FF4081',
      moderation: '#7C4DFF',
      gray: '#90A4AE',
    },
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Neon pinks, electric cyans, and glowing yellows — futuristic and bold.',
    colors: {
      primary: '#0A0015',
      secondary: '#1A0030',
      success: '#00E676',
      error: '#FF1744',
      warning: '#FFEA00',
      info: '#00E5FF',
      money: '#FFEA00',
      spending: '#FF9100',
      rare: '#D500F9',
      economy: '#FFEA00',
      birthday: '#FF4081',
      moderation: '#651FFF',
      gray: '#78909C',
    },
  },
};

// ──────────────────────────────────────────────
// PER-GUILD OVERRIDE CACHE
// ──────────────────────────────────────────────

/** @type {Map<string, Object<string, string>>} */
const guildOverrideCache = new Map();

/**
 * Load a guild's theme from its guild config and populate the cache.
 * Called on bot startup and after theme changes.
 */
export async function loadGuildTheme(client, guildId) {
  try {
    const { getGuildConfig } = await import('./guildConfig.js');
    const guildConfig = await getGuildConfig(client, guildId);
    const theme = guildConfig.theme;

    if (!theme || !theme.colors || Object.keys(theme.colors).length === 0) {
      guildOverrideCache.delete(guildId);
      return null;
    }

    guildOverrideCache.set(guildId, { ...theme.colors });
    logger.debug(`Loaded theme for guild ${guildId} (preset: ${theme.preset || 'custom'})`);
    return theme.colors;
  } catch (error) {
    logger.error(`Failed to load theme for guild ${guildId}:`, error);
    return null;
  }
}

/**
 * Save a theme preset or custom colors for a guild.
 * Updates both the database (via guild config) and the in-memory cache.
 */
export async function setGuildTheme(client, guildId, presetName, colors) {
  try {
    const { updateGuildConfig } = await import('./guildConfig.js');
    const theme = {
      preset: presetName || 'custom',
      colors: colors || {},
    };

    await updateGuildConfig(client, guildId, { theme });

    // Update cache
    if (colors && Object.keys(colors).length > 0) {
      guildOverrideCache.set(guildId, { ...colors });
    } else {
      guildOverrideCache.delete(guildId);
    }

    logger.info(`Theme updated for guild ${guildId}: preset=${theme.preset}, ${Object.keys(colors || {}).length} color(s)`);
    return true;
  } catch (error) {
    logger.error(`Failed to save theme for guild ${guildId}:`, error);
    return false;
  }
}

/**
 * Reset a guild's theme back to defaults.
 */
export async function resetGuildTheme(client, guildId) {
  await setGuildTheme(client, guildId, 'default', {});
  guildOverrideCache.delete(guildId);
}

/**
 * Get the color overrides for a guild (synchronous — reads from cache).
 * Returns null if no overrides are set.
 */
export function getGuildOverrides(guildId) {
  return guildOverrideCache.get(guildId) || null;
}

/**
 * Load themes for all guilds the bot is in.
 * Called once on startup.
 */
export async function loadAllGuildThemes(client) {
  let loaded = 0;
  const guildIds = [...client.guilds.cache.keys()];
  for (const guildId of guildIds) {
    const result = await loadGuildTheme(client, guildId);
    if (result) loaded++;
  }
  logger.info(`Loaded themes for ${loaded}/${guildIds.length} guilds`);
}

/**
 * Get the list of available theme presets for display.
 */
export function getPresetList() {
  return Object.entries(THEME_PRESETS).map(([key, preset]) => ({
    key,
    name: preset.name,
    description: preset.description,
  }));
}

/**
 * Get the colors for a preset by name.
 * Returns null if the preset doesn't exist.
 */
export function getPresetColors(presetName) {
  const preset = THEME_PRESETS[presetName];
  return preset ? { ...preset.colors } : null;
}
