import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmbed } from '../src/utils/embeds.js';

test('createEmbed sets footer text and adds timestamp by default', () => {
  const embed = createEmbed({
    title: 'Test',
    description: 'Hello world',
    footer: 'Custom footer here'
  });

  const data = embed.toJSON();
  assert.equal(data.footer?.text, 'Custom footer here');
  assert.ok(data.timestamp, 'timestamp should be set by default');
  assert.equal(data.description, 'Hello world');
});

test('createEmbed uses branded default footer when no footer is provided', () => {
  const embed = createEmbed({
    title: 'Test',
    description: 'Hello world'
  });

  const data = embed.toJSON();
  assert.equal(data.footer?.text, '✨ Clypher Bot');
  assert.ok(data.timestamp, 'timestamp should be set by default');
  assert.equal(data.description, 'Hello world');
});

test('setFooter allows any footer text to appear on embed', () => {
  const embed = createEmbed({
    title: 'Footer Test',
    description: 'Base description.'
  });

  embed.setFooter({ text: 'Requested by mrpinkify' });
  const data = embed.toJSON();

  assert.equal(data.footer?.text, 'Requested by mrpinkify');
  assert.equal(data.description, 'Base description.');
});

test('setFooter works alongside fields', () => {
  const embed = createEmbed({
    title: 'Dashboard',
    description: 'Manage settings for **Test Server**.',
  });

  embed.setFooter({ text: 'Dashboard closes after 10 minutes of inactivity' });
  embed.addFields(
    { name: 'Status', value: '`Enabled`', inline: true },
    { name: 'Channel', value: '`Not set`', inline: true },
  );

  const data = embed.toJSON();
  assert.equal(data.footer?.text, 'Dashboard closes after 10 minutes of inactivity');
  assert.equal(data.description, 'Manage settings for **Test Server**.');
  assert.equal(data.fields?.length, 2);
});

test('createEmbed can omit timestamp by passing timestamp: false', () => {
  const embed = createEmbed({
    title: 'No Timestamp',
    description: 'Test',
    timestamp: false,
  });

  const data = embed.toJSON();
  assert.equal(data.timestamp, undefined);
});
