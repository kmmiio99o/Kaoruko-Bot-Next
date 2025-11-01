import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default {
  name: "kick",
  description: "Kick a user from the server",
  category: "moderation",
  permissions: [PermissionFlagsBits.KickMembers],
  slashCommand: true,
  prefixCommand: true,
  usage: "/kick <user> [reason] or .kick <user> [reason]",
  examples: ["/kick @user spamming", ".kick @user spamming"],
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
    commandHandler: any,
  ) {
    try {
      // Check if this is a slash command or prefix command
      const isSlashCommand = !!interaction;

      // Validate context (must be in a guild)
      if (isSlashCommand) {
        if (!interaction?.guild) {
          if (interaction) {
            await interaction.reply({
              embeds: [
                Embeds.error(
                  "Invalid Context",
                  "This command can only be used in a server.",
                ),
              ],
              flags: [64],
            });
          }
          return;
        }
      } else if (message) {
        if (!message.guild) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command can only be used in a server.",
              ),
            ],
          });
          return;
        }
      } else {
        return; // No valid context
      }

      // Check permissions
      let hasPermission = false;
      if (interaction) {
        hasPermission =
          interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers) ||
          false;
      } else if (message) {
        // Fix TypeScript error - use member.permissions instead of message.memberPermissions
        hasPermission =
          message.member?.permissions.has(PermissionFlagsBits.KickMembers) ||
          false;
      }

      if (!hasPermission) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Kick Members permission to use this command.",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Kick Members permission to use this command.",
              ),
            ],
          });
        }
        return;
      }

      // Get target user and reason
      let targetUser: any;
      let reason: string | undefined;

      if (interaction) {
        // Slash command version
        targetUser = interaction.options.getUser("user", true);
        reason =
          interaction.options.getString("reason") || "No reason provided";
      } else if (message && args) {
        // Prefix command version
        const userId = args[0]?.replace(/[<@!>]/g, ""); // Remove <@!> from mention
        if (!userId) {
          await message.reply({
            embeds: [
              Embeds.error("Invalid User", "Please specify a user to kick."),
            ],
          });
          return;
        }

        try {
          targetUser = await message.guild?.members.fetch(userId);
          if (!targetUser) {
            await message.reply({
              embeds: [
                Embeds.error(
                  "User Not Found",
                  "Could not find that user in this server.",
                ),
              ],
            });
            return;
          }
        } catch (error) {
          await message.reply({
            embeds: [
              Embeds.error(
                "User Not Found",
                "Could not find that user in this server.",
              ),
            ],
          });
          return;
        }

        reason = args.slice(1).join(" ") || "No reason provided";
      } else {
        // Handle invalid usage - neither proper slash command nor prefix command
        if (message) {
          await message.reply({
            embeds: [
              Embeds.error("Invalid Usage", "Please specify a user to kick."),
            ],
          });
        }
        return;
      }

      // Validate target user
      if (!targetUser) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Invalid User",
                "Please specify a valid user to kick.",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid User",
                "Please specify a valid user to kick.",
              ),
            ],
          });
        }
        return;
      }

      // Check if target is kickable
      let targetMember: any;
      if (interaction) {
        try {
          targetMember = await interaction.guild?.members.fetch(targetUser.id);
        } catch (error) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "User Not Found",
                "Could not find that user in this server.",
              ),
            ],
            flags: [64],
          });
          return;
        }
      } else if (message) {
        targetMember = targetUser;
      }

      if (!targetMember?.kickable) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Cannot Kick",
                "I cannot kick this user. They may have a higher role than me or be the server owner.",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Cannot Kick",
                "I cannot kick this user. They may have a higher role than me or be the server owner.",
              ),
            ],
          });
        }
        return;
      }

      // Perform kick
      try {
        await targetMember.kick(reason);

        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.success(
                "User Kicked",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been kicked.\n**Reason:** ${reason}`,
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.success(
                "User Kicked",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been kicked.\n**Reason:** ${reason}`,
              ),
            ],
          });
        }

        Logger.logWithContext(
          "MODERATION",
          `User ${targetUser.tag || targetUser.user?.tag || "Unknown User"} (${targetUser.id}) kicked by ${isSlashCommand ? interaction?.user.tag : message?.author.tag}`,
          "info",
        );
      } catch (error: any) {
        Logger.error(`Error kicking user ${targetUser.id}: ${error}`);

        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Kick Failed",
                `Failed to kick ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Kick Failed",
                `Failed to kick ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
          });
        }
      }
    } catch (error: any) {
      Logger.error(`Error in kick command: ${error}`);

      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Command Error",
              `An error occurred: ${error.message || "Unknown error"}`,
            ),
          ],
          flags: [64],
        });
      } else if (message) {
        await message.reply({
          embeds: [
            Embeds.error(
              "Command Error",
              `An error occurred: ${error.message || "Unknown error"}`,
            ),
          ],
        });
      }
    }
  },
} as Command;
