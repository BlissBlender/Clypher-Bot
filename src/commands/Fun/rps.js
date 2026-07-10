import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const CHOICES = {
    rock: { emoji: '🪨', beats: 'scissors' },
    paper: { emoji: '📄', beats: 'rock' },
    scissors: { emoji: '✂️', beats: 'paper' },
};

const OUTCOME_MESSAGES = {
    win: [
        'Nice one! You crushed it! 🎉',
        'Victory is yours! Well played! 👏',
        'You read me like a book! 📖',
        'I bow to your superior tactics! 🙇',
    ],
    lose: [
        'Better luck next time! 😄',
        'I got lucky this round! 🍀',
        'Close one — but I take the win! 🏆',
        'You fought bravely, but I win! ⚔️',
    ],
    tie: [
        'Great minds think alike! 🧠',
        "It's a draw! Let's go again! 🔄",
        'We are evenly matched! ⚖️',
        'Neither of us wins this time! 🤝',
    ],
};

function getBotChoice() {
    const keys = Object.keys(CHOICES);
    return keys[Math.floor(Math.random() * keys.length)];
}

function determineWinner(player, bot) {
    if (player === bot) return 'tie';
    if (CHOICES[player].beats === bot) return 'win';
    return 'lose';
}

export default {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors against the bot!')
        .addStringOption((option) =>
            option
                .setName('choice')
                .setDescription('Your move')
                .setRequired(true)
                .addChoices(
                    { name: 'Rock 🪨', value: 'rock' },
                    { name: 'Paper 📄', value: 'paper' },
                    { name: 'Scissors ✂️', value: 'scissors' },
                ),
        ),
    category: 'Fun',

    async execute(interaction, config, client) {
        try {
            const playerChoice = interaction.options.getString('choice');
            const botChoice = getBotChoice();
            const outcome = determineWinner(playerChoice, botChoice);

            const playerEmoji = CHOICES[playerChoice].emoji;
            const botEmoji = CHOICES[botChoice].emoji;
            const outcomeMessages = OUTCOME_MESSAGES[outcome];
            const message = outcomeMessages[Math.floor(Math.random() * outcomeMessages.length)];

            const titles = {
                win: '🎉 You Win!',
                lose: '😤 You Lose!',
                tie: '🤝 It\'s a Tie!',
            };

            const embed = createEmbed({
                title: titles[outcome],
                description: `You chose ${playerEmoji} **${playerChoice}**\nI chose ${botEmoji} **${botChoice}**\n\n${message}`,
                color: outcome === 'win' ? 'success' : outcome === 'lose' ? 'danger' : 'primary',
            });

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            logger.debug(`RPS command: ${interaction.user.id} chose ${playerChoice}, bot chose ${botChoice}, result: ${outcome}`);
        } catch (error) {
            logger.error('RPS command error:', error);
            await handleInteractionError(interaction, error, {
                commandName: 'rps',
                source: 'rps_command',
            });
        }
    },
};
