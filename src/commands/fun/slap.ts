import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  User,
  MessageFlags,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Logger } from "../../utils/logger";

// Array of GIFs
const slapGifs = [
  "https://i.imgur.com/o2SJYUS.gif",
  "https://i.imgur.com/oOCq3Bt.gif",
  "https://i.imgur.com/Agwwaj6.gif",
  "https://c.tenor.com/XiYuU9h44-AAAAAd/tenor.gif",
  "https://c.tenor.com/yJmrNruFNtEAAAAd/tenor.gif",
  "https://c.tenor.com/uJAu8XAVg5kAAAAd/tenor.gif",
  "https://c.tenor.com/8bSm0lI4_FUAAAAd/tenor.gif",
];

export const command: ICommand = {
  name: "slap",
  description: "Slaps another user",
  category: "fun", // Assuming 'fun' category
  slashCommand: true,
  prefixCommand: true,
  data: new SlashCommandBuilder()
    .setName("slap")
    .setDescription("Slaps another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to slap")
        .setRequired(true),
    ),

  async run(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const author = interaction.user;
    // The 'user' option is required, so we can safely get it.
    const slappedUser = interaction.options.getUser("user", true);

    // Block self-slaps
    if (author.id === slappedUser.id) {
      const embed = new EmbedBuilder()
        .setColor("#FF5733")
        .setTitle("🤦‍♂️ No Self-Harm!")
        .setDescription("Don't slap yourself! Here's a hug instead 🤗")
        .setImage("https://i.imgur.com/r9aU2xv.gif");

      // Reply publicly (as in the original)
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Get a random GIF
    const randomGif = slapGifs[Math.floor(Math.random() * slapGifs.length)];

    const embed = new EmbedBuilder()
      .setTitle(`**${author.username}** slaps **${slappedUser.username}**! 💥`)
      .setColor("#FF5733")
      .setImage(randomGif)
      .setFooter({ text: `Requested by ${author.username}` });

    // Send the reply, pinging the slapped user
    await interaction.reply({
      content: `${slappedUser.toString()}`, // Ping the slapped user
      embeds: [embed],
    });
  },
};
