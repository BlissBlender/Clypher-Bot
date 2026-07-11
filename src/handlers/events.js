import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function loadEvents(client) {
    const eventsPath = join(__dirname, '../events');
    const eventFiles = await readdir(eventsPath).then(files => files.filter(file => file.endsWith('.js')));

    logger.info(`Found ${eventFiles.length} event files to load`);

    for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        try {
            const module = await import(`file://${filePath}`);
            const events = [];

            // 1. Check for default export (single event or array of events)
            if (module.default) {
                if (Array.isArray(module.default)) {
                    events.push(...module.default);
                } else if (module.default?.name) {
                    events.push(module.default);
                }
            }

            // 2. Check for named exports matching { name, execute }
            for (const key of Object.keys(module)) {
                if (key === 'default') continue;
                const candidate = module[key];
                if (candidate?.name && typeof candidate.execute === 'function') {
                    events.push(candidate);
                }
            }

            if (events.length === 0) {
                // No valid events found — skip warning for modules with only helper exports
                if (module.default === undefined && !Object.keys(module).some(k => k !== 'default' && module[k]?.name)) {
                    continue;
                }
                logger.warn(`Event ${file} has no exports matching the { name, execute } pattern.`);
                continue;
            }

            for (const event of events) {
                const safeExecute = async (...args) => {
                    try {
                        await event.execute(...args, client);
                    } catch (error) {
                        logger.error(`Error executing event ${event.name}:`, error);
                    }
                };

                if (event.once) {
                    client.once(event.name, safeExecute);
                    logger.info(`✅ Registered once event: ${event.name}`);
                } else {
                    client.on(event.name, safeExecute);
                    logger.info(`✅ Registered event: ${event.name} (from ${file})`);
                }
            }
        } catch (error) {
            logger.error(`Error loading event ${file}:`, error);
        }
    }
}