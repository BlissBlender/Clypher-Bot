// petService.js
// Pet system with adopt, feed, train, and bonuses.

import { logger } from '../utils/logger.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { BotConfig } from '../config/bot.js';

const PET_CONFIG = BotConfig.economy?.pets || {};
const PET_TYPES = PET_CONFIG.petTypes || {};
const ADOPTION_COST = PET_CONFIG.adoptionCost || 25000;
const FEED_COST = PET_CONFIG.feedCost || 500;
const TRAINING_COST = PET_CONFIG.trainingCost || 2000;
const MAX_XP_PER_FEED = PET_CONFIG.maxXpPerFeed || 25;
const XP_PER_TRAINING = PET_CONFIG.xpPerTraining || 50;
const MAX_LEVEL = PET_CONFIG.maxLevel || 20;
const FEED_COOLDOWN = PET_CONFIG.feedCooldownMs || 3600000;
const TRAIN_COOLDOWN = PET_CONFIG.trainCooldownMs || 7200000;

/**
 * Get available pet types.
 */
export function getPetTypes() {
    return Object.entries(PET_TYPES).map(([id, data]) => ({ id, ...data }));
}

/**
 * Get a pet type by ID.
 */
function getPetType(petId) {
    return PET_TYPES[petId] || null;
}

/**
 * Calculate XP needed for a pet level.
 */
function getXpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Calculate a pet's bonus at its current level.
 */
function getPetBonus(petType, level) {
    const baseBonus = petType.bonus || {};
    const scaled = {};
    for (const [key, value] of Object.entries(baseBonus)) {
        scaled[key] = value * (1 + (level - 1) * 0.1);
    }
    return scaled;
}

/**
 * Adopt a new pet.
 */
export async function adoptPet(client, guildId, userId, petTypeId, name) {
    const petType = getPetType(petTypeId);
    if (!petType) {
        throw createError('Invalid pet type', ErrorTypes.VALIDATION,
            `Pet type \`${petTypeId}\` does not exist. Available: ${getPetTypes().map(p => p.id).join(', ')}`,
            { petTypeId });
    }

    const userData = await getEconomyData(client, guildId, userId);
    const pets = Array.isArray(userData.pets) ? userData.pets : [];

    if (pets.length >= 5) {
        throw createError('Max pets reached', ErrorTypes.VALIDATION,
            'You can only have up to 5 pets at a time.',
            { current: pets.length, max: 5 });
    }

    if ((userData.wallet || 0) < ADOPTION_COST) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `Adopting a pet costs ${ADOPTION_COST.toLocaleString()} coins. You have ${(userData.wallet || 0).toLocaleString()} coins.`,
            { required: ADOPTION_COST, wallet: userData.wallet });
    }

    const pet = {
        id: `pet_${Date.now()}_${userId.slice(-4)}`,
        type: petTypeId,
        name: name || petType.name,
        emoji: petType.emoji || '🐾',
        level: 1,
        xp: 0,
        xpNeeded: getXpForLevel(1),
        bonus: petType.bonus || {},
        fedAt: 0,
        trainedAt: 0,
        adoptedAt: Date.now(),
        totalFed: 0,
        totalTrained: 0,
    };

    userData.wallet = (userData.wallet || 0) - ADOPTION_COST;
    userData.pets = [...pets, pet];

    await setEconomyData(client, guildId, userId, userData);

    const { logTransaction } = await import('./transactionService.js');
    await logTransaction(client, guildId, userId, {
        amount: -ADOPTION_COST, type: 'EXPENSE', source: 'pet_adopt',
        description: `Adopted ${pet.emoji} ${pet.name} (${petType.name})`,
        metadata: { petType: petTypeId, petName: pet.name, petId: pet.id },
    });

    logger.info(`[PET] ${userId} adopted ${pet.name} (${petTypeId})`);
    return { pet, cost: ADOPTION_COST };
}

/**
 * View user's pets.
 */
export async function viewPets(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const pets = Array.isArray(userData.pets) ? userData.pets : [];

    return pets.map(p => {
        const petType = getPetType(p.type);
        const bonus = petType ? getPetBonus(petType, p.level) : {};
        return {
            ...p,
            xpNeeded: getXpForLevel(p.level),
            currentBonus: bonus,
            canFeed: Date.now() - (p.fedAt || 0) >= FEED_COOLDOWN,
            canTrain: Date.now() - (p.trainedAt || 0) >= TRAIN_COOLDOWN,
        };
    });
}

/**
 * Feed a pet to give XP.
 */
