import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "eval",
  description: "Evaluate JavaScript code (Owner only)",
  category: "admin",
  ownerOnly: true,
  slashCommand: true,
  prefixCommand: true,

  data: new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluate JavaScript code (Owner only)")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("JavaScript code to evaluate")
        .setRequired(true),
    ),

  async run(interaction?: ChatInputCommandInteraction) {
    if (!interaction) return;

    // Check if user is bot owner
    const client = interaction.client;
    const ownerId = client.application?.owner?.id || process.env.OWNER_ID;

    if (!ownerId) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Configuration Error",
            "Bot owner ID not found. Please set OWNER_ID in environment variables.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // For teams, owner might be a Team object
    let isOwner = false;
    if (client.application?.owner) {
      if ("id" in client.application.owner) {
        // Single owner
        isOwner = interaction.user.id === client.application.owner.id;
      } else if ("owner" in client.application.owner) {
        // Team owner
        isOwner =
          interaction.user.id ===
          (client.application.owner as any).ownerUser?.id;
      }
    }

    // Fallback to environment variable
    if (!isOwner && interaction.user.id === process.env.OWNER_ID) {
      isOwner = true;
    }

    if (!isOwner) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Permission Denied",
            "Only the bot owner can use this command.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const code = interaction.options.getString("code", true);

    try {
      // @ts-ignore
      let evaled = eval(code);

      if (typeof evaled !== "string") {
        evaled = require("util").inspect(evaled, { depth: 0 });
      }

      // Truncate long output
      if (evaled.length > 1900) {
        evaled = evaled.substring(0, 1900) + "...";
      }

      await interaction.reply({
        embeds: [Embeds.success("Eval Success", `\`\`\`js\n${evaled}\n\`\`\``)],
      });
    } catch (error: any) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Eval Error",
            `\`\`\`js\n${error.message || error}\n\`\`\``,
          ),
        ],
        ephemeral: true,
      });
    }
  },
};
