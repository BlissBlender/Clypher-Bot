// embeds.js — Clypher Bot premium embed system

import { EmbedBuilder } from 'discord.js';
import { getColor } from '../config/bot.js';
import { getGuildOverrides } from '../services/themeService.js';

const EMBED_FOOTER_SYMBOL = Symbol('clypherFooterText');
const EMBED_BASE_DESCRIPTION_SYMBOL = Symbol('clypherBaseDescription');

/** ── Text normalisation ────────────────────────────────── */

function normalizeText(text = '') {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]\n/g, '\n')
    .replace(/\n[ \t]/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeField(field) {
  if (!field || typeof field !== 'object') return field;
  return {
    ...field,
    name: normalizeText(field.name),
    value: normalizeText(field.value),
  };
}

/** ── Prototype patches ──────────────────────────────────── */

const OG = {
  setTitle: EmbedBuilder.prototype.setTitle,
  setAuthor: EmbedBuilder.prototype.setAuthor,
  addFields: EmbedBuilder.prototype.addFields,
  setDescription: EmbedBuilder.prototype.setDescription,
  setFooter: EmbedBuilder.prototype.setFooter,
  setTimestamp: EmbedBuilder.prototype.setTimestamp,
};

EmbedBuilder.prototype.setTitle = function setCleanTitle(title) {
  return OG.setTitle.call(this, normalizeText(title));
};

EmbedBuilder.prototype.setAuthor = function setCleanAuthor(author) {
  if (typeof author === 'string') {
    return OG.setAuthor.call(this, normalizeText(author));
  }
  if (author && typeof author.name === 'string') {
    return OG.setAuthor.call(this, { ...author, name: normalizeText(author.name) });
  }
  return OG.setAuthor.call(this, author);
};

EmbedBuilder.prototype.addFields = function addCleanFields(...fields) {
  const normalized = fields.flatMap((f) => (Array.isArray(f) ? f : [f]));
  return OG.addFields.call(this, normalized.map(normalizeField));
};

EmbedBuilder.prototype.setDescription = function setCleanDescription(description = '') {
  const str = normalizeText(description || '');
  this[EMBED_BASE_DESCRIPTION_SYMBOL] = str;
  return OG.setDescription.call(this, str);
};

EmbedBuilder.prototype.setFooter = function setCleanFooter(footer) {
  if (!footer) return this;
  const text = typeof footer === 'string' ? footer.trim() : (footer.text || '').trim();
  if (!text) return this;
  this[EMBED_FOOTER_SYMBOL] = text;
  return OG.setFooter.call(this, { text });
};

EmbedBuilder.prototype.setTimestamp = function setRealTimestamp(date) {
  return OG.setTimestamp.call(this, date);
};

/** ── Embed colour helpers ──────────────────────────────── */

function resolveEmbedColor(colorOrName, guildId) {
  try {
    const overrides = guildId ? getGuildOverrides(guildId) : null;
    return getColor(colorOrName, '#000000', overrides) || '#000000';
  } catch {
    return '#000000';
  }
}

/** ── Master embed builder ───────────────────────────────── */

export function createEmbed({
  title = '',
  description = '',
  color = 'primary',
  fields = [],
  author = null,
  footer = '✨ Clypher Bot',   // default branded footer
  thumbnail = null,
  image = null,
  timestamp = true,            // timestamps on by default
  url = null,
  guildId = null,
} = {}) {
  const embed = new EmbedBuilder();

  if (title && typeof title === 'string' && title.length > 0) {
    embed.setTitle(title.substring(0, 256));
  }

  if (description && typeof description === 'string' && description.length > 0) {
    embed.setDescription(description.substring(0, 4096));
  }

  embed.setColor(resolveEmbedColor(color, guildId));

  if (Array.isArray(fields) && fields.length > 0) {
    const valid = fields.filter(f => f && f.name && f.value);
    if (valid.length > 0) embed.addFields(valid.slice(0, 25));
  }

  if (author) {
    try {
      if (typeof author === 'string' && author.length > 0) {
        embed.setAuthor({ name: author.substring(0, 256) });
      } else if (typeof author.name === 'string') {
        embed.setAuthor(author);
      }
    } catch { /* skip */ }
  }

  if (footer) {
    try {
      const text = typeof footer === 'string' ? footer : footer.text || '';
      if (text) embed.setFooter({ text: text.substring(0, 2048) });
    } catch { /* skip */ }
  }

  if (thumbnail) {
    try {
      const src = typeof thumbnail === 'string' ? thumbnail : thumbnail.url;
      if (src) embed.setThumbnail(src);
    } catch { /* skip */ }
  }

  if (image) {
    try {
      const src = typeof image === 'string' ? image : image.url;
      if (src) embed.setImage(src);
    } catch { /* skip */ }
  }

  if (timestamp === true) {
    embed.setTimestamp();
  } else if (timestamp instanceof Date) {
    embed.setTimestamp(timestamp);
  }

  if (url && typeof url === 'string' && url.length > 0) {
    try { embed.setURL(url); } catch { /* skip */ }
  }

  return embed;
}

/** ── Emoji-enriched default titles ─────────────────────── */

const NOTIFICATION_DEFAULT_TITLES = {
  success: '✅ Success',
  error: '❌ Error',
  info: 'ℹ️ Information',
  warning: '⚠️ Warning',
  primary: '📢 Notice',
};

export const USER_ERROR_TITLES = {
  validation: '❌ Invalid Input',
  permission: '🚫 Permission Denied',
  configuration: '⚙️ Configuration Error',
  database: '🗄️ Database Error',
  network: '🌐 Network Error',
  discord_api: '🤖 Discord API Error',
  user_input: '✏️ Input Error',
  rate_limit: '⏳ Too Fast',
  unknown: '💥 Something Went Wrong',
};

const USER_ERROR_COLORS = {
  rate_limit: 'warning',
};

/**
 * Build a consistent user-facing error embed.
 * @param {string} errorType - Error category key (e.g. validation, permission)
 * @param {string} [description] - Specific, actionable message for the user
 * @param {{ titleOverride?: string }} [options]
 */
export function buildUserErrorEmbed(errorType, description = '', options = {}) {
  const type = errorType || 'unknown';
  const title = options.titleOverride || USER_ERROR_TITLES[type] || USER_ERROR_TITLES.unknown;
  const color = USER_ERROR_COLORS[type] || 'error';
  const body = description ? String(description).trim() : undefined;

  return createEmbed({
    title,
    description: body,
    color,
  });
}

function containsDiscordRenderable(content = '') {
  return /<@!?&?\d+>|<#\d+>|\b\d{17,19}\b/.test(String(content));
}

function buildNotificationEmbed(title, body = '', color = 'primary') {
  const defaultTitle = NOTIFICATION_DEFAULT_TITLES[color] || NOTIFICATION_DEFAULT_TITLES.primary;
  let titleText = String(title || '').trim();
  let bodyText = body ? String(body).trim() : '';

  if (titleText && containsDiscordRenderable(titleText)) {
    bodyText = bodyText ? `${titleText}\n\n${bodyText}` : titleText;
    titleText = defaultTitle;
  }

  return createEmbed({
    title: titleText || defaultTitle,
    description: bodyText || undefined,
    color,
  });
}

/**
 * @deprecated Prefer buildUserErrorEmbed or replyUserError from errorHandler.js.
 */
export function errorEmbed(title, detail = null, options = {}) {
  const { showDetails = process.env.NODE_ENV !== 'production' } = options;
  let body = detail;

  if (detail && showDetails && typeof detail !== 'string') {
    const detailText = detail.message || String(detail);
    body = formatCodeBlock(detailText);
  }

  const description = body ? String(body).trim() : '';
  const titleOverride = title && title !== 'Error' ? title : undefined;

  return buildUserErrorEmbed('unknown', description, { titleOverride });
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function successEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Success', title, 'success');
  }

  return buildNotificationEmbed(title || 'Success', body, 'success');
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function infoEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Information', title, 'info');
  }

  return buildNotificationEmbed(title || 'Information', body, 'info');
}

