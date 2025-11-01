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
  name: "ban",
  description: "Ban a user from the server",
  category: "moderation",
  permissions: [PermissionFlagsBits.BanMembers],
  slashCommand: true,
  prefixCommand: true,
  usage: "/ban <user> [reason] or .ban <user> [reason]",
  examples: ["/ban @user spamming", ".ban @user spamming"],
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to ban").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false),
    ),
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      const isSlash = !!interaction;

      // Ensure guild context
      const guild = (interaction?.guild ?? message?.guild) as any;
      if (!guild) {
        if (isSlash) {
          await interaction!.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command can only be used inside a server.",
              ),
            ],
            flags: [64],
          });
        } else {
          await message!.reply({
            embeds: [
              Embeds.error(
                "Invalid Context",
                "This command can only be used inside a server.",
              ),
            ],
          });
        }
        return;
      }

      // Permissions check
      const hasBanPerm = isSlash
        ? interaction!.memberPermissions?.has(PermissionFlagsBits.BanMembers)
        : message!.member?.permissions.has(PermissionFlagsBits.BanMembers);

      if (!hasBanPerm) {
        const reply = {
          embeds: [
            Embeds.error(
              "Permission Denied",
              "You need the **Ban Members** permission to use this command.",
            ),
          ],
        } as any;
        if (isSlash) {
          await interaction!.reply({ ...reply, flags: [64] });
        } else {
          await message!.reply(reply);
        }
        return;
      }

      // Resolve target user id and reason
      let targetId: string | undefined;
      let reason = "No reason provided";
      let invokerTag = isSlash ? interaction!.user.tag : message!.author.tag;

      if (isSlash) {
        const user = interaction!.options.getUser("user", true);
        targetId = user.id;
        reason = interaction!.options.getString("reason") ?? reason;
      } else {
        if (!args || args.length === 0) {
          await message!.reply({
            embeds: [
              Embeds.error("Invalid Usage", "Usage: `.ban <user> [reason]`"),
            ],
          });
          return;
        }
        targetId = args[0].replace(/[<@!>]/g, "");
        reason = args.slice(1).join(" ") || reason;
      }

      if (!targetId) {
        const reply = {
          embeds: [
            Embeds.error("Invalid User", "Please specify a valid user to ban."),
          ],
        } as any;
        if (isSlash) await interaction!.reply({ ...reply, flags: [64] });
        else await message!.reply(reply);
        return;
      }

      // Attempt to fetch member for additional checks/logging (may be null if user not in guild)
      let targetMember = null;
      try {
        targetMember = await guild.members.fetch(targetId);
      } catch {
        targetMember = null;
      }

      // Prevent banning server owner or self
      const invokerId = isSlash ? interaction!.user.id : message!.author.id;
      if (targetMember && targetMember.id === guild.ownerId) {
        const msg = "You cannot ban the server owner.";
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
      if (targetId === invokerId) {
        const msg = "You cannot ban yourself.";
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

      // If member exists, check if bot can ban them
      if (targetMember && !targetMember.bannable) {
        const msg =
          "I cannot ban this user; they may have a higher role than me or be the server owner.";
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Cannot Ban", msg)],
            flags: [64],
          });
        else
          await message!.reply({ embeds: [Embeds.error("Cannot Ban", msg)] });
        return;
      }

      // Perform ban (works with users not present in guild too)
      try {
        await guild.members.ban(targetId, { reason });

        const displayTag = (targetMember && targetMember.user?.tag) || targetId;
        const success = `**${displayTag}** has been banned.\n**Reason:** ${reason}`;
        if (isSlash) {
          await interaction!.reply({
            embeds: [Embeds.success("User Banned", success)],
            flags: [64],
          });
        } else {
          await message!.reply({
            embeds: [Embeds.success("User Banned", success)],
          });
        }

        try {
          Logger.logWithContext(
            "MODERATION",
            `User ${displayTag} (${targetId}) banned by ${invokerTag} — reason: ${reason}`,
            "info",
          );
        } catch {}
      } catch (err: any) {
        Logger.error(`Ban failed for ${targetId}: ${err}`);
        const errMsg = `Failed to ban **${targetId}**: ${err?.message ?? err}`;
        if (isSlash)
          await interaction!.reply({
            embeds: [Embeds.error("Ban Failed", errMsg)],
            flags: [64],
          });
        else
          await message!.reply({
            embeds: [Embeds.error("Ban Failed", errMsg)],
          });
      }
    } catch (error: any) {
      Logger.error(`Error in ban command: ${error}`);
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
