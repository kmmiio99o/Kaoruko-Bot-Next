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
  name: "kick",
  description: "Kick a user from the server",
  category: "moderation",
  permissions: [PermissionFlagsBits.KickMembers],
  slashCommand: true,
  prefixCommand: true,
  usage: "/kick <user> [reason] or .kick <user> [reason]",
  examples: ["/kick @user spamming", ".kick @user spamming"],
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to kick").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false),
    ),
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      const isSlash = !!interaction;

      // Validate context
      const guild = isSlash ? interaction!.guild : message!.guild;
      if (!guild) {
        if (isSlash) {
          await interaction!.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command must be used in a server.",
              ),
            ],
            flags: [64],
          });
        } else {
          await message!.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command must be used in a server.",
              ),
            ],
          });
        }
        return;
      }

      // Permission check
      const canKick = isSlash
        ? interaction!.memberPermissions?.has(PermissionFlagsBits.KickMembers)
        : message!.member?.permissions.has(PermissionFlagsBits.KickMembers);

      if (!canKick) {
        const replyPayload = {
          embeds: [
            Embeds.error(
              "Permission Denied",
              "You need the **Kick Members** permission to use this command.",
            ),
          ],
          flags: isSlash ? [64] : undefined,
        } as any;
        if (isSlash) await interaction!.reply(replyPayload);
        else await message!.reply(replyPayload);
        return;
      }

      // Resolve target and reason robustly for both slash and prefix formats
      let targetMember: any = null;
      let targetUserTag = "Unknown User";
      let reason = "No reason provided";

      if (isSlash) {
        const user = interaction!.options.getUser("user", true);
        reason = interaction!.options.getString("reason") ?? reason;

        // Try fetch member in guild; member may be null if user not in guild
        try {
          targetMember = await guild.members.fetch(user.id);
        } catch {
          // leave targetMember as null (user may not be present)
        }
        targetUserTag = user.tag;
      } else {
        if (!args || args.length === 0) {
          await message!.reply({
            embeds: [
              Embeds.error("Invalid Usage", "Usage: `.kick <user> [reason]`"),
            ],
          });
          return;
        }
        // Extract ID from mention or raw ID
        const raw = args[0].replace(/[<@!>]/g, "");
        reason = args.slice(1).join(" ") || reason;

        try {
          targetMember = await guild.members.fetch(raw);
          targetUserTag = targetMember.user?.tag ?? raw;
        } catch {
          // If member fetch failed, attempt to treat raw as user id and use minimal fallback
          targetUserTag = raw;
        }
      }

      // If the target is not a member object but we have an ID, create a minimal representation
      if (!targetMember) {
        // If not a guild member, we can't call kick on them; inform moderator
        const msg =
          "Target user is not in the server or could not be fetched. Kicking requires the user to be present in the server.";
        if (isSlash) {
          await interaction!.reply({
            embeds: [Embeds.error("Cannot Kick", msg)],
            flags: [64],
          });
        } else {
          await message!.reply({ embeds: [Embeds.error("Cannot Kick", msg)] });
        }
        return;
      }

      // Prevent self-kick / owner / higher role issues
      const invokerId = isSlash ? interaction!.user.id : message!.author.id;
      if (targetMember.id === invokerId) {
        const msg = "You cannot kick yourself.";
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
        const msg = "You cannot kick the server owner.";
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

      if (!targetMember.kickable) {
        const msg =
          "I cannot kick this user. They may have a higher role than me or be the server owner.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Cannot Kick", msg)],
            flags: [64],
          });
        else
          await message!.reply({ embeds: [Embeds.error("Cannot Kick", msg)] });
        return;
      }

      // Perform the kick
      try {
        await targetMember.kick(reason);

        const successText = `**${targetUserTag}** has been kicked.\n**Reason:** ${reason}`;
        if (isSlash) {
          await interaction!.reply({
            embeds: [Embeds.success("User Kicked", successText)],
            flags: [64],
          });
        } else {
          await message!.reply({
            embeds: [Embeds.success("User Kicked", successText)],
          });
        }

        // Moderation logging
        try {
          Logger.logWithContext(
            "MODERATION",
            `User ${targetUserTag} (${targetMember.id}) kicked by ${isSlash ? interaction!.user.tag : message!.author.tag} — reason: ${reason}`,
            "info",
          );
        } catch {}
      } catch (err: any) {
        Logger.error(`Kick failed for target ${targetMember.id}: ${err}`);
        const errMsg = `Failed to kick **${targetUserTag}**: ${err?.message ?? err}`;
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Kick Failed", errMsg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Kick Failed", errMsg)],
          });
      }
    } catch (error: any) {
      Logger.error(`Error in kick command: ${error}`);
      const replyPayload = {
        embeds: [
          Embeds.error(
            "Command Error",
            `An error occurred: ${error?.message ?? error}`,
          ),
        ],
      };
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ ...replyPayload, flags: [64] });
      } else if (message) {
        await message.reply(replyPayload);
      }
    }
  },
} as Command;
