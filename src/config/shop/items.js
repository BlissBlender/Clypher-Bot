/**
 * Rarity definitions and helpers.
 */
export const RARITIES = {
    common:    { name: 'Common',    emoji: '⬜', color: '#95A5A6', multiplier: 1.0 },
    uncommon:  { name: 'Uncommon',  emoji: '🟩', color: '#2ECC71', multiplier: 1.5 },
    rare:      { name: 'Rare',      emoji: '🟦', color: '#3498DB', multiplier: 2.5 },
    epic:      { name: 'Epic',      emoji: '🟣', color: '#9B59B6', multiplier: 4.0 },
    legendary: { name: 'Legendary', emoji: '🟡', color: '#F1C40F', multiplier: 7.0 },
};

export function getRarityEmoji(rarity) {
    return RARITIES[rarity]?.emoji || '⬜';
}

export function getRarityColor(rarity) {
    return RARITIES[rarity]?.color || '#95A5A6';
}

export function formatRarity(rarity) {
    const r = RARITIES[rarity];
    return r ? `${r.emoji} **${r.name}**` : '⬜ Common';
}

/**
 * Item categories.
 */
export const ITEM_CATEGORIES = {
    consumable:  { name: 'Consumable',  emoji: '🍯' },
    collectible: { name: 'Collectible', emoji: '💎' },
    booster:     { name: 'Booster',     emoji: '⚡' },
    tool:        { name: 'Tool',        emoji: '⛏️' },
    upgrade:     { name: 'Upgrade',     emoji: '🔧' },
    special:     { name: 'Special',     emoji: '🌟' },
    role:        { name: 'Role',        emoji: '🎭' },
};

export function getCategoryEmoji(type) {
    return ITEM_CATEGORIES[type]?.emoji || '📦';
}

/**
 * Shop items with rarity system added.
 */
