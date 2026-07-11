// moderation_dashboard.js — Interactive dashboard for all 7 moderation categories
// Each category page has configurable buttons that open modals to edit settings.

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import { createEmbed, successEmbed } from '../../../utils/embeds.js';
import { getModerationConfig, toggleModerationFeature, updateModerationSetting } from '../../../services/moderationService.js';

// ═══════════════════════════════════════════════════════════════
//  CUSTOM ID CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DASHBOARD_PREFIX = 'mod';

export const HOME_PAGE        = `${DASHBOARD_PREFIX}_home`;
export const REFRESH          = `${DASHBOARD_PREFIX}_refresh`;
export const TOGGLE_MASTER    = `${DASHBOARD_PREFIX}_toggle_master`;
export const CATEGORY_SELECT  = `${DASHBOARD_PREFIX}_category`;

export const TOGGLE_ANTILINK  = `${DASHBOARD_PREFIX}_toggle_al`;
export const TOGGLE_ANTISPAM  = `${DASHBOARD_PREFIX}_toggle_as`;
export const TOGGLE_AUTOMOD   = `${DASHBOARD_PREFIX}_toggle_am`;
export const TOGGLE_STRIKES   = `${DASHBOARD_PREFIX}_toggle_strikes`;
export const TOGGLE_ANTI_MASS_MENTION = `${DASHBOARD_PREFIX}_toggle_amm`;
export const TOGGLE_ANTI_RAID = `${DASHBOARD_PREFIX}_toggle_ar`;
export const TOGGLE_ANTI_NUKE = `${DASHBOARD_PREFIX}_toggle_an`;

export const SETTING_BUTTON   = `${DASHBOARD_PREFIX}_setting_btn`;
export const SETTING_MODAL    = `${DASHBOARD_PREFIX}_setting_modal`;

// ═══════════════════════════════════════════════════════════════
//  SETTINGS DEFINITION MAP
//  Each setting: { keyPath, label, emoji, inputLabel, placeholder, getValue(config), formatValue(val) }
// ═══════════════════════════════════════════════════════════════

