import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
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
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a user in the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to timeout")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration (e.g., 10m, 2h, 1d)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for timeout")
        .setRequired(false),
    ),
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      const isSlash = !!interaction;

      // Resolve guild context
      const guild = (interaction?.guild ?? message?.guild) as any;
      if (!guild) {
        if (isSlash) {
          await interaction!.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command must be used inside a server.",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command must be used inside a server.",
              ),
            ],
          });
        }
        return;
      }

      // Permission check (Moderate Members)
      const hasPerm = isSlash
        ? interaction!.memberPermissions?.has(
            PermissionFlagsBits.ModerateMembers,
          )
        : message!.member?.permissions.has(PermissionFlagsBits.ModerateMembers);
      if (!hasPerm) {
        const reply = {
          embeds: [
            Embeds.error(
              "Permission Denied",
              "You need the **Moderate Members** permission to use this command.",
            ),
          ],
          flags: isSlash ? [64] : undefined,
        } as any;
        if (isSlash) await interaction!.reply(reply);
        else await message!.reply(reply);
        return;
      }

      // Parse inputs (target user, duration, reason) for slash and prefix
      let targetMember: any = null;
      let targetTag = "Unknown User";
      let durationStr: string | undefined;
      let reason = "No reason provided";

      if (isSlash) {
        const user = interaction!.options.getUser("user");
        durationStr = interaction!.options.getString("duration") ?? undefined;
        reason = interaction!.options.getString("reason") ?? reason;

        if (!user || !durationStr) {
          await interaction!.reply({
            embeds: [
              Embeds.error(
                "Invalid Usage",
                "Usage: /timeout <user> <duration> [reason]",
              ),
            ],
            flags: [64],
          });
          return;
        }

        targetTag = user.tag;
        try {
          targetMember = await guild.members.fetch(user.id);
        } catch {
          // member not present
          targetMember = null;
        }
      } else {
        if (!args || args.length < 2) {
          await message!.reply({
            embeds: [
              Embeds.error(
                "Invalid Usage",
                "Usage: `.timeout <user> <duration> [reason]`",
              ),
            ],
          });
          return;
        }

        const raw = args[0].replace(/[<@!>]/g, "");
        durationStr = args[1];
        reason = args.slice(2).join(" ") || reason;

        try {
          targetMember = await guild.members.fetch(raw);
          targetTag = targetMember.user?.tag ?? raw;
        } catch {
          // If member not found, inform and exit — timeouts require a guild member object
          await message!.reply({
            embeds: [
              Embeds.error(
                "User Not Found",
                "Could not find that user in this server. Timeouts require the user to be a current guild member.",
              ),
            ],
          });
          return;
        }
      }

      if (!targetMember) {
        const msg =
          "Target user is not a current guild member. Timeouts can only be applied to members present in the server.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Cannot Timeout", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Cannot Timeout", msg)],
          });
        return;
      }

      // Parse duration using existing helper
      const durationMs = parseTime(durationStr ?? "");
      if (durationMs <= 0) {
        const msg =
          "Please provide a valid duration (e.g., 1m, 5h, 1d). Supported units: s (seconds), m (minutes), h (hours), d (days).";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Invalid Duration", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Invalid Duration", msg)],
          });
        return;
      }

      // Discord enforces a 28-day limit for timeouts
      const maxTimeout = 2419200000; // 28 days in ms
      if (durationMs > maxTimeout) {
        const msg = "Timeout duration cannot exceed 28 days.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Invalid Duration", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Invalid Duration", msg)],
          });
        return;
      }

      // Prevent self-timeout and owner/timeouter protections
      const invokerId = isSlash ? interaction!.user.id : message!.author.id;
      if (targetMember.id === invokerId) {
        const msg = "You cannot timeout yourself.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Invalid Action", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Invalid Action", msg)],
          });
        return;
      }
      if (targetMember.id === guild.ownerId) {
        const msg = "You cannot timeout the server owner.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Invalid Action", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Invalid Action", msg)],
          });
        return;
      }

      // Check bot can moderate the member
      if (!targetMember.moderatable && !targetMember.manageable) {
        const msg =
          "I cannot timeout this user. They may have a higher role than me or be the server owner.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Cannot Timeout", msg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Cannot Timeout", msg)],
          });
        return;
      }

      // Apply timeout using Discord's API (member.timeout)
      try {
        await targetMember.timeout(durationMs, reason);

        const durationFormatted = formatTime(durationMs);
        const successText = `**${targetTag}** has been timed out for **${durationFormatted}**.\n**Reason:** ${reason}`;

        if (isSlash) {
          await interaction!.reply({
            embeds: [Embeds.success("User Timed Out", successText)],
            flags: [64],
          });
        } else {
          await message!.reply({
            embeds: [Embeds.success("User Timed Out", successText)],
          });
        }

        try {
          Logger.logWithContext(
            "MODERATION",
            `User ${targetTag} (${targetMember.id}) timed out for ${durationFormatted} by ${isSlash ? interaction!.user.tag : message!.author.tag} — reason: ${reason}`,
            "info",
          );
        } catch {}
      } catch (err: any) {
        Logger.error(`Timeout failed for ${targetMember.id}: ${err}`);
        const errMsg = `Failed to timeout **${targetTag}**: ${err?.message ?? err}`;
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Timeout Failed", errMsg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Timeout Failed", errMsg)],
          });
      }
    } catch (error: any) {
      Logger.error(`Error in timeout command: ${error}`);
      const payload = {
        embeds: [
          Embeds.error(
            "Command Error",
            `An error occurred: ${error?.message ?? error}`,
          ),
        ],
      } as any;
      if (interaction && !interaction.replied && !interaction.deferred)
        await interaction.reply({ ...payload, flags: [64] });
      else if (message) await message.reply(payload);
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
