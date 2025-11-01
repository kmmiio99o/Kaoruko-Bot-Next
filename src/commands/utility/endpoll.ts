import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";
import { PollManager } from "../../utils/pollManager";

export const command: ICommand = {
  name: "endpoll",
  description: "End an active poll and show results",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  permissions: [PermissionFlagsBits.ManageMessages],
  usage: "Slash: /endpoll poll_id:<message_id>\nPrefix: .endpoll <message_id>",
  examples: [
    "/endpoll poll_id:123456789012345678",
    ".endpoll 123456789012345678",
  ],

  data: new SlashCommandBuilder()
    .setName("endpoll")
    .setDescription("End an active poll and show results")
    .addStringOption((option) =>
      option
        .setName("poll_id")
        .setDescription("The message ID of the poll to end")
        .setRequired(true),
    ),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
  ) {
    try {
      const isSlashCommand = !!interaction;
      const client = isSlashCommand ? interaction!.client : message!.client;
      const executor = isSlashCommand ? interaction!.user : message!.author;
      let pollId: string;

      // Get poll ID from command
      if (isSlashCommand && interaction) {
        pollId = interaction.options.getString("poll_id", true);
      } else if (message && args && args.length > 0) {
        pollId = args[0];
      } else {
        const errorEmbed = Embeds.error(
          "Missing Poll ID",
          "Please provide the poll message ID to end.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Validate poll ID format
      if (!/^\d{17,19}$/.test(pollId)) {
        const errorEmbed = Embeds.error(
          "Invalid Poll ID",
          "Please provide a valid Discord message ID (17-19 digits).",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Check if poll exists
      const pollExists = PollManager.pollExists(pollId);
      if (!pollExists) {
        const errorEmbed = Embeds.error(
          "Poll Not Found",
          `No active poll found with ID: \`${pollId}\`\n\nMake sure you're using the correct message ID and that the poll is still active.`,
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Check permissions (poll creator or user with manage messages)
      const poll = PollManager.getPoll(pollId);
      const canEnd =
        poll?.createdBy === executor.id ||
        message?.member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
        interaction?.memberPermissions?.has(PermissionFlagsBits.ManageMessages);

      if (!canEnd) {
        const errorEmbed = Embeds.error(
          "Insufficient Permissions",
          "You can only end polls you created or you need the `Manage Messages` permission.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Defer reply for processing
      if (isSlashCommand && interaction) {
        await interaction.deferReply();
      }

      // End the poll
      const success = await PollManager.endPoll(pollId);

      if (success) {
        const successEmbed = new EmbedBuilder()
          .setTitle("✅ Poll Ended")
          .setDescription(
            `Poll \`${pollId}\` has been ended and results have been displayed.`,
          )
          .setColor("#00FF00")
          .setTimestamp()
          .setFooter({
            text: `Ended by ${executor.username}`,
            iconURL: executor.displayAvatarURL(),
          });

        if (isSlashCommand && interaction) {
          await interaction.editReply({ embeds: [successEmbed] });
        } else if (message) {
          await message.reply({ embeds: [successEmbed] });
        }
      } else {
        const errorEmbed = Embeds.error(
          "Failed to End Poll",
          `Could not end poll \`${pollId}\`. The poll might have already ended or the message might not exist.`,
        );

        if (isSlashCommand && interaction) {
          if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
          } else {
            await interaction.reply({ embeds: [errorEmbed], flags: [64] });
          }
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
      }
    } catch (error) {
      console.error("Error in endpoll command:", error);

      const errorEmbed = Embeds.error(
        "Command Error",
        "An error occurred while ending the poll. Please try again.",
      );

      if (interaction) {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else if (!interaction.replied) {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        }
      } else if (message) {
        await message.reply({ embeds: [errorEmbed] });
      }
    }
  },
};