const CATEGORY_SETTINGS = {
    antilink: [
        { keyPath: 'antiLink.action',             label: 'Action',           emoji: '⚡', inputLabel: 'Action (warn / timeout / kick / delete / none)',        placeholder: 'warn',                     getValue: c => c.antiLink?.action || 'warn',                     formatValue: v => `\`${v}\`` },
        { keyPath: 'antiLink.allowedInviteCodes',  label: 'Allowed Invites',  emoji: '✅', inputLabel: 'Allowed invite codes (comma-separated)',                    placeholder: 'my-server, friends-chat',  getValue: c => (c.antiLink?.allowedInviteCodes || []).join(', '), formatValue: v => v ? `\`${v}\`` : '`None`' },
        { keyPath: 'antiLink.whitelistedDomains',  label: 'Whitelisted URLs', emoji: '🌐', inputLabel: 'Allowed domains (comma-separated)',                        placeholder: 'youtube.com, github.com',  getValue: c => (c.antiLink?.whitelistedDomains || []).join(', '), formatValue: v => v ? `\`${v}\`` : '`None`' },
        { keyPath: 'antiLink.minViolationsForAction', label: 'Auto-action at', emoji: '⚠️', inputLabel: 'Violations before auto-action (number)',                   placeholder: '3',                        getValue: c => String(c.antiLink?.minViolationsForAction || 3),   formatValue: v => `${v} violations` },
    ],
    antispam: [
        { keyPath: 'antiSpam.action',              label: 'Action',           emoji: '⚡', inputLabel: 'Action (warn / timeout / kick / delete / none)',           placeholder: 'timeout',                  getValue: c => c.antiSpam?.action || 'timeout',                 formatValue: v => `\`${v}\`` },
        { keyPath: 'antiSpam.maxMessages',          label: 'Max Messages',    emoji: '📊', inputLabel: 'Max messages in time window (number)',                      placeholder: '5',                        getValue: c => String(c.antiSpam?.maxMessages || 5),            formatValue: v => `\`${v}\` msgs` },
        { keyPath: 'antiSpam.windowMs',             label: 'Time Window (s)', emoji: '⏱️', inputLabel: 'Time window in seconds (e.g. 5 = 5 seconds)',                placeholder: '5',                        getValue: c => String((c.antiSpam?.windowMs || 5000) / 1000),   formatValue: v => `\`${v}s\`` },
        { keyPath: 'antiSpam.maxMentions',          label: 'Max Mentions',    emoji: '🔗', inputLabel: 'Max mentions per message before action (number)',             placeholder: '4',                        getValue: c => String(c.antiSpam?.maxMentions || 4),            formatValue: v => `\`${v}\` mentions` },
        { keyPath: 'antiSpam.timeoutDurationMs',    label: 'Timeout (s)',     emoji: '⏳', inputLabel: 'Timeout duration in seconds (e.g. 60 = 1 minute)',            placeholder: '60',                       getValue: c => String((c.antiSpam?.timeoutDurationMs || 60000) / 1000), formatValue: v => `${v}s` },
        { keyPath: 'antiSpam.minViolationsForAction', label: 'Auto-action at', emoji: '⚠️', inputLabel: 'Violations before auto-action (number)',                   placeholder: '3',                        getValue: c => String(c.antiSpam?.minViolationsForAction || 3), formatValue: v => `${v} violations` },
    ],
    automod: [
        { keyPath: 'autoMod.blockedWords',          label: 'Blocked Words',   emoji: '📝', inputLabel: 'Blocked words (comma-separated, case-insensitive)',         placeholder: 'badword1, badword2',        getValue: c => (c.autoMod?.blockedWords || []).join(', '),      formatValue: v => v ? `\`${v}\`` : '`None`' },
        { keyPath: 'autoMod.antiCaps.minLength',     label: 'Caps Min Length',emoji: '🔤', inputLabel: 'Minimum message length for caps check (number)',              placeholder: '8',                        getValue: c => String(c.autoMod?.antiCaps?.minLength || 8),     formatValue: v => `${v}+ chars` },
        { keyPath: 'autoMod.antiCaps.capsThreshold', label: 'Caps Threshold',emoji: '🔤', inputLabel: 'Uppercase percentage to trigger (e.g. 70 = 70%)',              placeholder: '70',                       getValue: c => String(c.autoMod?.antiCaps?.capsThreshold || 70), formatValue: v => `${v}% caps` },
        { keyPath: 'autoMod.antiCaps.action',        label: 'Caps Action',    emoji: '⚡', inputLabel: 'Action for caps violation (warn / timeout / kick / delete)',   placeholder: 'warn',                     getValue: c => c.autoMod?.antiCaps?.action || 'warn',           formatValue: v => `\`${v}\`` },
        { keyPath: 'autoMod.antiRepeatedText.maxConsecutiveChars', label: 'Repeated Max', emoji: '🔁', inputLabel: 'Max consecutive identical characters (number)',   placeholder: '8',                        getValue: c => String(c.autoMod?.antiRepeatedText?.maxConsecutiveChars || 8), formatValue: v => `${v}+ chars` },
        { keyPath: 'autoMod.antiRepeatedText.action', label: 'Repeated Action', emoji: '⚡', inputLabel: 'Action for repeated text (warn / timeout / kick / delete)',  placeholder: 'warn',                     getValue: c => c.autoMod?.antiRepeatedText?.action || 'warn',   formatValue: v => `\`${v}\`` },
    ],
    strikes: [
        { keyPath: 'strikes.decayMs',               label: 'Decay Time (h)', emoji: '⏳', inputLabel: 'Hours after which violations reset (number)',                 placeholder: '24',                       getValue: c => String((c.strikes?.decayMs || 86400000) / 3600000), formatValue: v => `${v}h` },
    ],
    antimassmention: [
        { keyPath: 'antiMassMention.action',         label: 'Action',         emoji: '⚡', inputLabel: 'Action (warn / timeout / kick / delete / none)',             placeholder: 'warn',                     getValue: c => c.antiMassMention?.action || 'warn',             formatValue: v => `\`${v}\`` },
        { keyPath: 'antiMassMention.maxMentions',    label: 'Max Mentions',   emoji: '🔢', inputLabel: 'Max mentions per message before action (number)',             placeholder: '10',                       getValue: c => String(c.antiMassMention?.maxMentions || 10),    formatValue: v => `\`${v}\` mentions` },
        { keyPath: 'antiMassMention.timeoutDurationMs', label: 'Timeout (s)', emoji: '⏱️', inputLabel: 'Timeout duration in seconds (e.g. 60 = 1 minute)',            placeholder: '60',                       getValue: c => String((c.antiMassMention?.timeoutDurationMs || 60000) / 1000), formatValue: v => `${v}s` },
        { keyPath: 'antiMassMention.minViolationsForAction', label: 'Auto-action at', emoji: '⚠️', inputLabel: 'Violations before auto-action (number)',              placeholder: '2',                        getValue: c => String(c.antiMassMention?.minViolationsForAction || 2), formatValue: v => `${v} violations` },
    ],
    antiRaid: [
        { keyPath: 'antiRaid.action',               label: 'Action',          emoji: '⚡', inputLabel: 'Action (lockdown / alert / restrict / none)',                    placeholder: 'lockdown',                 getValue: c => c.antiRaid?.action || 'lockdown',               formatValue: v => `\`${v}\`` },
        { keyPath: 'antiRaid.joinThreshold',         label: 'Join Threshold', emoji: '📊', inputLabel: 'Number of joins within window to trigger (number)',           placeholder: '10',                       getValue: c => String(c.antiRaid?.joinThreshold || 10),         formatValue: v => `\`${v}\` joins` },
        { keyPath: 'antiRaid.detectionWindowMs',     label: 'Window (s)',     emoji: '⏱️', inputLabel: 'Detection window in seconds (e.g. 60 = 1 minute)',             placeholder: '60',                       getValue: c => String((c.antiRaid?.detectionWindowMs || 60000) / 1000), formatValue: v => `${v}s` },
    ],
    antiNuke: [
        { keyPath: 'antiNuke.action',                label: 'Action',          emoji: '⚡', inputLabel: 'Action (punish / kick / warn / none)',                        placeholder: 'punish',                   getValue: c => c.antiNuke?.action || 'punish',                 formatValue: v => `\`${v}\`` },
        { keyPath: 'antiNuke.actionThreshold',       label: 'Action Threshold',emoji: '📊', inputLabel: 'Number of actions within window to trigger (number)',         placeholder: '5',                        getValue: c => String(c.antiNuke?.actionThreshold || 5),        formatValue: v => `\`${v}\` actions` },
        { keyPath: 'antiNuke.detectionWindowMs',     label: 'Window (s)',     emoji: '⏱️', inputLabel: 'Detection window in seconds (e.g. 10)',                      placeholder: '10',                       getValue: c => String((c.antiNuke?.detectionWindowMs || 10000) / 1000), formatValue: v => `${v}s` },
    ],
};

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function customId(base, guildId, suffix = '') {
    return suffix ? `${base}:${guildId}:${suffix}` : `${base}:${guildId}`;
}

