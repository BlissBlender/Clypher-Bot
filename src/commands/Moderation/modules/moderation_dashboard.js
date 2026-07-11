// moderation_dashboard.js — Interactive dashboard for Anti-Link, Anti-Spam, Auto-Mod

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

// ── Custom ID constants ──────────────────────────────────────

export const DASHBOARD_PREFIX = 'mod';

export const HOME_PAGE       = `${DASHBOARD_PREFIX}_home`;
export const REFRESH         = `${DASHBOARD_PREFIX}_refresh`;
export const TOGGLE_MASTER   = `${DASHBOARD_PREFIX}_toggle_master`;
export const CATEGORY_SELECT = `${DASHBOARD_PREFIX}_category`;

export const TOGGLE_FEATURE  = `${DASHBOARD_PREFIX}_toggle_feature`;
export const TOGGLE_ANTILINK = `${DASHBOARD_PREFIX}_toggle_al`;
export const TOGGLE_ANTISPAM = `${DASHBOARD_PREFIX}_toggle_as`;
export const TOGGLE_AUTOMOD  = `${DASHBOARD_PREFIX}_toggle_am`;
export const TOGGLE_STRIKES  = `${DASHBOARD_PREFIX}_toggle_strikes`;
export const TOGGLE_ANTI_MASS_MENTION = `${DASHBOARD_PREFIX}_toggle_amm`;
export const TOGGLE_ANTI_RAID = `${DASHBOARD_PREFIX}_toggle_ar`;
export const TOGGLE_ANTI_NUKE = `${DASHBOARD_PREFIX}_toggle_an`;

export const OPEN_CATEGORY   = `${DASHBOARD_PREFIX}_open_category`;
export const IGNORED_WORDS   = `${DASHBOARD_PREFIX}_ignored_words`;
export const IGNORED_WORDS_MODAL = `${DASHBOARD_PREFIX}_ignored_words_modal`;

// ── Helpers ──────────────────────────────────────────────────

function customId(base, guildId, suffix = '') {
    return suffix ? `${base}:${guildId}:${suffix}` : `${base}:${guildId}`;
}

function isEnabled(status) {
    return status ? '🟢' : '🔴';
}

function boolDisplay(val) {
    return val ? '✅ Enabled' : '❌ Disabled';
}

// ── Overview Embed ───────────────────────────────────────────

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

    const logChannel = m.logChannelId
        ? `<#${m.logChannelId}>`
        : '`Not set`';

    const ignoredRoles = m.ignoredRoles?.length
        ? m.ignoredRoles.map(id => `<@&${id}>`).join(', ')
        : '`None`';

    const ignoredChannels = m.ignoredChannels?.length
        ? m.ignoredChannels.map(id => `<#${id}>`).join(', ')
        : '`None`';

    return createEmbed({
        title: `${masterOn ? '🛡️' : '⚙️'} Moderation Dashboard`,
        description: masterOn
            ? `All systems **active** for **${guild.name}**. Select a category below to configure.`
            : `Moderation systems are **disabled** for **${guild.name}**. Enable the master toggle to start.`,
        color: masterOn ? 'success' : 'secondary',
        fields: [
            {
                name: `${isEnabled(masterOn)} Master Toggle`,
                value: masterOn
                    ? 'All moderation systems are **active**.\\nToggle off to disable everything at once.'
                    : 'All moderation systems are **disabled**.',
                inline: false,
            },
            {
                name: '📋 Active Features',
                value: featureLines.join('\n'),
                inline: false,
            },
            {
                name: '📢 Log Channel',
                value: logChannel,
                inline: true,
            },
            {
                name: '🙈 Ignored Roles',
                value: ignoredRoles,
                inline: true,
            },
            {
                name: '#️⃣ Ignored Channels',
                value: ignoredChannels,
                inline: true,
            },
        ],
        footer: 'Changes apply immediately — no save button needed',
    });
}

// ── Category Embed ───────────────────────────────────────────

