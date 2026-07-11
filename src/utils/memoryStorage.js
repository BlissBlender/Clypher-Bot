// memoryStorage.js — In-memory Map-based store with file persistence fallback
//
// When PostgreSQL is unavailable, the DatabaseWrapper creates an instance of this
// class. Without file persistence, ALL data is lost on bot restart. This file adds
// automatic, debounced file persistence so data survives restarts and redeploys.
//
// Persistence details:
//   - Data is saved to disk at storagePath (default: data/persistent_storage.json)
//   - Writes are debounced (2s after last write) to batch I/O
//   - Atomic writes (write to .tmp, then rename) prevent corruption
//   - Data is loaded from disk on construction

import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from './logger.js';

const DEFAULT_STORAGE_PATH = path.resolve('data', 'persistent_storage.json');
const SAVE_DEBOUNCE_MS = 2000;

class MemoryStorage {
    constructor(storagePath = null) {
        this.data = new Map();
        this.expirationTimes = new Map();
        this.storagePath = storagePath || DEFAULT_STORAGE_PATH;
        this._saveTimer = null;
        this._pendingSave = false;
        this._loaded = false;
        this._loadPromise = null;
    }

    // ── Construction / initialization ──

    /** 
     * Load persisted data from disk. Called automatically on first operation
     * that needs data (lazy load), or explicitly via ensureLoaded().
     */
    async ensureLoaded() {
        if (this._loaded) return;
        if (this._loadPromise) return this._loadPromise;

        this._loadPromise = this._loadFromFile().finally(() => {
            this._loaded = true;
            this._loadPromise = null;
        });

        return this._loadPromise;
    }

    async _loadFromFile() {
        try {
            // ── One-time migration from legacy leveling.json ──
            await this._migrateFromLegacyFiles();

            if (!existsSync(this.storagePath)) {
                return;
            }

            const raw = await readFile(this.storagePath, 'utf-8');
            const parsed = JSON.parse(raw);

            // Restore data Map
            if (parsed.data && typeof parsed.data === 'object') {
                for (const [key, value] of Object.entries(parsed.data)) {
                    this.data.set(key, value);
                }
            }

            // Restore expiration times
            if (parsed.expirations && typeof parsed.expirations === 'object') {
                const now = Date.now();
                for (const [key, expiresAt] of Object.entries(parsed.expirations)) {
                    if (now < expiresAt) {
                        this.expirationTimes.set(key, expiresAt);
                    } else {
                        // Expired — remove data too
                        this.data.delete(key);
                    }
                }
            }

            const entryCount = this.data.size;
            if (entryCount > 0) {
                logger.info(`[MemoryStorage] Loaded ${entryCount} entries from ${this.storagePath}`);
            }
        } catch (error) {
            logger.warn(`[MemoryStorage] Could not load from ${this.storagePath}: ${error.message}`);
        }
    }

    /**
     * One-time migration from legacy data files (leveling.json) to the new
     * persistent_storage.json format. The old code stored leveling data in
     * data/leveling.json with flat "guildId:userId" keys. The new format uses
     * the full "guild:guildId:leveling:users:userId" key scheme.
     */
    async _migrateFromLegacyFiles() {
        const legacyLevelingPath = path.resolve('data', 'leveling.json');

        // Only migrate if the new file doesn't exist yet
        if (existsSync(this.storagePath)) return;
        if (!existsSync(legacyLevelingPath)) return;

        try {
            const raw = await readFile(legacyLevelingPath, 'utf-8');
            const legacyData = JSON.parse(raw);

            if (typeof legacyData !== 'object' || legacyData === null) return;

            let migratedCount = 0;
            for (const [userKey, value] of Object.entries(legacyData)) {
                // Old format key: "guildId:userId"
                const colonIdx = userKey.indexOf(':');
                if (colonIdx === -1) continue;

                const guildId = userKey.substring(0, colonIdx);
                const userId = userKey.substring(colonIdx + 1);
                if (!guildId || !userId) continue;

                const newKey = `guild:${guildId}:leveling:users:${userId}`;
                this.data.set(newKey, value);
                migratedCount++;
            }

            if (migratedCount > 0) {
                logger.info(`[MemoryStorage] Migrated ${migratedCount} entries from legacy ${legacyLevelingPath}`);

                // Rename old file so it's not migrated again
                const backupPath = legacyLevelingPath + '.migrated';
                await rename(legacyLevelingPath, backupPath);
                logger.info(`[MemoryStorage] Legacy file renamed to ${backupPath}`);
            }
        } catch (error) {
            logger.warn(`[MemoryStorage] Could not migrate legacy leveling data: ${error.message}`);
        }
    }