function isEnabled(status) {
    return status ? '🟢' : '🔴';
}

function boolDisplay(val) {
    return val ? '✅ Enabled' : '❌ Disabled';
}

function getNestedConfig(config, category) {
    if (!config) return false;
    const map = { antilink: 'antiLink', antispam: 'antiSpam', automod: 'autoMod', strikes: 'strikes',
        antimassmention: 'antiMassMention', antiRaid: 'antiRaid', antiNuke: 'antiNuke' };
    const key = map[category];
    return key ? config[key]?.enabled || false : false;
}

function formatDuration(ms) {
    if (ms < 0) return '0s';
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════
//  OVERVIEW EMBED
// ═══════════════════════════════════════════════════════════════

export function buildOverviewEmbed(config, guild) {
    const m = config;
    const masterOn = m.enabled;

    const featureLines = [
        `${isEnabled(masterOn && m.antiLink?.enabled)} **Anti-Link** — Block Discord invites & suspicious URLs`,
        `${isEnabled(masterOn && m.antiSpam?.enabled)} **Anti-Spam** — Detect rapid messages & mention spam`,
        `${isEnabled(masterOn && m.autoMod?.enabled)} **Auto-Mod** — Blocked words, all-caps, repeated text`,
        `${isEnabled(masterOn && m.strikes?.enabled)} **Strikes** — Progressive punishment escalation`,
        `${isEnabled(masterOn && m.antiMassMention?.enabled)} **Anti-Mass Mention** — Block mass user/role/@everyone pings`,
        `${isEnabled(masterOn && m.antiRaid?.enabled)} **Anti-Raid** — Detect join spikes & auto-lockdown`,
        `${isEnabled(masterOn && m.antiNuke?.enabled)} **Anti-Nuke** — Stop channel/role deletion & mass bans`,
    ];

    return createEmbed({
        title: `${masterOn ? '🛡️' : '⚙️'} Moderation Dashboard`,
        description: masterOn
            ? `All systems **active** for **${guild.name}**. Select a category below to configure.`
            : `Moderation systems are **disabled** for **${guild.name}**. Enable the master toggle to start.`,
        color: masterOn ? 'success' : 'secondary',
        fields: [
            { name: `${isEnabled(masterOn)} Master Toggle`, value: masterOn ? 'All moderation systems are **active**.' : 'All moderation systems are **disabled**.', inline: false },
            { name: '📋 Active Features', value: featureLines.join('\n'), inline: false },
            { name: '📢 Log Channel', value: m.logChannelId ? `<#${m.logChannelId}>` : '`Not set`', inline: true },
            { name: '🙈 Ignored Roles', value: m.ignoredRoles?.length ? m.ignoredRoles.map(id => `<@&${id}>`).join(', ') : '`None`', inline: true },
            { name: '#️⃣ Ignored Channels', value: m.ignoredChannels?.length ? m.ignoredChannels.map(id => `<#${id}>`).join(', ') : '`None`', inline: true },
        ],
        footer: 'Changes apply immediately — click any setting button to edit',
    });
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORY EMBEDS
// ═══════════════════════════════════════════════════════════════

export function buildCategoryEmbed(category, config, guild) {
    const m = config;
    let embed;

    switch (category) {
        case 'antilink': {
            const al = m.antiLink || {};
            embed = createEmbed({
                title: '🚫 Anti-Link', description: 'Block Discord invite links and suspicious URLs.',
                color: al.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(al.enabled)} Status`, value: boolDisplay(al.enabled), inline: true },
                    { name: '⚡ Action', value: `\`${al.action || 'warn'}\``, inline: true },
                    { name: '⚠️ Auto-action after', value: `${al.minViolationsForAction || 3} violations`, inline: true },
                    { name: '✅ Allowed Invite Codes', value: (al.allowedInviteCodes || []).length > 0 ? `\`${al.allowedInviteCodes.join('`, `')}\`` : '`None`', inline: false },
                    { name: '🌐 Whitelisted Domains', value: (al.whitelistedDomains || []).length > 0 ? `\`${al.whitelistedDomains.join('`, `')}\`` : '`None`', inline: false },
                ],
            });
            break;
        }
        case 'antispam': {
            const as = m.antiSpam || {};
            embed = createEmbed({
                title: '🤖 Anti-Spam', description: 'Detect rapid message bursts and mention spam.',
                color: as.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(as.enabled)} Status`, value: boolDisplay(as.enabled), inline: true },
                    { name: '⚡ Action', value: `\`${as.action || 'timeout'}\``, inline: true },
                    { name: '📊 Max Messages', value: `\`${as.maxMessages || 5}\` in \`${(as.windowMs || 5000) / 1000}s\``, inline: true },
                    { name: '🔗 Max Mentions', value: `\`${as.maxMentions || 4}\` per message`, inline: true },
                    { name: '⏱️ Timeout Duration', value: `\`${formatDuration(as.timeoutDurationMs || 60000)}\``, inline: true },
                    { name: '⚠️ Auto-action after', value: `${as.minViolationsForAction || 3} violations`, inline: true },
                ],
            });
            break;
        }
        case 'automod': {
            const am = m.autoMod || {}; const caps = am.antiCaps || {}; const repeat = am.antiRepeatedText || {};
            embed = createEmbed({
                title: '📖 Auto-Mod', description: 'Filter blocked words, all-caps spam, and repeated text.',
                color: am.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(am.enabled)} Status`, value: boolDisplay(am.enabled), inline: true },
                    { name: '📝 Blocked Words', value: (am.blockedWords || []).length > 0 ? `\`${am.blockedWords.join('`, `')}\`` : '`None`', inline: false },
                    { name: '🔤 Caps Protection', value: caps.enabled ? `✅ ON — ${caps.minLength || 8}+ chars, ${caps.capsThreshold || 70}% caps, action: \`${caps.action || 'warn'}\`` : '❌ OFF', inline: false },
                    { name: '🔁 Repeated Text', value: repeat.enabled ? `✅ ON — ${repeat.maxConsecutiveChars || 8}+ chars, action: \`${repeat.action || 'warn'}\`` : '❌ OFF', inline: false },
                ],
            });
            break;
        }
        case 'strikes': {
            const st = m.strikes || {};
            const tiers = (st.tiers || []).map(t => `**${t.threshold}+** → \`${t.action}\`${t.durationMs ? ` (${formatDuration(t.durationMs)})` : ''}`).join('\n');
            embed = createEmbed({
                title: '⚡ Strike System', description: 'Auto-escalate punishment as violations accumulate.',
                color: st.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(st.enabled)} Status`, value: boolDisplay(st.enabled), inline: true },
                    { name: '⏳ Strike Decay', value: `After \`${Math.round((st.decayMs || 86400000) / 3600000)}h\` without violations`, inline: true },
                    { name: '📈 Escalation Tiers', value: tiers || '`No tiers configured`', inline: false },
                ],
            });
            break;
        }
        case 'antimassmention': {
            const amm = m.antiMassMention || {};
            embed = createEmbed({
                title: '📣 Anti-Mass Mention', description: 'Detect users abusing mentions — mass pings, @everyone, role mentions.',
                color: amm.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(amm.enabled)} Status`, value: boolDisplay(amm.enabled), inline: true },
                    { name: '🔢 Max Mentions', value: `\`${amm.maxMentions || 10}\` per message`, inline: true },
                    { name: '⚡ Action', value: `\`${amm.action || 'warn'}\``, inline: true },
                    { name: '🚫 Block @everyone/@here', value: amm.blockEveryone !== false ? '✅ Yes' : '❌ No', inline: true },
                    { name: '⏱️ Timeout Duration', value: `\`${formatDuration(amm.timeoutDurationMs || 60000)}\``, inline: true },
                    { name: '⚠️ Auto-action after', value: `${amm.minViolationsForAction || 2} violations`, inline: true },
                    { name: '✅ Allowed Roles', value: (amm.allowedRoles || []).length > 0 ? (amm.allowedRoles || []).map(id => `<@&${id}>`).join(', ') : '`None`', inline: false },
                ],
            });
            break;
        }
        case 'antiRaid': {
            const ar = m.antiRaid || {};
            embed = createEmbed({
                title: '🚨 Anti-Raid Protection', description: 'Detect sudden server attacks from mass joins.',
                color: ar.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(ar.enabled)} Status`, value: boolDisplay(ar.enabled), inline: true },
                    { name: '📊 Join Threshold', value: `\`${ar.joinThreshold || 10}\` joins`, inline: true },
                    { name: '⏱️ Detection Window', value: `\`${((ar.detectionWindowMs || 60000) / 1000)}s\``, inline: true },
                    { name: '⚡ Action', value: `\`${ar.action || 'lockdown'}\``, inline: true },
                    { name: '🔔 Alert Moderators', value: ar.alertModerators !== false ? '✅ Yes' : '❌ No', inline: true },
                    { name: '🆕 Restrict New Accounts', value: ar.restrictNewAccounts !== false ? `✅ Yes (< ${Math.round((ar.newAccountAgeMs || 604800000) / 86400000)} days)` : '❌ No', inline: false },
                ],
            });
            break;
        }
        case 'antiNuke': {
            const an = m.antiNuke || {};
            embed = createEmbed({
                title: '💣 Anti-Nuke Protection', description: 'Protect server settings from destructive actions.',
                color: an.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(an.enabled)} Status`, value: boolDisplay(an.enabled), inline: true },
                    { name: '📊 Action Threshold', value: `\`${an.actionThreshold || 5}\` actions`, inline: true },
                    { name: '⏱️ Detection Window', value: `\`${((an.detectionWindowMs || 10000) / 1000)}s\``, inline: true },
                    { name: '⚡ Action', value: `\`${an.action || 'punish'}\``, inline: true },
                    { name: '🔔 Notify Staff', value: an.notifyStaff !== false ? '✅ Yes' : '❌ No', inline: true },
                    { name: '🔄 Restore Settings', value: an.restoreSettings !== false ? '✅ Yes' : '❌ No', inline: false },
                ],
            });
            break;
        }
        default:
            embed = buildOverviewEmbed(config, guild);
    }

    return embed;
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENT BUILDERS
// ═══════════════════════════════════════════════════════════════

