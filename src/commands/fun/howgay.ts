import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Logger } from "../../utils/logger";

/**
 * Interface for the result of the "how gay" calculation.
 */
interface HowGayResult {
  percentage: number;
  message: string;
  prideBar: string;
}

export const command: ICommand = {
  name: "howgay",
  description: "Calculates how gay a user is.",
  category: "fun",
  slashCommand: true,
  prefixCommand: true,
  data: new SlashCommandBuilder()
    .setName("howgay")
    .setDescription("Calculates how gay a user is.")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The user to rate")
        .setRequired(true),
    ),
  async run(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    // Get the user from the required option
    const user = interaction.options.getUser("member", true);

    // Calculate the result using the helper function (now random)
    const result = calculateGayResult();

    const embed = new EmbedBuilder()
      .setColor("#FF00FF") // A fabulous magenta
      .setTitle("🏳️‍🌈 Gay-O-Meter 🏳️‍🌈")
      .setDescription(`Let's find out how gay **${user.username}** is...`)
      .setThumbnail(
        "https://media.tenor.com/sk774ooULKcAAAAj/rainbow-heart-heart.gif", // A rainbow heart
      )
      .addFields(
        {
          name: "Gayness Level",
          value: `**${result.percentage}%**`,
          inline: true,
        },
        { name: "Pride Meter", value: result.prideBar, inline: true },
        { name: "Verdict", value: `*${result.message}*` },
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  },
};

/**
 * Calculates a random "how gay" percentage.
 * The user ID is no longer needed.
 * @returns An object containing the percentage, a descriptive message, and a pride bar.
 */
function calculateGayResult(): HowGayResult {
  // Generate a random percentage from 0 to 100
  const percentage = Math.floor(Math.random() * 101);

  // --- Original logic from the howgay command ---
  const prideBar =
    "🏳️‍🌈".repeat(Math.round(percentage / 10)) +
    "🖤".repeat(10 - Math.round(percentage / 10));

  let gayMessage: string;
  if (percentage === 0) {
    gayMessage = "100% straight. No doubt about it. 📏";
  } else if (percentage < 20) {
    gayMessage = "Just a little bit curious, perhaps? 🤔";
  } else if (percentage < 40) {
    gayMessage = "Starting to explore the rainbow. 🌈";
  } else if (percentage < 60) {
    gayMessage = "Perfectly balanced, as all things should be. ⚖️";
  } else if (percentage < 80) {
    gayMessage = "Very much in touch with their fabulous side! 💅";
  } else if (percentage < 100) {
    gayMessage = "A true champion of the rainbow! 🏳️‍🌈";
  } else {
    // percentage === 100
    gayMessage = "The ultimate gay icon! Yas queen! 👑";
  }
  // --- End of original logic ---

  return {
    percentage: percentage,
    message: gayMessage,
    prideBar: prideBar,
  };
}
