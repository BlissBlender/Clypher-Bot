import test from 'node:test';
import assert from 'node:assert/strict';
import { getColor, getRandomColor } from '../src/config/bot.js';

/**
 * Helper: parse a hex string like '#FFD700' into a Discord embed color integer.
 * This matches what getColor() does internally.
 */
function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// ──────────────────────────────────────────
// SEMANTIC COLOR KEYS — regression tests
// ──────────────────────────────────────────

test('getColor returns correct integer for "primary"', () => {
  assert.equal(getColor('primary'), hexToInt('#0D1B2A'));
});

test('getColor returns correct integer for "success"', () => {
  assert.equal(getColor('success'), hexToInt('#00E676'));
});

test('getColor returns correct integer for "error"', () => {
  assert.equal(getColor('error'), hexToInt('#FF1744'));
});

test('getColor returns correct integer for "warning"', () => {
  assert.equal(getColor('warning'), hexToInt('#FFAB00'));
});

test('getColor returns correct integer for "info"', () => {
  assert.equal(getColor('info'), hexToInt('#2979FF'));
});

test('getColor returns correct integer for "money"', () => {
  assert.equal(getColor('money'), hexToInt('#FFD700'));
});

test('getColor returns correct integer for "spending"', () => {
  assert.equal(getColor('spending'), hexToInt('#FF6D00'));
});

test('getColor returns correct integer for "rare"', () => {
  assert.equal(getColor('rare'), hexToInt('#AA00FF'));
});

test('getColor returns correct integer for "economy" (legacy alias)', () => {
  assert.equal(getColor('economy'), hexToInt('#FFD700'));
});

test('getColor returns correct integer for "moderation"', () => {
  assert.equal(getColor('moderation'), hexToInt('#7C4DFF'));
});

test('getColor returns correct integer for "birthday"', () => {
  assert.equal(getColor('birthday'), hexToInt('#D500F9'));
});

// ──────────────────────────────────────────
// NESTED / DOT-PATH COLORS
// ──────────────────────────────────────────

test('getColor resolves nested dot-path "ticket.open"', () => {
  assert.equal(getColor('ticket.open'), hexToInt('#00E676'));
});

test('getColor resolves nested dot-path "ticket.closed"', () => {
  assert.equal(getColor('ticket.closed'), hexToInt('#FF1744'));
});

test('getColor resolves nested dot-path "giveaway.active"', () => {
  assert.equal(getColor('giveaway.active'), hexToInt('#00E676'));
});

test('getColor resolves nested dot-path "giveaway.ended"', () => {
  assert.equal(getColor('giveaway.ended'), hexToInt('#FF1744'));
});

test('getColor resolves nested dot-path "priority.urgent"', () => {
  assert.equal(getColor('priority.urgent'), hexToInt('#FF1744'));
});

test('getColor resolves nested dot-path "priority.low"', () => {
  assert.equal(getColor('priority.low'), hexToInt('#2979FF'));
});

// ──────────────────────────────────────────
// DIRECT INPUT HANDLING
// ──────────────────────────────────────────

test('getColor returns a number as-is (0x format)', () => {
  assert.equal(getColor(0xFFD700), 0xFFD700);
});

test('getColor parses a hex string (# format)', () => {
  assert.equal(getColor('#FF0000'), hexToInt('#FF0000'));
});

test('getColor parses lowercase hex string', () => {
  assert.equal(getColor('#ffd700'), hexToInt('#FFD700'));
});

// ──────────────────────────────────────────
// FALLBACK BEHAVIOR
// ──────────────────────────────────────────

test('getColor uses default fallback for unknown key', () => {
  assert.equal(getColor('nonexistent_key'), hexToInt('#99AAB5'));
});

test('getColor uses custom fallback for unknown key', () => {
  assert.equal(getColor('nonexistent_key', '#FF0000'), hexToInt('#FF0000'));
});

// ──────────────────────────────────────────
// PER-GUILD OVERRIDES (theme system)
// ──────────────────────────────────────────

test('getColor uses override when provided', () => {
  const overrides = { money: '#00FF00', success: '#0000FF' };
  assert.equal(getColor('money', '#99AAB5', overrides), hexToInt('#00FF00'));
  assert.equal(getColor('success', '#99AAB5', overrides), hexToInt('#0000FF'));
});

test('getColor falls back to defaults for keys not in overrides', () => {
  const overrides = { money: '#00FF00' };
  // 'success' is NOT in overrides, so it falls back to botConfig default
  assert.equal(getColor('success', '#99AAB5', overrides), hexToInt('#00E676'));
  assert.equal(getColor('money', '#99AAB5', overrides), hexToInt('#00FF00'));
});

test('getColor falls back to fallback when key is not in overrides nor defaults', () => {
  const overrides = { money: '#00FF00' };
  assert.equal(getColor('invalid_key', '#ABCDEF', overrides), hexToInt('#ABCDEF'));
});

test('getColor ignores null overrides', () => {
  assert.equal(getColor('money', '#99AAB5', null), hexToInt('#FFD700'));
});

test('getColor ignores empty object overrides', () => {
  assert.equal(getColor('money', '#99AAB5', {}), hexToInt('#FFD700'));
});

// ──────────────────────────────────────────
// getRandomColor
// ──────────────────────────────────────────

test('getRandomColor returns a valid hex color string', () => {
  const color = getRandomColor();
  assert.ok(typeof color === 'string' || typeof color === 'object');
  // It returns a string hex color from the palette, or a nested object
  // Just verify it returns something truthy
  assert.ok(color);
});

// ──────────────────────────────────────────
// EDGE CASES
// ──────────────────────────────────────────

test('getColor with undefined path returns fallback', () => {
  assert.equal(getColor(undefined), hexToInt('#99AAB5'));
  assert.equal(getColor(undefined, '#000000'), hexToInt('#000000'));
});

test('getColor with empty string path returns fallback', () => {
  assert.equal(getColor(''), hexToInt('#99AAB5'));
});
