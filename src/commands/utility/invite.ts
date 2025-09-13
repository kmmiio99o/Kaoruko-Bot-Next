import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Message,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";

export default {
  name: "invite",
  description: "Create an invite link for the server",
  category: "utility",
  permissions: [PermissionFlagsBits.CreateInstantInvite],
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /invite\nPrefix: .invite",
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
  ) {
    const isSlashCommand = !!interaction;

    if (!isSlashCommand && (!message?.channel || !message?.guild)) return;
    if (isSlashCommand && (!interaction?.channel || !interaction?.guild))
      return;

    const channel = isSlashCommand ? interaction!.channel : message!.channel;
    const executor = isSlashCommand ? interaction!.user : message!.author;

    // Check if channel supports invites
    const channelWithInvite = channel as any;
    if (typeof channelWithInvite.createInvite !== "function") {
      const embed = Embeds.error(
        "Invalid Channel",
        "Cannot create invites in this type of channel.",
      );
      if (isSlashCommand) {
        return await interaction!.reply({ embeds: [embed], flags: [64] });
      } else {
        return await message!.reply({ embeds: [embed] });
      }
    }

    try {
      const invite = await channelWithInvite.createInvite({
        maxAge: 86400, // 24 hours
        maxUses: 10,
        reason: `Invite created by ${executor.tag}`,
      });

      const embed = Embeds.success(
        "Server Invite",
        `Here's your invite link:\n**${invite.url}**\n\nExpires in 24 hours or after 10 uses.`,
      );

      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed] });
      } else {
        await message!.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = Embeds.error(
        "Invite Creation Failed",
        "Failed to create invite link.",
      );
      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed], flags: [64] });
      } else {
        await message!.reply({ embeds: [embed] });
      }
    }
  },
} as Command;
