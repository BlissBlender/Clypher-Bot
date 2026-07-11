/**
 * ═══════════════════════════════════════════════════════════════
 *  CLYPHER ECONOMY — SHOP CATALOG
 *  Rarity definitions, categories, and all purchasable items.
 * ═══════════════════════════════════════════════════════════════
 */

/** ── Rarity System ──────────────────────────────────────── */

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

/** ── Item Categories ─────────────────────────────────────── */

export const ITEM_CATEGORIES = {
    tool:        { name: '🛠 Tools',        emoji: '🛠️', sort: 1 },
    booster:     { name: '🍀 Boosters',     emoji: '🍀', sort: 2 },
    protection:  { name: '🛡 Protection',   emoji: '🛡️', sort: 3 },
    mystery:     { name: '🎁 Mystery',      emoji: '🎁', sort: 4 },
    pet:         { name: '🐾 Pets',         emoji: '🐾', sort: 5 },
    collectible: { name: '💎 Collectibles', emoji: '💎', sort: 6 },
    upgrade:     { name: '🏦 Upgrades',     emoji: '🏦', sort: 7 },
    luxury:      { name: '👑 Luxury',       emoji: '👑', sort: 8 },
    fun:         { name: '😂 Fun',          emoji: '😂', sort: 9 },
    role:        { name: '🎭 Role',         emoji: '🎭', sort: 10 },
};

export function getCategoryEmoji(category) {
    return ITEM_CATEGORIES[category]?.emoji || '📦';
}

/** ── Shop Items (53 total) ───────────────────────────────── */