/** @param {string} titleOrBody - With one arg: body text. With two args: title and body. */
export function warningEmbed(title, body = '') {
  if (arguments.length === 1) {
    return buildNotificationEmbed('Warning', title, 'warning');
  }

  return buildNotificationEmbed(title || 'Warning', body, 'warning');
}

export function formatUser(user) {
  return `${user} (${user.tag} | ${user.id})`;
}

export function formatDate(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function formatCodeBlock(content, language = '') {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

export function formatInlineCode(content) {
  return `\`${content}\``;
}

export function formatBold(content) {
  return `**${content}**`;
}

export function formatItalic(content) {
  return `*${content}*`;
}

export function formatUnderline(content) {
  return `__${content}__`;
}

export function formatStrikethrough(content) {
  return `~~${content}~~`;
}

export function formatSpoiler(content) {
  return `||${content}||`;
}

export function formatQuote(content) {
  return `> ${content}`;
}

export function formatList(items, ordered = false) {
  return items
    .map((item, index) => (ordered ? `${index + 1}.` : '•') + `${item}`)
    .join('\n');
}

export function formatDuration(ms) {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join('');
}

export function formatProgressBar(current, max, size = 10) {
  const progress = Math.min(Math.max(0, current / max), 1);
  const filled = Math.round(size * progress);
  const empty = size - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(progress * 100)}%`;
}