export function buildCategoryEmbed(category, config, guild) {
    const m = config;
    let embed;

    switch (category) {
        case 'antilink': {
            const al = m.antiLink || {};
            embed = createEmbed({
                title: '🚫 Anti-Link',
                description: 'Block Discord invite links and suspicious URLs.',
                color: al.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(al.enabled)} Status`, value: boolDisplay(al.enabled), inline: true },
                    { name: '⚡ Action', value: `\`${al.action || 'warn'}\``, inline: true },
                    { name: '⚠️ Auto-action after', value: `${al.minViolationsForAction || 3} violations`, inline: true },
                    { name: '✅ Allowed Invite Codes', value: (al.allowedInviteCodes || []).length > 0 ? `\`${al.allowedInviteCodes.join('`, `')}\`` : '`None`', inline: false },
                    { name: '✅ Whitelisted Domains', value: (al.whitelistedDomains || []).length > 0 ? `\`${al.whitelistedDomains.join('`, `')}\`` : '`None`', inline: false },
                ],
                footer: 'Action: warn = DM · timeout = mute · kick = remove',
            });
            break;
        }
        case 'antispam': {
            const as = m.antiSpam || {};
            embed = createEmbed({
                title: '🤖 Anti-Spam',
                description: 'Detect rapid message bursts and mention spam.',
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
            const am = m.autoMod || {};
            const caps = am.antiCaps || {};
            const repeat = am.antiRepeatedText || {};
            embed = createEmbed({
                title: '📖 Auto-Mod',
                description: 'Filter blocked words, all-caps spam, and repeated text.',
                color: am.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(am.enabled)} Status`, value: boolDisplay(am.enabled), inline: true },
                    { name: '📝 Blocked Words', value: (am.blockedWords || []).length > 0 ? `\`${am.blockedWords.join('`, `')}\`` : '`None`', inline: false },
                    { name: '🔤 Caps Protection', value: caps.enabled ? `✅ ON — ${caps.minLength || 8}+ chars, ${caps.capsThreshold || 70}% caps, action: \`${caps.action || 'warn'}\`` : '❌ OFF', inline: false },
                    { name: '🙈 Ignored Words', value: (caps.ignoredWords || []).length > 0 ? `\`${caps.ignoredWords.join('`, `')}\`` : '`None`', inline: false },
                    { name: '🔁 Repeated Text', value: repeat.enabled ? `✅ ON — ${repeat.maxConsecutiveChars || 8}+ consecutive chars, action: \`${repeat.action || 'warn'}\`` : '❌ OFF', inline: false },
                ],
            });
            break;
        }
        case 'strikes': {
            const st = m.strikes || {};
            const tiers = (st.tiers || []).map(t =>
                `**${t.threshold}+** → \`${t.action}\`${t.durationMs ? ` (${formatDuration(t.durationMs)})` : ''}`
            ).join('\n');
            embed = createEmbed({
                title: '⚡ Strike System',
                description: 'Auto-escalate punishment as violations accumulate.',
                color: st.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(st.enabled)} Status`, value: boolDisplay(st.enabled), inline: true },
                    { name: '⏳ Strike Decay', value: `After \`24h\` without violations`, inline: true },
                    { name: '📈 Escalation Tiers', value: tiers || '`No tiers configured`', inline: false },
                ],
            });
            break;
        }
        case 'antimassmention': {
            const amm = m.antiMassMention || {};
            embed = createEmbed({
                title: '📣 Anti-Mass Mention',
                description: 'Detect users abusing mentions — mass pings, @everyone, role mentions.',
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
                footer: 'Allowed roles bypass all mass-mention checks',
            });
            break;
        }
        case 'antiRaid': {
            const ar = m.antiRaid || {};
            embed = createEmbed({
                title: '🚨 Anti-Raid Protection',
                description: 'Detect sudden server attacks from mass joins.',
                color: ar.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(ar.enabled)} Status`, value: boolDisplay(ar.enabled), inline: true },
                    { name: '📊 Join Threshold', value: `\`${ar.joinThreshold || 10}\` joins`, inline: true },
                    { name: '⏱️ Detection Window', value: `\`${((ar.detectionWindowMs || 60000) / 1000)}s\``, inline: true },
                    { name: '⚡ Action', value: `\`${ar.action || 'lockdown'}\``, inline: true },
                    { name: '🔔 Alert Moderators', value: ar.alertModerators !== false ? '✅ Yes' : '❌ No', inline: true },
                    { name: '🆕 Restrict New Accounts', value: ar.restrictNewAccounts !== false ? `✅ Yes (< ${Math.round((ar.newAccountAgeMs || 604800000) / 86400000)} days)` : '❌ No', inline: false },
                ],
                footer: 'Lockdown disables SendMessages for @everyone until reset',
            });
            break;
        }
        case 'antiNuke': {
            const an = m.antiNuke || {};
            embed = createEmbed({
                title: '💣 Anti-Nuke Protection',
                description: 'Protect server settings from destructive actions — channel/role deletion, mass bans.',
                color: an.enabled ? 'success' : 'secondary',
                fields: [
                    { name: `${isEnabled(an.enabled)} Status`, value: boolDisplay(an.enabled), inline: true },
                    { name: '📊 Action Threshold', value: `\`${an.actionThreshold || 5}\` actions`, inline: true },
                    { name: '⏱️ Detection Window', value: `\`${((an.detectionWindowMs || 10000) / 1000)}s\``, inline: true },
                    { name: '⚡ Action', value: `\`${an.action || 'punish'}\``, inline: true },
                    { name: '🔔 Notify Staff', value: an.notifyStaff !== false ? '✅ Yes' : '❌ No', inline: true },
                    { name: '🔄 Restore Settings', value: an.restoreSettings !== false ? '✅ Yes' : '❌ No', inline: false },
                ],
                footer: 'Monitors: channel/role create/delete, mass bans, webhooks',
            });
            break;
        }
        default:
            embed = buildOverviewEmbed(config, guild);
    }

    return embed;
}