    // ── Persistence helpers ──

    _scheduleSave() {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        this._pendingSave = true;
        this._saveTimer = setTimeout(() => {
            this._saveTimer = null;
            this._flushSave().catch(err => {
                logger.warn(`[MemoryStorage] Background save failed: ${err.message}`);
            });
        }, SAVE_DEBOUNCE_MS);
    }

    async _flushSave() {
        if (!this._pendingSave) return;
        this._pendingSave = false;

        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }

        await this._saveToFile();
    }

    async _saveToFile() {
        try {
            const serializable = {
                data: Object.fromEntries(this.data),
                expirations: Object.fromEntries(this.expirationTimes),
            };

            await mkdir(path.dirname(this.storagePath), { recursive: true });

            // Atomic write: write to .tmp, then rename
            const tmpPath = this.storagePath + '.tmp';
            await writeFile(tmpPath, JSON.stringify(serializable), 'utf-8');
            await rename(tmpPath, this.storagePath);
        } catch (error) {
            logger.warn(`[MemoryStorage] Could not save to ${this.storagePath}: ${error.message}`);
        }
    }

    /**
     * Force an immediate synchronous-style save. Returns a promise that resolves
     * when the save is complete. Useful before process shutdown.
     */
    async flush() {
        await this.ensureLoaded();
        await this._flushSave();
    }

    // ── Public API (same interface as before) ──

    async get(key, defaultValue = null) {
        await this.ensureLoaded();

        const value = this.data.get(key);

        if (this.expirationTimes.has(key)) {
            const expirationTime = this.expirationTimes.get(key);
            if (Date.now() > expirationTime) {
                this.data.delete(key);
                this.expirationTimes.delete(key);
                return defaultValue;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    async set(key, value, ttl = null) {
        await this.ensureLoaded();

        this.data.set(key, value);

        if (ttl && ttl > 0) {
            this.expirationTimes.set(key, Date.now() + (ttl * 1000));
        }

        this._scheduleSave();
        return true;
    }

    async delete(key) {
        await this.ensureLoaded();

        this.data.delete(key);
        this.expirationTimes.delete(key);

        this._scheduleSave();
        return true;
    }

    async list(prefix) {
        await this.ensureLoaded();

        const keys = [];
        for (const [key] of this.data.keys()) {
            if (key.startsWith(prefix)) {
                if (this.expirationTimes.has(key)) {
                    const expirationTime = this.expirationTimes.get(key);
                    if (Date.now() > expirationTime) {
                        this.data.delete(key);
                        this.expirationTimes.delete(key);
                        continue;
                    }
                }
                keys.push(key);
            }
        }
        return keys;
    }

    async exists(key) {
        await this.ensureLoaded();

        const value = this.data.get(key);

        if (this.expirationTimes.has(key)) {
            const expirationTime = this.expirationTimes.get(key);
            if (Date.now() > expirationTime) {
                this.data.delete(key);
                this.expirationTimes.delete(key);
                return false;
            }
        }

        return value !== undefined;
    }

    async increment(key, amount = 1) {
        const current = await this.get(key, 0);
        const newValue = current + amount;
        await this.set(key, newValue);
        return newValue;
    }

    async decrement(key, amount = 1) {
        const current = await this.get(key, 0);
        const newValue = current - amount;
        await this.set(key, newValue);
        return newValue;
    }

    async clear() {
        this.data.clear();
        this.expirationTimes.clear();

        this._scheduleSave();
        return true;
    }
}

export { MemoryStorage };
