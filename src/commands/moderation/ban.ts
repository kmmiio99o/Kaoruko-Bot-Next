import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default {
  name: "ban",
  description: "Ban a user from the server",
  category: "moderation",
  permissions: [PermissionFlagsBits.BanMembers],
  slashCommand: true,
  prefixCommand: true,
  usage: "/ban <user> [reason] or .ban <user> [reason]",
  examples: ["/ban @user spamming", ".ban @user spamming"],
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
              flags: [64], // EPHEMERAL flag
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
      if (isSlashCommand && interaction) {
        hasPermission =
          interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers) ||
          false;
      } else if (message) {
        // Fix TypeScript error - use member.permissions instead of message.memberPermissions
        hasPermission =
          message.member?.permissions.has(PermissionFlagsBits.BanMembers) ||
          false;
      }

      if (!hasPermission) {
        if (isSlashCommand && interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Ban Members permission to use this command.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Ban Members permission to use this command.",
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
              Embeds.error("Invalid User", "Please specify a user to ban."),
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
              Embeds.error("Invalid Usage", "Please specify a user to ban."),
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
                "Please specify a valid user to ban.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid User",
                "Please specify a valid user to ban.",
              ),
            ],
          });
        }
        return;
      }

      // Check if target is bannable
      let targetMember: any;
      if (interaction) {
        try {
          targetMember = await interaction.guild?.members.fetch(targetUser.id);
        } catch (error) {
          // User might not be in the server, but we can still ban them
          targetMember = null;
        }
      } else if (message) {
        targetMember = targetUser;
      }

      if (targetMember && !targetMember?.bannable) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Cannot Ban",
                "I cannot ban this user. They may have a higher role than me or be the server owner.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Cannot Ban",
                "I cannot ban this user. They may have a higher role than me or be the server owner.",
              ),
            ],
          });
        }
        return;
      }

      // Perform ban
      try {
        await (interaction?.guild || message?.guild)?.members.ban(
          targetUser.id,
          { reason },
        );

        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.success(
                "User Banned",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been banned.\n**Reason:** ${reason}`,
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.success(
                "User Banned",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been banned.\n**Reason:** ${reason}`,
              ),
            ],
          });
        }

        Logger.logWithContext(
          "MODERATION",
          `User ${targetUser.tag || targetUser.user?.tag || "Unknown User"} (${targetUser.id}) banned by ${isSlashCommand ? interaction?.user.tag : message?.author.tag}`,
          "info",
        );
      } catch (error: any) {
        Logger.error(`Error banning user ${targetUser.id}: ${error}`);

        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Ban Failed",
                `Failed to ban ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Ban Failed",
                `Failed to ban ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
          });
        }
      }
    } catch (error: any) {
      Logger.error(`Error in ban command: ${error}`);

      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Command Error",
              `An error occurred: ${error.message || "Unknown error"}`,
            ),
          ],
          flags: [64], // EPHEMERAL flag
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