export const shopItems = [
    {
        id: 'extra_work',
        name: 'Extra Work Shift',
        price: 5000,
        description: 'Allows 1 extra use of the `/work` command.',
        type: 'consumable',
        category: 'consumable',
        rarity: 'uncommon',
        maxQuantity: 5,
        cooldown: 86400000,
        effect: {
            type: 'command_boost',
            command: 'work',
            uses: 1
        }
    },
    {
        id: 'bank_upgrade_1',
        name: 'Bank Upgrade I',
        price: 15000,
        description: 'Increases bank capacity and allows more funds to be deposited.',
        type: 'upgrade',
        category: 'upgrade',
        rarity: 'rare',
        maxLevel: 5,
        effect: {
            type: 'bank_capacity',
            multiplier: 1.5
        }
    },
    {
        id: 'diamond_pickaxe',
        name: 'Diamond Pickaxe',
        price: 50000,
        description: 'Increases yield from `/mine` by 100%.',
        type: 'tool',
        category: 'tool',
        rarity: 'epic',
        durability: 100,
        effect: {
            type: 'mining_yield',
            multiplier: 2.0
        }
    },
    {
        id: 'premium_role',
        name: 'Premium Server Role',
        price: 15000,
        description: 'A special role granting a fancy color and a 10% daily bonus.',
        type: 'role',
        category: 'role',
        rarity: 'rare',
        roleId: null,
        effect: {
            type: 'daily_bonus',
            multiplier: 1.1
        }
    },
    {
        id: 'lucky_clover',
        name: 'Lucky Clover',
        price: 10000,
        description: 'Increases the chance of winning a higher payout on `/gamble` once.',
        type: 'consumable',
        category: 'booster',
        rarity: 'uncommon',
        maxQuantity: 10,
        effect: {
            type: 'gamble_boost',
            multiplier: 1.5,
            uses: 1
        }
    },
    {
        id: 'fishing_rod',
        name: '🎣 Fishing Rod',
        price: 5000,
        description: 'Used for fishing commands',
        type: 'tool',
        category: 'tool',
        rarity: 'common',
        durability: 100,
        effect: {
            type: 'fishing_yield',
            multiplier: 1.0
        }
    },
    {
        id: 'pickaxe',
        name: '⛏️ Pickaxe',
        price: 7500,
        description: 'Used for mining commands',
        type: 'tool',
        category: 'tool',
        rarity: 'common',
        durability: 100,
        effect: {
            type: 'mining_yield',
            multiplier: 1.2
        }
    },
    {
        id: 'laptop',
        name: '💻 Laptop',
        price: 15000,
        description: 'Increases work earnings by 50%',
        type: 'tool',
        category: 'tool',
        rarity: 'uncommon',
        durability: 200,
        effect: {
            type: 'work_yield',
            multiplier: 1.5
        }
    },
    {
        id: 'lucky_charm',
        name: '🍀 Lucky Charm',
        price: 10000,
        description: 'Increases luck for gambling. Has 3 uses before being consumed.',
        type: 'consumable',
        category: 'booster',
        rarity: 'rare',
        maxQuantity: 10,
        effect: {
            type: 'gamble_boost',
            multiplier: 1.3,
            uses: 3
        }
    },
    {
        id: 'bank_note',
        name: '📜 Bank Note',
        price: 25000,
        description: 'Increases bank capacity by 10,000. Can be purchased multiple times.',
        type: 'tool',
        category: 'upgrade',
        rarity: 'uncommon',
        durability: null,
        effect: {
            type: 'bank_capacity',
            increase: 10000
        }
    },
    {
        id: 'personal_safe',
        name: '🔒 Personal Safe',
        price: 30000,
        description: 'Protects your money from theft. Prevents others from robbing you.',
        type: 'tool',
        category: 'special',
        rarity: 'rare',
        durability: null,
        effect: {
            type: 'robbery_protection',
            protection: true
        }
    },
    {
        id: 'hunting_rifle',
        name: '🔫 Hunting Rifle',
        price: 12000,
        description: 'Required for `/hunt` — hunt animals for profit!',
        type: 'tool',
        category: 'tool',
        rarity: 'common',
        durability: 50,
        effect: {
            type: 'hunting_yield',
            multiplier: 1.0
        }
    },
    {
        id: 'cooking_pan',
        name: '🍳 Cooking Pan',
        price: 8000,
        description: 'Unlocks the ability to cook meals with `/cook` — turn fish into gourmet dishes!',
        type: 'tool',
        category: 'tool',
        rarity: 'common',
        durability: null,
        effect: {
            type: 'cooking_unlock',
            unlocked: true
        }
    },
    {
        id: 'ammo_pack',
        name: '📦 Ammo Pack',
        price: 3000,
        description: 'Replenishes your hunting supplies. Allows 3 extra uses of `/hunt`.',
        type: 'consumable',
        category: 'consumable',
        rarity: 'common',
        maxQuantity: 20,
        effect: {
            type: 'command_boost',
            command: 'hunt',
            uses: 3
        }
    },
    {
        id: 'chef_apron',
        name: '👨‍🍳 Chef Apron',
        price: 15000,
        description: 'Doubles the sell value of all meals cooked with `/cook`!',
        type: 'tool',
        category: 'tool',
        rarity: 'uncommon',
        durability: null,
        effect: {
            type: 'cooking_yield',
            multiplier: 2.0
        }
    },
    // ── New items ──
    {
        id: 'golden_coin',
        name: 'Golden Coin',
        price: 100000,
        description: 'A rare golden coin that serves as a status symbol. A true collector\'s item.',
        type: 'tool',
        category: 'collectible',
        rarity: 'rare',
        durability: null,
        effect: { type: 'collectible', value: 0 }
    },
    {
        id: 'ancient_relic',
        name: 'Ancient Relic',
        price: 250000,
        description: 'An ancient artifact from a forgotten civilization. Extremely rare and valuable.',
        type: 'tool',
        category: 'collectible',
        rarity: 'epic',
        durability: null,
        effect: { type: 'collectible', value: 0 }
    },
    {
        id: 'diamond_ring',
        name: 'Diamond Ring',
        price: 500000,
        description: 'A stunning diamond ring. The ultimate status symbol.',
        type: 'tool',
        category: 'collectible',
        rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', value: 0 }
    },
    {
        id: 'insurance_policy',
        name: '📄 Insurance Policy',
        price: 50000,
        description: 'Protects your cash from being stolen in robberies. One-time use protection.',
        type: 'consumable',
        category: 'special',
        rarity: 'uncommon',
        maxQuantity: 3,
        effect: { type: 'robbery_protection', protection: true }
    },
    {
        id: 'treasure_map',
        name: '🗺️ Treasure Map',
        price: 20000,
        description: 'Use it to discover a random treasure worth between 5,000-50,000 coins!',
        type: 'consumable',
        category: 'special',
        rarity: 'uncommon',
        maxQuantity: 5,
        effect: { type: 'treasure_hunt', min: 5000, max: 50000 }
    },
    {
        id: 'xp_booster',
        name: '⚡ XP Booster',
        price: 10000,
        description: 'Doubles all earnings from your next 3 economy actions.',
        type: 'consumable',
        category: 'booster',
        rarity: 'uncommon',
        maxQuantity: 10,
        effect: { type: 'earnings_boost', multiplier: 2.0, uses: 3 }
    },
    {
        id: 'guard_dog',
        name: '🐕 Guard Dog',
        price: 45000,
        description: 'A trained guard dog that protects your wallet from thieves.',
        type: 'tool',
        category: 'special',
        rarity: 'rare',
        durability: null,
        effect: { type: 'robbery_protection', protection: true }
    },
    {
        id: 'mystery_box',
        name: '🎁 Mystery Box',
        price: 35000,
        description: 'Contains a random item! Could be common junk or a legendary treasure!',
        type: 'consumable',
        category: 'special',
        rarity: 'rare',
        maxQuantity: 5,
        effect: { type: 'mystery_box', possibleRarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'] }
    },
];

export function getItemById(itemId) {
    return shopItems.find(item => item.id === itemId);
}

export function getItemsByType(type) {
    return shopItems.filter(item => item.type === type);
}

export function getItemPrice(itemId) {
    const item = getItemById(itemId);
    return item ? item.price : 0;
}

export function validatePurchase(itemId, userData) {
    const item = getItemById(itemId);
    if (!item) {
        return { valid: false, reason: 'Item not found' };
    }

    const inventory = userData.inventory || {};
    const upgrades = userData.upgrades || {};

    if (item.type === 'consumable' && item.maxQuantity) {
        const currentQuantity = inventory[itemId] || 0;
        if (currentQuantity >= item.maxQuantity) {
            return { 
                valid: false, 
                reason: `You can only have a maximum of ${item.maxQuantity} ${item.name}s` 
            };
        }
    }

    if (item.type === 'upgrade' && item.maxLevel) {
        if (upgrades[itemId]) {
            return { 
                valid: false, 
                reason: `You've already purchased ${item.name}` 
            };
        }
    }

    if (item.type === 'tool') {
        const currentQuantity = inventory[itemId] || 0;
        if (itemId !== 'bank_note' && currentQuantity > 0) {
            return { 
                valid: false, 
                reason: `You already have a ${item.name}` 
            };
        }
    }

    if (item.type === 'role' && item.roleId) {
        if (userData.roles?.includes(item.roleId)) {
            return { 
                valid: false, 
                reason: `You already have the ${item.name} role` 
            };
        }
    }

    return { valid: true };
}
