import { ChatInputCommandInteraction, Message } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Helpers } from "../../utils/helpers";

export default {
  name: "serverinfo",
  description: "Get information about the server",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /serverinfo\nPrefix: .serverinfo",
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
  ) {
    const isSlashCommand = !!interaction;

    if (!isSlashCommand && !message?.guild) return;
    if (isSlashCommand && !interaction?.guild) return;

    const guild = isSlashCommand ? interaction!.guild! : message!.guild!;

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const roles = guild.roles.cache.size - 1; // Exclude @everyone

    // Convert verification level to string
    const verificationLevels: Record<number, string> = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High",
    };

    const embed = Embeds.info(
      "Server Information",
      `**Name:** ${guild.name}\n**ID:** ${guild.id}`,
    )
      .setThumbnail(guild.iconURL() || "")
      .addFields(
        { name: "Owner", value: `${owner.user.tag}`, inline: true },
        {
          name: "Members",
          value: `${Helpers.formatMemberCount(guild)}`,
          inline: true,
        },
        { name: "Channels", value: `${channels.size}`, inline: true },
        { name: "Roles", value: `${roles}`, inline: true },
        {
          name: "Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Verification Level",
          value: verificationLevels[guild.verificationLevel] || "Unknown",
          inline: true,
        },
      );

    if (isSlashCommand) {
      await interaction!.reply({ embeds: [embed] });
    } else {
      await message!.reply({ embeds: [embed] });
    }
  },
} as Command;
