import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Helpers } from "../../utils/helpers";

export default {
  name: "userinfo",
  description: "Get information about a user",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage:
    "Slash: /userinfo [user:<user>]\nPrefix: .userinfo [@user | <user_id>]",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get information about.")
        .setRequired(false),
    ),
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    const isSlashCommand = !!interaction;
    const client = isSlashCommand ? interaction!.client : message!.client;

    let user;
    if (isSlashCommand) {
      user = interaction!.options.getUser("user") || interaction!.user;
    } else {
      const targetUser = args?.[0];
      if (targetUser) {
        const userId = targetUser.replace(/[<@!>]/g, "");
        user = await client.users.fetch(userId).catch(() => null);
      }
      user = user || message!.author;
    }

    if (!user) {
      await (isSlashCommand
        ? interaction!.reply({ content: "User not found.", ephemeral: true })
        : message!.reply("User not found."));
      return;
    }

    const member =
      isSlashCommand && interaction!.guild
        ? await interaction!.guild.members.fetch(user.id)
        : message?.guild
          ? await message.guild.members.fetch(user.id)
          : null;

    const embed = Embeds.info(
      "User Information",
      `**Username:** ${user.tag}\n**ID:** ${user.id}`,
    )
      .setThumbnail(user.displayAvatarURL())
      .addFields({
        name: "Account Created",
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
        inline: true,
      });

    if (member && member.joinedTimestamp) {
      embed.addFields(
        {
          name: "Joined Server",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Roles",
          value: `${member.roles.cache.size - 1}`,
          inline: true,
        },
      );
    }

    if (isSlashCommand) {
      await interaction!.reply({ embeds: [embed] });
    } else {
      await message!.reply({ embeds: [embed] });
    }
  },
} as Command;