// ── Dashboard Components ─────────────────────────────────────

export function buildOverviewComponents(guildId, config) {
    const masterOn = config.enabled;

    const categoryOptions = [
        new StringSelectMenuOptionBuilder()
            .setLabel('Anti-Link')
            .setDescription(`${isEnabled(masterOn && config.antiLink?.enabled)} Block Discord invites & suspicious URLs`)
            .setValue('antilink')
            .setEmoji('🚫'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Anti-Spam')
            .setDescription(`${isEnabled(masterOn && config.antiSpam?.enabled)} Detect rapid messages & mention spam`)
            .setValue('antispam')
            .setEmoji('🤖'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Auto-Mod')
            .setDescription(`${isEnabled(masterOn && config.autoMod?.enabled)} Blocked words, caps, repeated text`)
            .setValue('automod')
            .setEmoji('📖'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Strike System')
            .setDescription(`${isEnabled(masterOn && config.strikes?.enabled)} Progressive punishment escalation`)
            .setValue('strikes')
            .setEmoji('⚡'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Anti-Mass Mention')
            .setDescription(`${isEnabled(masterOn && config.antiMassMention?.enabled)} Block mass pings & @everyone`)
            .setValue('antimassmention')
            .setEmoji('📣'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Anti-Raid')
            .setDescription(`${isEnabled(masterOn && config.antiRaid?.enabled)} Join spike detection & lockdown`)
            .setValue('antiRaid')
            .setEmoji('🚨'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Anti-Nuke')
            .setDescription(`${isEnabled(masterOn && config.antiNuke?.enabled)} Destructive action prevention`)
            .setValue('antiNuke')
            .setEmoji('💣'),
    ];

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

export function buildCategoryComponents(guildId, category, config) {
    const rows = [];

    // Toggle row
    const isFeatureOn = getNestedConfig(config, category);
    const toggleCustomId = category === 'antilink' ? TOGGLE_ANTILINK
        : category === 'antispam' ? TOGGLE_ANTISPAM
        : category === 'automod' ? TOGGLE_AUTOMOD
        : category === 'strikes' ? TOGGLE_STRIKES
        : category === 'antimassmention' ? TOGGLE_ANTI_MASS_MENTION
        : category === 'antiRaid' ? TOGGLE_ANTI_RAID
        : category === 'antiNuke' ? TOGGLE_ANTI_NUKE
        : TOGGLE_STRIKES;

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(customId(HOME_PAGE, guildId))
                .setLabel('◀️ Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(customId(toggleCustomId, guildId, category))
                .setLabel(isFeatureOn ? '🔴 Disable' : '🟢 Enable')
                .setStyle(isFeatureOn ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(customId(REFRESH, guildId))
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
        ),
    );

    // Auto-Mod specific: add Ignored Words management button
    if (category === 'automod' && isFeatureOn) {
        const capsConfig = config.autoMod?.antiCaps || {};
        const wordCount = (capsConfig.ignoredWords || []).length;
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(customId(IGNORED_WORDS, guildId, 'automod'))
                    .setLabel(`🙈 Ignored Words (${wordCount})`)
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    return rows;
}

// ── View Builder ─────────────────────────────────────────────

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

// ── Interaction Handler ──────────────────────────────────────

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

    if (action === CATEGORY_SELECT) {
        const selected = interaction.values[0];
        const view = await buildModDashboardView(client, guildId, guild, 'category', selected);
        await interaction.update({ embeds: [view.embed], components: view.components });
        return;
    }

    // ── Ignored Words button — show modal (no deferUpdate yet) ──
    if (action === IGNORED_WORDS) {
        const config = await getModerationConfig(client, guildId);
        const currentWords = (config.autoMod?.antiCaps?.ignoredWords || []).join(', ');

        const modal = new ModalBuilder()
            .setCustomId(customId(IGNORED_WORDS_MODAL, guildId))
            .setTitle('Manage Ignored Words (Anti-Caps)');

        const wordsInput = new TextInputBuilder()
            .setCustomId('ignored_words')
            .setLabel('Words to ignore (comma-separated)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('USA, NASA, FBI, CIA, LOL, OMG')
            .setValue(currentWords)
            .setRequired(false)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(wordsInput));
        await interaction.showModal(modal);

        // Wait for the modal submission
        try {
            const modalSubmit = await interaction.awaitModalSubmit({
                filter: (i) =>
                    i.customId === customId(IGNORED_WORDS_MODAL, guildId) &&
                    i.user.id === interaction.user.id,
                time: 120_000,
            });

            const rawValue = modalSubmit.fields.getTextInputValue('ignored_words').trim();
            const words = rawValue
                ? rawValue.split(',').map(w => w.trim().toUpperCase()).filter(w => w.length > 0)
                : [];

            await updateModerationSetting(client, guildId, 'autoMod.antiCaps.ignoredWords', words);

            const view = await buildModDashboardView(client, guildId, guild, 'category', 'automod');
            await modalSubmit.update({
                embeds: [view.embed],
                components: view.components,
            });

            // Send a follow-up confirmation that auto-deletes
            await modalSubmit.followUp({
                embeds: [successEmbed('Ignored Words Updated',
                    `Anti-Caps will now ignore **${words.length}** word(s): \`${words.join('`, `') || 'None'}\``
                )],
                flags: MessageFlags.Ephemeral,
            });
        } catch (err) {
            // Modal timed out or user cancelled — do nothing
            return;
        }
        return;
    }

    // For button actions, defer update first
    await interaction.deferUpdate();

    if (action === HOME_PAGE || action === REFRESH) {
        const view = await buildModDashboardView(client, guildId, guild, 'overview');
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    if (action === TOGGLE_MASTER) {
        const config = await getModerationConfig(client, guildId);
        const newVal = !config.enabled;
        await updateModerationSetting(client, guildId, 'enabled', newVal);
        const view = await buildModDashboardView(client, guildId, guild, 'overview');
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    // Toggle individual features from category pages
    if ([TOGGLE_ANTILINK, TOGGLE_ANTISPAM, TOGGLE_AUTOMOD, TOGGLE_STRIKES, TOGGLE_ANTI_MASS_MENTION, TOGGLE_ANTI_RAID, TOGGLE_ANTI_NUKE].includes(action)) {
        const featureMap = {
            [TOGGLE_ANTILINK]: 'antiLink.enabled',
            [TOGGLE_ANTISPAM]: 'antiSpam.enabled',
            [TOGGLE_AUTOMOD]: 'autoMod.enabled',
            [TOGGLE_STRIKES]: 'strikes.enabled',
            [TOGGLE_ANTI_MASS_MENTION]: 'antiMassMention.enabled',
            [TOGGLE_ANTI_RAID]: 'antiRaid.enabled',
            [TOGGLE_ANTI_NUKE]: 'antiNuke.enabled',
        };
        const keyPath = featureMap[action];
        const category = suffix || keyPath.split('.')[0];
        await toggleModerationFeature(client, guildId, keyPath);
        const view = await buildModDashboardView(client, guildId, guild, 'category', category);
        await interaction.editReply({ embeds: [view.embed], components: view.components });
        return;
    }

    await interaction.editReply({ content: 'Unknown dashboard action.', embeds: [], components: [] });
}

// ── Utilities ────────────────────────────────────────────────

function getNestedConfig(config, category) {
    if (!config) return false;
    switch (category) {
        case 'antilink': return config.antiLink?.enabled || false;
        case 'antispam': return config.antiSpam?.enabled || false;
        case 'automod':  return config.autoMod?.enabled || false;
        case 'strikes':  return config.strikes?.enabled || false;
        case 'antimassmention': return config.antiMassMention?.enabled || false;
        case 'antiRaid': return config.antiRaid?.enabled || false;
        case 'antiNuke': return config.antiNuke?.enabled || false;
        default: return false;
    }
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

export function isModDashboardCustomId(customIdValue) {
    return customIdValue.startsWith(DASHBOARD_PREFIX + '_');
}

export function createDashboardCollectorFilter(userId, guildId) {
    return (componentInteraction) =>
        componentInteraction.user.id === userId &&
        componentInteraction.customId.includes(`:${guildId}`);
}
