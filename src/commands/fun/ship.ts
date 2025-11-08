import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ColorResolvable,
  MessageFlags,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Logger } from "../../utils/logger";

/**
 * Interface for the result of the ship compatibility calculation.
 */
interface ShipResult {
  percentage: number;
  message: string;
  color: ColorResolvable;
}

export const command: ICommand = {
  name: "ship",
  description: "Calculate the compatibility between two users!",
  category: "fun",
  slashCommand: true,
  prefixCommand: true,
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Calculate the compatibility between two users!")
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("The first user to ship.")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("user2")
        .setDescription("The second user to ship.")
        .setRequired(true),
    ),
  async run(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const user1 = interaction.options.getUser("user1", true);
    const user2 = interaction.options.getUser("user2", true);

    // Handle shipping the same user with an ephemeral reply
    if (user1.id === user2.id) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💖 Self-Love! 💖")
            .setDescription(
              `${user1.toString()}, you can't ship yourself with yourself! But self-love is always a perfect 100%!`,
            )
            .setColor("#FF69B4"), // Hot Pink
        ],
        flags: MessageFlags.Ephemeral, // This reply should only be visible to the user who invoked the command
      });
      return;
    }

    // Defer the reply to give the bot more time to process, indicating responsiveness.
    // This will create a public "Bot is thinking..." message.
    await interaction.deferReply();

    // Generate a "ship name" by combining parts of their display names
    // Using displayName for potentially more readable names than username
    const shipName = generateShipName(user1.displayName, user2.displayName);

    // Calculate a random ship compatibility result
    const result = calculateShipResult();

    const embed = new EmbedBuilder()
      .setTitle(
        `💖 Shipping Results for ${user1.displayName} x ${user2.displayName} 💖`,
      )
      .setDescription(
        `**${shipName}** is ${result.percentage}% compatible!\n${result.message}`,
      )
      .setColor(result.color)
      .addFields(
        { name: "User 1", value: user1.toString(), inline: true },
        { name: "User 2", value: user2.toString(), inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "May your ships sail smoothly!" });

    // Edit the deferred reply with the final results. This will be a public message.
    await interaction.editReply({ embeds: [embed] });
  },
};

/**
 * Generates a ship name by combining parts of two usernames.
 * @param name1 The first username (or displayName).
 * @param name2 The second username (or displayName).
 * @returns A combined ship name.
 */
function generateShipName(name1: string, name2: string): string {
  const len1 = Math.ceil(name1.length / 2);
  const len2 = Math.floor(name2.length / 2);
  const part1 = name1.substring(0, len1);
  const part2 = name2.substring(name2.length - len2);

  // Basic capitalization for the generated name
  const combined = part1 + part2;
  return combined.charAt(0).toUpperCase() + combined.slice(1);
}

/**
 * Calculates a random ship compatibility percentage.
 * The user IDs are no longer needed for a consistent result.
 * @returns An object containing the percentage, a descriptive message, and a color.
 */
function calculateShipResult(): ShipResult {
  // Generate a random percentage from 0 to 100
  // Math.random() gives [0, 1). Multiply by 101 to get [0, 101).
  // Math.floor() rounds down, resulting in an integer from 0 to 100.
  const percentage = Math.floor(Math.random() * 101);

  let message: string;
  let color: ColorResolvable;

  if (percentage < 20) {
    message =
      "Oh dear, it seems like these two are better off as friends... far, far away friends. 💔";
    color = "#FF0000"; // Red
  } else if (percentage < 40) {
    message =
      "There's a spark, but it might need a lot of fanning to become a flame. 🔥";
    color = "#FFA500"; // Orange
  } else if (percentage < 60) {
    message =
      "A decent match! With some effort, this could blossom into something nice. 🌼";
    color = "#FFFF00"; // Yellow
  } else if (percentage < 80) {
    message =
      "Wow, a strong connection! It's practically written in the stars. ✨";
    color = "#ADFF2F"; // GreenYellow
  } else if (percentage < 95) {
    message = "An undeniable bond! They were made for each other! 🥰";
    color = "#32CD32"; // LimeGreen
  } else {
    // 95 to 100
    message = "It's a perfect match! Soulmates for sure! ❤️‍🔥";
    color = "#FF69B4"; // HotPink
  }

  return { percentage, message, color };
}