export function buildOverviewComponents(guildId, config) {
    const masterOn = config.enabled;

    const categoryOptions = [
        ['Anti-Link', '🚫', 'antilink'],
        ['Anti-Spam', '🤖', 'antispam'],
        ['Auto-Mod', '📖', 'automod'],
        ['Strike System', '⚡', 'strikes'],
        ['Anti-Mass Mention', '📣', 'antimassmention'],
        ['Anti-Raid', '🚨', 'antiRaid'],
        ['Anti-Nuke', '💣', 'antiNuke'],
    ].map(([label, emoji, value]) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setDescription(`${isEnabled(masterOn && getNestedConfig(config, value))} Configure ${label}`)
            .setValue(value)
            .setEmoji(emoji)
    );

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(customId(TOGGLE_MASTER, guildId))
                .setLabel(masterOn ? '🛡️ Disable All' : '🛡️ Enable All')
                .setStyle(masterOn ? ButtonStyle.Danger : ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(customId(CATEGORY_SELECT, guildId))
                .setPlaceholder('📁 Select a category to configure...')
                .addOptions(categoryOptions),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(customId(REFRESH, guildId))
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

/**
 * Build category page components including interactive setting buttons.
 * Buttons are generated from CATEGORY_SETTINGS map — first 4 in row1, rest in row2.
 */
export function buildCategoryComponents(guildId, category, config) {
    const rows = [];
    const isFeatureOn = getNestedConfig(config, category);

    const toggleMap = {
        antilink: TOGGLE_ANTILINK, antispam: TOGGLE_ANTISPAM, automod: TOGGLE_AUTOMOD,
        strikes: TOGGLE_STRIKES, antimassmention: TOGGLE_ANTI_MASS_MENTION,
        antiRaid: TOGGLE_ANTI_RAID, antiNuke: TOGGLE_ANTI_NUKE,
    };

    // Navigation + toggle row
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(customId(HOME_PAGE, guildId))
                .setLabel('◀️ Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(customId(toggleMap[category] || TOGGLE_STRIKES, guildId, category))
                .setLabel(isFeatureOn ? '🔴 Disable' : '🟢 Enable')
                .setStyle(isFeatureOn ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(customId(REFRESH, guildId))
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
        ),
    );

    // Setting buttons — generated from CATEGORY_SETTINGS map
    if (isFeatureOn) {
        const settings = CATEGORY_SETTINGS[category] || [];
        if (settings.length > 0) {
            const buttons = settings.map((setting, idx) =>
                new ButtonBuilder()
                    .setCustomId(customId(SETTING_BUTTON, guildId, `${category}:${idx}`))
                    .setLabel(`${setting.emoji} ${setting.label}`)
                    .setStyle(ButtonStyle.Secondary)
            );

            // Split into rows of 4 buttons max
            for (let i = 0; i < buttons.length; i += 4) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 4)));
            }
        }
    }

    return rows;
}

