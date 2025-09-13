import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default {
  name: "timeout",
  description: "Timeout a user in the server",
  category: "moderation",
  permissions: [PermissionFlagsBits.ModerateMembers],
  slashCommand: true,
  prefixCommand: true,
  usage:
    "/timeout <user> <duration> [reason] or .timeout <user> <duration> [reason]",
  examples: ["/timeout @user 10m spamming", ".timeout @user 10m spamming"],
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
      if (interaction) {
        hasPermission =
          interaction.memberPermissions?.has(
            PermissionFlagsBits.ModerateMembers,
          ) || false;
      } else if (message) {
        // Fix TypeScript error - use member.permissions instead of message.memberPermissions
        hasPermission =
          message.member?.permissions.has(
            PermissionFlagsBits.ModerateMembers,
          ) || false;
      }

      if (!hasPermission) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Moderate Members permission to use this command.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Permission Denied",
                "You need Moderate Members permission to use this command.",
              ),
            ],
          });
        }
        return;
      }

      // Get target user, duration, and reason
      let targetUser: any;
      let duration: string | undefined;
      let reason: string | undefined;

      if (interaction) {
        // Slash command version
        targetUser = interaction.options.getUser("user", true);
        duration = interaction.options.getString("duration", true);
        reason =
          interaction.options.getString("reason") || "No reason provided";
      } else if (message && args) {
        // Prefix command version
        const userId = args[0]?.replace(/[<@!>]/g, ""); // Remove <@!> from mention
        duration = args[1];

        if (!userId || !duration) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Usage",
                "Please specify a user and duration.\nUsage: `.timeout <user> <duration> [reason]`",
              ),
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

        reason = args.slice(2).join(" ") || "No reason provided";
      } else {
        // Handle invalid usage - neither proper slash command nor prefix command
        if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Usage",
                "Please specify a user and duration.\nUsage: `.timeout <user> <duration> [reason]`",
              ),
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
                "Please specify a valid user to timeout.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid User",
                "Please specify a valid user to timeout.",
              ),
            ],
          });
        }
        return;
      }

      // Parse duration
      const durationMs = parseTime(duration || "");
      if (durationMs <= 0) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Please provide a valid duration (e.g., 1m, 5h, 1d).\nSupported units: s (seconds), m (minutes), h (hours), d (days)",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Please provide a valid duration (e.g., 1m, 5h, 1d).\nSupported units: s (seconds), m (minutes), h (hours), d (days)",
              ),
            ],
          });
        }
        return;
      }

      // Check if duration is within limits (max 28 days)
      if (durationMs > 2419200000) {
        // 28 days in milliseconds
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Timeout duration cannot exceed 28 days.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Timeout duration cannot exceed 28 days.",
              ),
            ],
          });
        }
        return;
      }

      // Check if target is timeoutable
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
            flags: [64], // EPHEMERAL flag
          });
          return;
        }
      } else if (message) {
        targetMember = targetUser;
      }

      if (!targetMember?.moderatable) {
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Cannot Timeout",
                "I cannot timeout this user. They may have a higher role than me or be the server owner.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Cannot Timeout",
                "I cannot timeout this user. They may have a higher role than me or be the server owner.",
              ),
            ],
          });
        }
        return;
      }

      // Perform timeout
      try {
        await targetMember.timeout(durationMs, reason);

        const durationFormatted = formatTime(durationMs);
        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.success(
                "User Timed Out",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been timed out for ${durationFormatted}.\n**Reason:** ${reason}`,
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.success(
                "User Timed Out",
                `${targetUser.tag || targetUser.user?.tag || "Unknown User"} has been timed out for ${durationFormatted}.\n**Reason:** ${reason}`,
              ),
            ],
          });
        }

        Logger.logWithContext(
          "MODERATION",
          `User ${targetUser.tag || targetUser.user?.tag || "Unknown User"} (${targetUser.id}) timed out for ${durationFormatted} by ${isSlashCommand ? interaction?.user.tag : message?.author.tag}`,
          "info",
        );
      } catch (error: any) {
        Logger.error(`Error timing out user ${targetUser.id}: ${error}`);

        if (interaction) {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Timeout Failed",
                `Failed to timeout ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Timeout Failed",
                `Failed to timeout ${targetUser.tag || targetUser.user?.tag || "Unknown User"}: ${error.message || "Unknown error"}`,
              ),
            ],
          });
        }
      }
    } catch (error: any) {
      Logger.error(`Error in timeout command: ${error}`);

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

// Helper function to parse time strings
function parseTime(time: string): number {
  const regex = /^(\d+)([smhdwy])$/;
  const match = time.match(regex);

  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60000, // minutes
    h: 3600000, // hours
    d: 86400000, // days
    w: 604800000, // weeks
    y: 31536000000, // years
  };

  return value * (multipliers[unit] || 0);
}

// Helper function to format time in human-readable format
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years !== 1 ? "s" : ""}`;
  if (weeks > 0) return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
