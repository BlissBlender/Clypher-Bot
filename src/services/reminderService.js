import { parseDuration } from './giveawayService.js';

const REMINDER_KEY = 'global:reminders';

export async function getReminders(client) {
    return (await client.db.get(REMINDER_KEY)) || [];
}

export async function saveReminders(client, reminders) {
    await client.db.set(REMINDER_KEY, reminders);
}

export async function addReminder(client, { userId, guildId, channelId, message, expiresAt }) {
    const reminders = await getReminders(client);
    const id = `${Date.now()}-${userId}`;
    reminders.push({ id, userId, guildId, channelId, message, expiresAt });
    await saveReminders(client, reminders);
    return id;
}

export async function processDueReminders(client) {
    const reminders = await getReminders(client);
    const now = Date.now();
    const due = reminders.filter((r) => r.expiresAt <= now);
    const remaining = reminders.filter((r) => r.expiresAt > now);

    if (due.length > 0) {
        await saveReminders(client, remaining);
    }

    for (const reminder of due) {
        try {
            const user = await client.users.fetch(reminder.userId).catch(() => null);
            if (!user) continue;

            const { createEmbed } = await import('../utils/embeds.js');
            const embed = createEmbed({
                title: 'Reminder',
                description: reminder.message,
                color: 'info',
            });

            if (reminder.guildId && reminder.channelId) {
                const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
                if (channel?.isTextBased()) {
                    await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] }).catch(() => {
                        user.send({ embeds: [embed] }).catch(() => {});
                    });
                    continue;
                }
            }

            await user.send({ embeds: [embed] }).catch(() => {});
        } catch {
            // Skip failed reminders
        }
    }

    return due.length;
}

export function parseReminderDuration(input) {
    try {
        return parseDuration(input);
    } catch {
        return null;
    }
}