// ═══════════════════════════════════════════════════════════════
//  VIEW BUILDER
// ═══════════════════════════════════════════════════════════════

export async function buildModDashboardView(client, guildId, guild, view = 'overview', category = null) {
    const config = await getModerationConfig(client, guildId);

    if (view === 'category' && category) {
        return {
            embed: buildCategoryEmbed(category, config, guild),
            components: buildCategoryComponents(guildId, category, config),
            category,
        };
    }

    return {
        embed: buildOverviewEmbed(config, guild),
        components: buildOverviewComponents(guildId, config),
    };
}

// ═══════════════════════════════════════════════════════════════
//  INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════

export async function handleDashboardComponent(interaction, client) {
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const guildId = parts[1];
    const suffix = parts[2] || null;

    if (guildId !== interaction.guildId) {
        await interaction.reply({ content: 'This dashboard belongs to another server.', ephemeral: true });
        return;
    }

    const guild = interaction.guild;

    // ── Category select menu ──
    if (action === CATEGORY_SELECT) {
        const selected = interaction.values[0];
        const view = await buildModDashboardView(client, guildId, guild, 'category', selected);
        await interaction.update({ embeds: [view.embed], components: view.components });
        return;
    }

    // ── Setting button — show modal (NO deferUpdate — required for modals) ──
    if (action === SETTING_BUTTON) {
        const config = await getModerationConfig(client, guildId);
        // suffix format: "category:settingIndex"
        const [category, settingIndex] = (suffix || ':0').split(':');
        const settings = CATEGORY_SETTINGS[category] || [];
        const settingDef = settings[parseInt(settingIndex) || 0];
        if (!settingDef) {
            await interaction.reply({ content: 'Setting not found.', ephemeral: true });
            return;
        }

        const currentValue = settingDef.getValue(config);
        const modal = new ModalBuilder()
            .setCustomId(customId(SETTING_MODAL, guildId, `${category}:${settingIndex}`))
            .setTitle(`Edit: ${settingDef.label}`);

        const input = new TextInputBuilder()
            .setCustomId('setting_value')
            .setLabel(settingDef.inputLabel)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(settingDef.placeholder)
            .setValue(String(currentValue))
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);

        // Wait for modal submission
        try {
            const modalSubmit = await interaction.awaitModalSubmit({
                filter: (i) =>
                    i.customId === customId(SETTING_MODAL, guildId, `${category}:${settingIndex}`) &&
                    i.user.id === interaction.user.id,
                time: 120_000,
            });

            const rawValue = modalSubmit.fields.getTextInputValue('setting_value').trim();

            // Parse value based on setting type
            let parsedValue;
            const currentSetting = CATEGORY_SETTINGS[category]?.[parseInt(settingIndex)];
            if (!currentSetting) {
                await modalSubmit.reply({ content: 'Setting expired. Please refresh the dashboard.', ephemeral: true });
                return;
            }

            // Check if this is a list setting (comma-separated) or number
            if (currentSetting.inputLabel.toLowerCase().includes('comma-separated') ||
                currentSetting.inputLabel.toLowerCase().includes('(comma')) {
                parsedValue = rawValue ? rawValue.split(',').map(w => w.trim()).filter(w => w.length > 0) : [];
            } else if (currentSetting.inputLabel.toLowerCase().includes('(number)') ||
                       currentSetting.inputLabel.toLowerCase().includes('threshold') ||
                       currentSetting.inputLabel.toLowerCase().includes('seconds') ||
                       currentSetting.inputLabel.toLowerCase().includes('hours') ||
                       currentSetting.inputLabel.toLowerCase().includes('number')) {
                // Check if it's a time value (seconds/hours) that needs conversion to ms
                if (currentSetting.keyPath.endsWith('Ms') || currentSetting.keyPath.endsWith('ms')) {
                    // Value is in seconds in the UI, convert to ms
                    parsedValue = parseInt(rawValue, 10) * 1000;
                } else if (currentSetting.keyPath.endsWith('decayMs')) {
                    // Value is in hours, convert to ms
                    parsedValue = parseInt(rawValue, 10) * 3600000;
                } else if (currentSetting.keyPath.endsWith('capsThreshold')) {
                    parsedValue = parseInt(rawValue, 10);
                } else {
                    const num = parseInt(rawValue, 10);
                    if (isNaN(num) || num <= 0) {
                        await modalSubmit.reply({ content: 'Please enter a valid positive number.', ephemeral: true });
                        return;
                    }
                    parsedValue = num;
                }
            } else {
                parsedValue = rawValue;
            }

            await updateModerationSetting(client, guildId, currentSetting.keyPath, parsedValue);

            const view = await buildModDashboardView(client, guildId, guild, 'category', category);
            await modalSubmit.update({ embeds: [view.embed], components: view.components });

            const displayValue = Array.isArray(parsedValue)
                ? parsedValue.join('`, `')
                : parsedValue;

            await modalSubmit.followUp({
                embeds: [successEmbed('Setting Updated',
                    `**${currentSetting.label}** changed to: \`${displayValue}\``
                )],
                flags: MessageFlags.Ephemeral,
            });
        } catch (err) {
            // Modal timed out or cancelled — do nothing
            return;
        }
        return;
    }

    // ── For all other buttons, defer update ──
    await interaction.deferUpdate();

    // ── Home / Refresh ──
    if (action === HOME_PAGE || action === REFRESH) {
        const view = await buildModDashboardView(client, guildId, guild, 'overview');
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    // ── Master toggle ──
    if (action === TOGGLE_MASTER) {
        const config = await getModerationConfig(client, guildId);
        await updateModerationSetting(client, guildId, 'enabled', !config.enabled);
        const view = await buildModDashboardView(client, guildId, guild, 'overview');
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    // ── Feature toggle ──
    const TOGGLES = [TOGGLE_ANTILINK, TOGGLE_ANTISPAM, TOGGLE_AUTOMOD, TOGGLE_STRIKES,
                     TOGGLE_ANTI_MASS_MENTION, TOGGLE_ANTI_RAID, TOGGLE_ANTI_NUKE];
    if (TOGGLES.includes(action)) {
        const featureMap = {
            [TOGGLE_ANTILINK]: 'antiLink.enabled', [TOGGLE_ANTISPAM]: 'antiSpam.enabled',
            [TOGGLE_AUTOMOD]: 'autoMod.enabled', [TOGGLE_STRIKES]: 'strikes.enabled',
            [TOGGLE_ANTI_MASS_MENTION]: 'antiMassMention.enabled',
            [TOGGLE_ANTI_RAID]: 'antiRaid.enabled', [TOGGLE_ANTI_NUKE]: 'antiNuke.enabled',
        };
        const category = suffix || featureMap[action].split('.')[0];
        await toggleModerationFeature(client, guildId, featureMap[action]);
        const view = await buildModDashboardView(client, guildId, guild, 'category', category);
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    await interaction.editReply({ content: 'Unknown dashboard action.', embeds: [], components: [] });
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export function isModDashboardCustomId(customIdValue) {
    return customIdValue.startsWith(DASHBOARD_PREFIX + '_');
}

export function createDashboardCollectorFilter(userId, guildId) {
    return (componentInteraction) =>
        componentInteraction.user.id === userId &&
        componentInteraction.customId.includes(`:${guildId}`);
}
