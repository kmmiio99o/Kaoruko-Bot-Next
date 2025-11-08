import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  User,
  MessageFlags,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Logger } from "../../utils/logger"; // Included for structural consistency

// Array of GIFs, as provided.
const hugGifs = [
  "https://i.imgur.com/r9aU2xv.gif",
  "https://i.imgur.com/wOmoeF8.gif",
  "https://i.imgur.com/nrdYNtL.gif",
  "https://i.imgur.com/IAxUnda.gif",
  "https://i.imgur.com/ntqYLGl.gif",
  "https://i.imgur.com/v47M1S4.gif",
  "https://i.imgur.com/4oLIrwj.gif",
];

export const command: ICommand = {
  name: "hug",
  description: "Hug another user",
  category: "fun",
  slashCommand: true,
  prefixCommand: true,
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Hug another user")
    .addUserOption(
      (option) =>
        option
          .setName("user")
          .setDescription("The user to hug")
          .setRequired(true), // We can rely on this being true
    ),

  async run(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const hugger = interaction.user;
    // The 'user' option is required, so we can safely get it.
    const huggedUser = interaction.options.getUser("user", true);

    // Block self-hugs
    if (hugger.id === huggedUser.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ No Self-Hugging!")
        .setDescription("You can't hug yourself! Try hugging someone else.")
        .setTimestamp();

      // Reply ephemerally
      await interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Get a random GIF
    const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

    const embed = new EmbedBuilder()
      .setColor("#FFC0CB") // Pink
      .setDescription(
        `**${hugger.username}** hugs **${huggedUser.username}** ❤️`,
      )
      .setImage(randomGif)
      .setTimestamp();

    // Send the reply, pinging the hugged user
    await interaction.reply({
      content: `${huggedUser.toString()}`,
      embeds: [embed],
    });
  },
};
