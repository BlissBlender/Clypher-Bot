# Changelog

All notable changes to Clypher Bot are documented in this file.

## [2.1.0] — 2026-07-11

### Added
- **53-item shop** across 10 categories with rarity system (Common→Legendary)
- **Interactive Moderation Dashboard** — 7 category pages with inline configurable settings
- **Economy expansion:** Properties (6 types, up to Lv10), Pets (6 types, adopt/feed/train/rename), Achievements (15 across 3 categories), Trading, Marketplace
- **Transaction History** — Track every money movement
- **Economy Events** — 4 event types (Treasure Hunt, Market Boom, Market Crash, Bonus Weekend)
- **Daily streak milestones** — 7, 30, and 100 day rewards
- **Leveling system** — XP per message, configurable cooldowns, role rewards, level-up messages
- **Ignored Words management** for Auto-Mod dashboard (anti-caps configuration)
- **Interactive buttons** on all 7 moderation category pages for direct settings editing

### Fixed
- `console.error()` calls replaced with `logger.error()` throughout the codebase
- Level-up messages no longer appear before the leveling system is configured
- Buy command now properly adds tool-type items to inventory
- Protection items config updated with new item IDs
- Earnings booster uses `Math.max()` to prevent weaker boosters from overwriting stronger ones
- Multiple collectibles/fun/luxury items can now be purchased

### Changed
- 100 total commands across 18 categories
- README completely rewritten with comprehensive feature documentation
- Moderation dashboard overhauled with dynamic setting generation system
- All git history consolidated under a single author

## [2.0.0] — Initial Release

- Discord moderation bot with economy, moderation, music, and utility features
- 93 commands across multiple categories
- PostgreSQL database support
- Lavalink music integration
- Moderation dashboard with basic controls