export async function feedPet(client, guildId, userId, petId) {
    const userData = await getEconomyData(client, guildId, userId);
    const pets = Array.isArray(userData.pets) ? userData.pets : [];
    const index = pets.findIndex(p => p.id === petId);

    if (index === -1) {
        throw createError('Pet not found', ErrorTypes.VALIDATION,
            'You don\'t have a pet with that ID.',
            { petId });
    }

    const pet = pets[index];

    if (Date.now() - (pet.fedAt || 0) < FEED_COOLDOWN) {
        const remaining = FEED_COOLDOWN - (Date.now() - (pet.fedAt || 0));
        throw createError('Feeding cooldown', ErrorTypes.RATE_LIMIT,
            `Your pet was fed recently. Wait **${Math.ceil(remaining / 60000)}** minutes before feeding again.`,
            { remaining, petId });
    }

    if ((userData.wallet || 0) < FEED_COST) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `Feeding costs ${FEED_COST.toLocaleString()} coins.`,
            { required: FEED_COST, wallet: userData.wallet });
    }

    userData.wallet = (userData.wallet || 0) - FEED_COST;
    const xpGained = Math.floor(Math.random() * MAX_XP_PER_FEED) + 5;
    pet.xp = (pet.xp || 0) + xpGained;
    pet.fedAt = Date.now();
    pet.totalFed = (pet.totalFed || 0) + 1;

    // Check level up
    let leveledUp = false;
    const xpNeeded = getXpForLevel(pet.level);
    while (pet.xp >= xpNeeded && pet.level < MAX_LEVEL) {
        pet.xp -= xpNeeded;
        pet.level += 1;
        leveledUp = true;
    }

    // Update bonus
    const petType = getPetType(pet.type);
    if (petType) {
        pet.bonus = getPetBonus(petType, pet.level);
    }

    pets[index] = pet;
    userData.pets = pets;
    await setEconomyData(client, guildId, userId, userData);

    return { pet, xpGained, leveledUp, cost: FEED_COST };
}

/**
 * Train a pet for more XP.
 */
export async function trainPet(client, guildId, userId, petId) {
    const userData = await getEconomyData(client, guildId, userId);
    const pets = Array.isArray(userData.pets) ? userData.pets : [];
    const index = pets.findIndex(p => p.id === petId);

    if (index === -1) {
        throw createError('Pet not found', ErrorTypes.VALIDATION,
            'You don\'t have a pet with that ID.',
            { petId });
    }

    const pet = pets[index];

    if (Date.now() - (pet.trainedAt || 0) < TRAIN_COOLDOWN) {
        const remaining = TRAIN_COOLDOWN - (Date.now() - (pet.trainedAt || 0));
        throw createError('Training cooldown', ErrorTypes.RATE_LIMIT,
            `Your pet is tired from training. Wait **${Math.ceil(remaining / 60000)}** minutes.`,
            { remaining, petId });
    }

    if ((userData.wallet || 0) < TRAINING_COST) {
        throw createError('Insufficient funds', ErrorTypes.VALIDATION,
            `Training costs ${TRAINING_COST.toLocaleString()} coins.`,
            { required: TRAINING_COST, wallet: userData.wallet });
    }

    userData.wallet = (userData.wallet || 0) - TRAINING_COST;
    pet.xp = (pet.xp || 0) + XP_PER_TRAINING;
    pet.trainedAt = Date.now();
    pet.totalTrained = (pet.totalTrained || 0) + 1;

    // Check level up
    let leveledUp = false;
    const xpNeeded = getXpForLevel(pet.level);
    while (pet.xp >= xpNeeded && pet.level < MAX_LEVEL) {
        pet.xp -= xpNeeded;
        pet.level += 1;
        leveledUp = true;
    }

    // Update bonus
    const petType = getPetType(pet.type);
    if (petType) {
        pet.bonus = getPetBonus(petType, pet.level);
    }

    pets[index] = pet;
    userData.pets = pets;
    await setEconomyData(client, guildId, userId, userData);

    return { pet, xpGained: XP_PER_TRAINING, leveledUp, cost: TRAINING_COST };
}

/**
 * Calculate total pet bonuses for a user.
 * Returns an object with combined bonuses from all pets.
 */
export async function getPetBonuses(client, guildId, userId) {
    const userData = await getEconomyData(client, guildId, userId);
    const pets = Array.isArray(userData.pets) ? userData.pets : [];
    const combined = {};

    for (const pet of pets) {
        const petType = getPetType(pet.type);
        if (petType) {
            const bonus = getPetBonus(petType, pet.level);
            for (const [key, value] of Object.entries(bonus)) {
                if (key === 'work') {
                    combined.workMultiplier = (combined.workMultiplier || 1) + (value - 1);
                } else if (key === 'gamble') {
                    combined.gambleChance = (combined.gambleChance || 0) + value;
                } else if (key === 'crime') {
                    combined.crimeChance = (combined.crimeChance || 0) + value;
                } else if (key === 'fish') {
                    combined.fishMultiplier = (combined.fishMultiplier || 1) + (value - 1);
                } else if (key === 'mine') {
                    combined.mineMultiplier = (combined.mineMultiplier || 1) + (value - 1);
                }
            }
        }
    }

    return combined;
}