export const shopItems = [

    // ══════════════════════════════════════════════════════════
    //  🛠️ TOOLS / EQUIPMENT
    // ══════════════════════════════════════════════════════════

    {
        id: 'pickaxe',
        name: '⛏️ Pickaxe',
        price: 7_500,
        description: 'Increases mining rewards by 20%. A basic tool for any aspiring miner.',
        type: 'tool', category: 'tool', rarity: 'common',
        durability: 100,
        effect: { type: 'mining_yield', multiplier: 1.2 },
    },
    {
        id: 'gold_pickaxe',
        name: '🪙 Gold Pickaxe',
        price: 100_000,
        description: 'Increases mining rewards by 75% and has a chance to find rare minerals.',
        type: 'tool', category: 'tool', rarity: 'rare',
        durability: 200,
        effect: { type: 'mining_yield', multiplier: 1.75, rareFind: true },
    },
    {
        id: 'crystal_drill',
        name: '💎 Crystal Drill',
        price: 500_000,
        description: 'Advanced mining equipment. Doubles mining rewards with increased rare drop chances.',
        type: 'tool', category: 'tool', rarity: 'epic',
        durability: 300,
        effect: { type: 'mining_yield', multiplier: 2.5, rareFind: true, rareChance: 0.15 },
    },
    {
        id: 'diamond_pickaxe',
        name: '💎 Diamond Pickaxe',
        price: 50_000,
        description: 'Increases yield from `/mine` by 100%.',
        type: 'tool', category: 'tool', rarity: 'epic',
        durability: 100,
        effect: { type: 'mining_yield', multiplier: 2.0 },
    },
    {
        id: 'fishing_rod',
        name: '🎣 Fishing Rod',
        price: 5_000,
        description: 'The standard tool for fishing. Unlocks the ability to fish.',
        type: 'tool', category: 'tool', rarity: 'common',
        durability: 100,
        effect: { type: 'fishing_yield', multiplier: 1.0 },
    },
    {
        id: 'quantum_rod',
        name: '🎣 Quantum Fishing Rod',
        price: 250_000,
        description: 'A futuristic fishing device capable of catching rare and exotic sea creatures.',
        type: 'tool', category: 'tool', rarity: 'epic',
        durability: 250,
        effect: { type: 'fishing_yield', multiplier: 2.5, rareCatch: true },
    },
    {
        id: 'laptop',
        name: '💻 Laptop',
        price: 15_000,
        description: 'Increases work earnings by 50%. Perfect for the digital freelancer.',
        type: 'tool', category: 'tool', rarity: 'uncommon',
        durability: 200,
        effect: { type: 'work_yield', multiplier: 1.5 },
    },
    {
        id: 'hunting_rifle',
        name: '🔫 Hunting Rifle',
        price: 12_000,
        description: 'Required for `/hunt` — hunt animals for profit!',
        type: 'tool', category: 'tool', rarity: 'common',
        durability: 50,
        effect: { type: 'hunting_yield', multiplier: 1.0 },
    },
    {
        id: 'cooking_pan',
        name: '🍳 Cooking Pan',
        price: 8_000,
        description: 'Unlocks the ability to cook meals with `/cook` — turn fish into gourmet dishes!',
        type: 'tool', category: 'tool', rarity: 'common',
        durability: null,
        effect: { type: 'cooking_unlock', unlocked: true },
    },
    {
        id: 'chef_apron',
        name: '👨‍🍳 Chef Apron',
        price: 15_000,
        description: 'Doubles the sell value of all meals cooked with `/cook`!',
        type: 'tool', category: 'tool', rarity: 'uncommon',
        durability: null,
        effect: { type: 'cooking_yield', multiplier: 2.0 },
    },
    {
        id: 'treasure_magnet',
        name: '🧲 Treasure Magnet',
        price: 75_000,
        description: 'Increases chances of finding treasure while exploring and using economy commands.',
        type: 'tool', category: 'tool', rarity: 'rare',
        durability: 150,
        effect: { type: 'treasure_boost', multiplier: 1.5 },
    },

    // ══════════════════════════════════════════════════════════
    //  🍀 LUCK / GAMBLING ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'lucky_clover',
        name: '🍀 Lucky Clover',
        price: 10_000,
        description: 'Increases gambling win chance by 10% for one bet. A gambler\'s best friend.',
        type: 'consumable', category: 'booster', rarity: 'uncommon',
        maxQuantity: 10,
        effect: { type: 'gamble_boost', multiplier: 1.5, uses: 1 },
    },
    {
        id: 'four_leaf_clover',
        name: '🍀 Four Leaf Clover',
        price: 50_000,
        description: 'Greatly increases luck for one gamble. Much more potent than a regular clover.',
        type: 'consumable', category: 'booster', rarity: 'rare',
        maxQuantity: 5,
        effect: { type: 'gamble_boost', multiplier: 2.5, uses: 1 },
    },
    {
        id: 'lucky_charm',
        name: '🍀 Lucky Charm',
        price: 10_000,
        description: 'Increases gambling luck. Has 3 uses before being consumed.',
        type: 'consumable', category: 'booster', rarity: 'rare',
        maxQuantity: 10,
        effect: { type: 'gamble_boost', multiplier: 1.3, uses: 3 },
    },
    {
        id: 'loaded_dice',
        name: '🎲 Loaded Dice',
        price: 100_000,
        description: 'Gives a significantly better chance of winning gambling games. Triple-use item.',
        type: 'consumable', category: 'booster', rarity: 'epic',
        maxQuantity: 3,
        effect: { type: 'gamble_boost', multiplier: 3.0, uses: 3 },
    },
    {
        id: 'fortune_crystal',
        name: '🔮 Fortune Crystal',
        price: 250_000,
        description: 'A mysterious crystal that improves all luck-based activities for 5 uses.',
        type: 'consumable', category: 'booster', rarity: 'epic',
        maxQuantity: 2,
        effect: { type: 'gamble_boost', multiplier: 4.0, uses: 5 },
    },
    {
        id: 'joker_card',
        name: '🃏 Joker Card',
        price: 150_000,
        description: 'A wildcard item that saves you from one bad gamble — keeps your bet if you lose.',
        type: 'consumable', category: 'booster', rarity: 'epic',
        maxQuantity: 3,
        effect: { type: 'gamble_save', savePercent: 1.0, uses: 1 },
    },

    // ══════════════════════════════════════════════════════════
    //  🏦 WEALTH / BANKING ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'bank_upgrade_1',
        name: '🏦 Bank Upgrade I',
        price: 15_000,
        description: 'Increases bank capacity by 50% and allows more funds to be deposited.',
        type: 'upgrade', category: 'upgrade', rarity: 'rare',
        maxLevel: 5,
        effect: { type: 'bank_capacity', multiplier: 1.5 },
    },
    {
        id: 'bank_note',
        name: '📜 Bank Note',
        price: 25_000,
        description: 'Permanently increases bank capacity by 10,000. Can be purchased multiple times.',
        type: 'tool', category: 'upgrade', rarity: 'uncommon',
        durability: null,
        effect: { type: 'bank_capacity', increase: 10000 },
    },
    {
        id: 'gold_bank_card',
        name: '💳 Gold Bank Card',
        price: 200_000,
        description: 'Increases bank interest rewards. Your bank generates passive income over time.',
        type: 'upgrade', category: 'upgrade', rarity: 'rare',
        effect: { type: 'bank_interest', interestRate: 0.02 },
    },
    {
        id: 'vault_expansion',
        name: '🔐 Vault Expansion',
        price: 500_000,
        description: 'Permanently doubles your maximum bank storage capacity. The wealthy\'s choice.',
        type: 'upgrade', category: 'upgrade', rarity: 'epic',
        effect: { type: 'bank_capacity', multiplier: 2.0 },
    },
    {
        id: 'investment_license',
        name: '📈 Investment License',
        price: 250_000,
        description: 'Unlocks advanced investment opportunities. Higher risk, higher reward.',
        type: 'upgrade', category: 'upgrade', rarity: 'epic',
        effect: { type: 'investment', unlock: true },
    },
    {
        id: 'platinum_account',
        name: '💳 Platinum Account',
        price: 1_000_000,
        description: 'Premium banking account with exclusive benefits — 5% daily bonus on all earnings.',
        type: 'upgrade', category: 'upgrade', rarity: 'legendary',
        effect: { type: 'daily_bonus', multiplier: 1.05 },
    },

    // ══════════════════════════════════════════════════════════
    //  🛡️ PROTECTION ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'personal_safe',
        name: '🔒 Personal Safe',
        price: 30_000,
        description: 'Protects your money from theft. Prevents others from robbing you.',
        type: 'tool', category: 'protection', rarity: 'rare',
        durability: null,
        effect: { type: 'robbery_protection', protection: true },
    },
    {
        id: 'robbery_shield',
        name: '🛡️ Anti-Robbery Shield',
        price: 75_000,
        description: 'Advanced protection that blocks all robbery attempts against you.',
        type: 'tool', category: 'protection', rarity: 'rare',
        durability: null,
        effect: { type: 'robbery_protection', protection: true, strength: 'high' },
    },
    {
        id: 'insurance_policy',
        name: '📄 Insurance Policy',
        price: 50_000,
        description: 'Protects your cash from being stolen in robberies. One-time use protection.',
        type: 'consumable', category: 'protection', rarity: 'uncommon',
        maxQuantity: 3,
        effect: { type: 'robbery_protection', protection: true, oneTime: true },
    },
    {
        id: 'security_token',
        name: '🧿 Security Token',
        price: 150_000,
        description: 'An advanced one-time device that blocks a robbery and alerts authorities (fines the robber extra).',
        type: 'consumable', category: 'protection', rarity: 'epic',
        maxQuantity: 3,
        effect: { type: 'robbery_protection', protection: true, oneTime: true, counterStrike: true },
    },
    {
        id: 'guard_dog',
        name: '🐕 Guard Dog',
        price: 45_000,
        description: 'A trained guard dog that protects your wallet from thieves and scares off attackers.',
        type: 'tool', category: 'protection', rarity: 'rare',
        durability: null,
        effect: { type: 'robbery_protection', protection: true },
    },
    {
        id: 'fortress_upgrade',
        name: '🏰 Fortress Upgrade',
        price: 2_000_000,
        description: 'Provides maximum protection against all forms of attacks. You are virtually untouchable.',
        type: 'upgrade', category: 'protection', rarity: 'legendary',
        effect: { type: 'robbery_protection', protection: true, strength: 'maximum' },
    },

    // ══════════════════════════════════════════════════════════
    //  ⚔️ CRIME / RISK ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'disguise_kit',
        name: '🥷 Disguise Kit',
        price: 30_000,
        description: 'Improves success rate during risky activities. A must-have for any career criminal.',
        type: 'tool', category: 'tool', rarity: 'uncommon',
        durability: 50,
        effect: { type: 'crime_boost', successChance: 0.1 },
    },
    {
        id: 'hacking_device',
        name: '💻 Hacking Device',
        price: 250_000,
        description: 'Allows advanced cyber missions with higher payouts but higher risk.',
        type: 'tool', category: 'tool', rarity: 'epic',
        durability: 100,
        effect: { type: 'crime_boost', successChance: 0.2, payoutMultiplier: 2.0 },
    },
    {
        id: 'shadow_access',
        name: '🕶️ Shadow Network Access',
        price: 1_000_000,
        description: 'Grants access to exclusive high-risk missions with enormous potential rewards.',
        type: 'tool', category: 'tool', rarity: 'legendary',
        durability: 50,
        effect: { type: 'crime_boost', successChance: 0.3, payoutMultiplier: 3.0 },
    },

    // ══════════════════════════════════════════════════════════
    //  🎁 MYSTERY / COLLECTIBLES
    // ══════════════════════════════════════════════════════════

    {
        id: 'mystery_box',
        name: '🎁 Mystery Box',
        price: 25_000,
        description: 'Contains a random item! Could be common junk or a legendary treasure!',
        type: 'consumable', category: 'mystery', rarity: 'rare',
        maxQuantity: 5,
        effect: { type: 'mystery_box', possibleRarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
    },
    {
        id: 'premium_box',
        name: '🎁 Premium Mystery Box',
        price: 250_000,
        description: 'A high-end mystery box with guaranteed rare+ items. For serious collectors only.',
        type: 'consumable', category: 'mystery', rarity: 'epic',
        maxQuantity: 3,
        effect: { type: 'mystery_box', possibleRarities: ['rare', 'epic', 'legendary'], guaranteedRarity: 'rare' },
    },
    {
        id: 'treasure_map',
        name: '🗺️ Treasure Map',
        price: 20_000,
        description: 'Use it to discover a random treasure worth between 5,000–50,000 coins!',
        type: 'consumable', category: 'mystery', rarity: 'uncommon',
        maxQuantity: 5,
        effect: { type: 'treasure_hunt', min: 5000, max: 50000 },
    },
    {
        id: 'golden_coin',
        name: '🪙 Golden Coin',
        price: 100_000,
        description: 'A rare golden coin that serves as a status symbol. A true collector\'s item.',
        type: 'tool', category: 'collectible', rarity: 'rare',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🪙' },
    },
    {
        id: 'ancient_key',
        name: '🗝️ Ancient Key',
        price: 100_000,
        description: 'A mysterious key of unknown origin and purpose. Collectors whisper about its value.',
        type: 'tool', category: 'collectible', rarity: 'rare',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🗝️' },
    },
    {
        id: 'ancient_relic',
        name: '🏺 Ancient Relic',
        price: 250_000,
        description: 'An artifact from a forgotten civilization. Extremely rare historically significant.',
        type: 'tool', category: 'collectible', rarity: 'epic',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🏺' },
    },
    {
        id: 'golden_trophy',
        name: '👑 Golden Trophy',
        price: 500_000,
        description: 'A prestigious golden trophy awarded to those who have achieved great wealth.',
        type: 'tool', category: 'collectible', rarity: 'epic',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '👑' },
    },
    {
        id: 'diamond_ring',
        name: '💍 Diamond Ring',
        price: 500_000,
        description: 'A stunning diamond ring. The ultimate status symbol among the elite.',
        type: 'tool', category: 'collectible', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '💍' },
    },

    // ══════════════════════════════════════════════════════════
    //  🐾 PET ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'pet_food',
        name: '🥩 Pet Food',
        price: 5_000,
        description: 'High-quality food for your pet. Feeds your pet and increases happiness.',
        type: 'consumable', category: 'pet', rarity: 'common',
        maxQuantity: 50,
        effect: { type: 'pet_food', xpGain: 15 },
    },
    {
        id: 'pet_toy',
        name: '🧸 Pet Toy',
        price: 15_000,
        description: 'A fun toy for your pet that improves experience gain by 50% on next training.',
        type: 'consumable', category: 'pet', rarity: 'uncommon',
        maxQuantity: 20,
        effect: { type: 'pet_toy', xpMultiplier: 1.5 },
    },
    {
        id: 'pet_house',
        name: '🏠 Pet House',
        price: 100_000,
        description: 'Gives your pet a comfortable home. Increases passive XP gain for all your pets.',
        type: 'upgrade', category: 'pet', rarity: 'rare',
        effect: { type: 'pet_upgrade', passiveXpPerHour: 5 },
    },

    // ══════════════════════════════════════════════════════════
    //  ⚡ TEMPORARY BOOSTERS
    // ══════════════════════════════════════════════════════════

    {
        id: 'extra_work',
        name: '📋 Extra Work Shift',
        price: 5_000,
        description: 'Allows 1 extra use of the `/work` command. Perfect for when you need quick cash.',
        type: 'consumable', category: 'booster', rarity: 'uncommon',
        maxQuantity: 5,
        cooldown: 86400000,
        effect: { type: 'command_boost', command: 'work', uses: 1 },
    },
    {
        id: 'energy_drink',
        name: '⚡ Energy Drink',
        price: 10_000,
        description: 'Gives you a burst of energy for one extra work shift. Quick and effective.',
        type: 'consumable', category: 'booster', rarity: 'uncommon',
        maxQuantity: 10,
        effect: { type: 'command_boost', command: 'work', uses: 1 },
    },
    {
        id: 'productivity_booster',
        name: '🚀 Productivity Booster',
        price: 50_000,
        description: 'Doubles work rewards for your next 5 work sessions. Maximum productivity!',
        type: 'consumable', category: 'booster', rarity: 'rare',
        maxQuantity: 3,
        effect: { type: 'earnings_boost', source: 'work', multiplier: 2.0, uses: 5 },
    },
    {
        id: 'wealth_potion',
        name: '💰 Wealth Potion',
        price: 100_000,
        description: 'A magical potion that increases all earnings by 50% for your next 10 actions.',
        type: 'consumable', category: 'booster', rarity: 'epic',
        maxQuantity: 2,
        effect: { type: 'earnings_boost', source: 'all', multiplier: 1.5, uses: 10 },
    },
    {
        id: 'xp_booster',
        name: '⚡ XP Booster',
        price: 10_000,
        description: 'Doubles all earnings from your next 3 economy actions. Quick and effective.',
        type: 'consumable', category: 'booster', rarity: 'uncommon',
        maxQuantity: 10,
        effect: { type: 'earnings_boost', source: 'all', multiplier: 2.0, uses: 3 },
    },
    {
        id: 'ammo_pack',
        name: '📦 Ammo Pack',
        price: 3_000,
        description: 'Replenishes your hunting supplies. Allows 3 extra uses of `/hunt`.',
        type: 'consumable', category: 'booster', rarity: 'common',
        maxQuantity: 20,
        effect: { type: 'command_boost', command: 'hunt', uses: 3 },
    },
    {
        id: 'repair_kit',
        name: '🧰 Repair Kit',
        price: 20_000,
        description: 'Repairs damaged tools and restores durability. Essential for maintaining equipment.',
        type: 'consumable', category: 'tool', rarity: 'uncommon',
        maxQuantity: 5,
        effect: { type: 'repair', repairAmount: 50 },
    },

    // ══════════════════════════════════════════════════════════
    //  😂 FUN / MEME ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'toilet_paper',
        name: '🧻 Toilet Paper Roll',
        price: 100,
        description: 'Completely useless but hey, everyone needs it eventually. A true economic essential.',
        type: 'tool', category: 'fun', rarity: 'common',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🧻' },
    },
    {
        id: 'strange_rock',
        name: '🪨 Strange Rock',
        price: 5_000,
        description: 'Nobody knows why this exists or what it does. It just sits there. Menacingly.',
        type: 'tool', category: 'fun', rarity: 'common',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🪨' },
    },
    {
        id: 'golden_frog',
        name: '🐸 Golden Frog',
        price: 750_000,
        description: 'A rare golden frog said to bring good luck to its owner. Ribbit in style.',
        type: 'tool', category: 'fun', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🐸' },
    },
    {
        id: 'legendary_sock',
        name: '🧦 Legendary Sock',
        price: 1_000_000,
        description: 'A legendary item of questionable value. It\'s just a sock. But it\'s YOUR sock.',
        type: 'tool', category: 'fun', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🧦' },
    },

    // ══════════════════════════════════════════════════════════
    //  👑 ENDGAME ITEMS (Money Sinks)
    // ══════════════════════════════════════════════════════════

    {
        id: 'empire_license',
        name: '🏛️ Empire License',
        price: 10_000_000,
        description: 'Official proof that you have entered the elite economy tier. A badge of ultimate wealth.',
        type: 'tool', category: 'luxury', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🏛️' },
    },
    {
        id: 'diamond_statue',
        name: '💎 Diamond Statue',
        price: 50_000_000,
        description: 'A life-sized diamond statue. The ultimate luxury collectible owned only by the richest.',
        type: 'tool', category: 'luxury', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '💎' },
    },
    {
        id: 'quantum_core',
        name: '🌌 Quantum Core',
        price: 100_000_000,
        description: 'The rarest technological artifact in existence. Only one person can own this at a time.',
        type: 'tool', category: 'luxury', rarity: 'legendary',
        durability: null,
        effect: { type: 'collectible', displayEmoji: '🌌' },
    },

    // ══════════════════════════════════════════════════════════
    //  🎭 ROLE ITEMS
    // ══════════════════════════════════════════════════════════

    {
        id: 'premium_role',
        name: '👑 Premium Server Role',
        price: 15_000,
        description: 'A special role granting a fancy color and a 10% daily bonus.',
        type: 'role', category: 'role', rarity: 'rare',
        roleId: null,
        effect: { type: 'daily_bonus', multiplier: 1.1 },
    },
];

/** ── Helper Functions ───────────────────────────────────── */

export function getItemById(itemId) {
    return shopItems.find(item => item.id === itemId);
}

export function getItemsByType(type) {
    return shopItems.filter(item => item.type === type);
}

export function getItemsByCategory(category) {
    return shopItems.filter(item => item.category === category);
}

export function getItemPrice(itemId) {
    const item = getItemById(itemId);
    return item ? item.price : 0;
}

export function getItemsByRarity(rarity) {
    return shopItems.filter(item => item.rarity === rarity);
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
        // Allow multiple purchases for collectibles, fun, and luxury items
        if (itemId !== 'bank_note' && item.category !== 'collectible' && item.category !== 'fun' && item.category !== 'luxury' && currentQuantity > 0) {
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
