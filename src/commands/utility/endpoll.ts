import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Message,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import { endPoll } from "./poll";

export default {
  name: "endpoll",
  description: "End a poll early and show results",
  category: "utility",
  permissions: [PermissionFlagsBits.ManageMessages],
  slashCommand: true,
  prefixCommand: true,
  usage:
    "Slash: /endpoll [use_last:true] [message_id:<ID>]\nPrefix: .endpoll [last | <message_id>]",
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      // Determine if this is a slash command or prefix command
      const isSlashCommand = !!interaction;
      const executor = isSlashCommand ? interaction.user : message?.author;

      if (!executor) return;

      Logger.logWithContext(
        "ENDPOLL",
        `User ${executor.tag} attempting to end poll`,
        "info",
      );

      const polls = (executor.client as any).polls;
      if (!polls || polls.size === 0) {
        Logger.logWithContext("ENDPOLL", `No polls found`, "warn");
        const embed = Embeds.error("No Polls", "There are no active polls.");
        if (isSlashCommand) {
          return await interaction!.reply({ embeds: [embed], flags: [64] });
        } else {
          return await message!.reply({ embeds: [embed] });
        }
      }

      let pollId: string | undefined;
      let pollData: any;

      if (isSlashCommand) {
        const messageId = interaction.options.getString("message_id");
        const useLast = interaction.options.getBoolean("use_last") || false;
        if (useLast) {
          let latestPollId: string | undefined;
          let latestTime = 0;
          polls.forEach((data: any, id: string) => {
            const pollTime = new Date(data.createdAt).getTime();
            if (pollTime > latestTime) {
              latestTime = pollTime;
              latestPollId = id;
            }
          });
          pollId = latestPollId;
          pollData = polls.get(pollId);
        } else if (messageId) {
          pollId = messageId;
          pollData = polls.get(pollId);
        } else {
          const embed = Embeds.info(
            "End Poll Help",
            "**How to end a poll:**\n\n" +
              "🔹 **Option 1:** Use `/endpoll use_last:true` to end the most recent poll\n" +
              "🔹 **Option 2:** Use `/endpoll message_id:<ID>` to end a specific poll\n\n" +
              "💡 **Tip:** The poll ID is shown in the poll message footer.",
          );
          return await interaction!.reply({ embeds: [embed], flags: [64] });
        }
      } else if (message && args) {
        const arg = args[0]?.toLowerCase();
        if (arg === "last" || arg === "-l") {
          let latestPollId: string | undefined;
          let latestTime = 0;
          polls.forEach((data: any, id: string) => {
            const pollTime = new Date(data.createdAt).getTime();
            if (pollTime > latestTime) {
              latestTime = pollTime;
              latestPollId = id;
            }
          });
          pollId = latestPollId;
          pollData = polls.get(pollId);
        } else if (arg) {
          pollId = arg;
          pollData = polls.get(pollId);
        } else {
          const embed = Embeds.info(
            "End Poll Help",
            "**How to end a poll:**\n\n" +
              "🔹 **Option 1:** Use `.endpoll last` to end the most recent poll\n" +
              "🔹 **Option 2:** Use `.endpoll <message_id>` to end a specific poll\n\n" +
              "💡 **Tip:** The poll ID is shown in the poll message footer.",
          );
          return await message.reply({ embeds: [embed] });
        }
      }

      if (!pollId || !pollData) {
        Logger.logWithContext("ENDPOLL", `Poll not found`, "warn");
        const embed = Embeds.error(
          "Poll Not Found",
          "Could not find an active poll with that ID.",
        );
        if (isSlashCommand) {
          return await interaction!.reply({ embeds: [embed], flags: [64] });
        } else {
          return await message!.reply({ embeds: [embed] });
        }
      }

      // Check permissions - only creator or moderators can end poll
      const isCreator = pollData.creatorId === executor.id;
      const hasManageMessages = message
        ? message.member?.permissions.has(PermissionFlagsBits.ManageMessages)
        : interaction?.memberPermissions?.has(
            PermissionFlagsBits.ManageMessages,
          );

      if (!isCreator && !hasManageMessages) {
        Logger.logWithContext(
          "ENDPOLL",
          `User ${executor.tag} lacks permission to end poll ${pollId}`,
          "warn",
        );
        const embed = Embeds.error(
          "Permission Denied",
          "You can only end polls that you created or if you have Manage Messages permission.",
        );
        if (isSlashCommand) {
          return await interaction!.reply({ embeds: [embed], flags: [64] });
        } else {
          return await message!.reply({ embeds: [embed] });
        }
      }

      const replyEmbed = Embeds.success(
        "Poll Ending",
        `The poll is being ended and results will be displayed shortly.\n**Poll ID:** \`${pollId}\``,
      );
      if (isSlashCommand) {
        await interaction!.reply({ embeds: [replyEmbed], flags: [64] });
      } else {
        await message!.reply({ embeds: [replyEmbed] });
      }

      await endPoll(executor.client, pollId);
      Logger.logWithContext(
        "ENDPOLL",
        `Poll ${pollId} ended successfully by ${executor.tag}`,
        "success",
      );
    } catch (error) {
      Logger.logWithContext("ENDPOLL", `Error ending poll: ${error}`, "error");
      const embed = Embeds.error(
        "Failed to End Poll",
        "An error occurred while ending the poll.",
      );
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], flags: [64] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    }
  },
} as Command;
