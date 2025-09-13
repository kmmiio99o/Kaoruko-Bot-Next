import { ChatInputCommandInteraction, Message, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import axios from "axios";

export default {
  name: "avatar",
  description: "Get a user's avatar",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /avatar [user:<user>]\nPrefix: .avatar [@user | <user_id>]",
  examples: [
    "/avatar",
    "/avatar user:@user",
    ".avatar",
    ".avatar @user",
    ".avatar 123456789012345678",
  ],
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      const isSlashCommand = !!interaction;
      const client = isSlashCommand ? interaction.client : message?.client;
      const executor = isSlashCommand ? interaction.user : message?.author;
      let user = null;

      if (!client || !executor) {
        Logger.logWithContext(
          "AVATAR",
          "Missing client or executor context",
          "error",
        );
        return;
      }

      if (isSlashCommand) {
        user = interaction.options.getUser("user") || interaction.user;
      } else if (message && args) {
        if (args[0]) {
          const userId = args[0].replace(/[<@!>]/g, ""); // Remove mention characters
          user = await client.users.fetch(userId).catch(() => null);
        }
        user = user || message.author;
      }

      if (!user) {
        Logger.logWithContext("AVATAR", `User not found for query`, "warn");
        const embed = Embeds.error(
          "User Not Found",
          "Could not find a user with that ID or mention.",
        );
        if (isSlashCommand) {
          return await interaction!.reply({ embeds: [embed], flags: [64] });
        } else {
          return await message!.reply({ embeds: [embed] });
        }
      }

      Logger.logWithContext(
        "AVATAR",
        `Getting avatar for user ${user.tag}`,
        "info",
      );

      let avatarURL = user.displayAvatarURL({
        size: 4096,
        extension: "png",
        forceStatic: false,
      });

      // Try UserPFP first
      let descriptionText = ` `;
      try {
        const response = await axios.get(
          "https://userpfp.github.io/UserPFP/source/data.json",
        );
        if (response.data.avatars[user.id]) {
          avatarURL = response.data.avatars[user.id];
          descriptionText = `Powered by [UserPFP](https://userpfp.github.io/UserPFP/)`;
        }
      } catch (error: any) {
        Logger.logWithContext(
          "AVATAR",
          `[UserPFP] Fallback for ${user.id}: ${error.message}`,
          "warn",
        );
      }

      const embed = new EmbedBuilder()
        .setColor("#2F3136")
        .setTitle(`${user.tag}'s Avatar`)
        .setDescription(descriptionText)
        .setImage(avatarURL)
        .addFields(
          {
            name: "PNG",
            value: `[Link](${user.displayAvatarURL({
              extension: "png",
              size: 4096,
            })})`,
            inline: true,
          },
          {
            name: "JPG",
            value: `[Link](${user.displayAvatarURL({
              extension: "jpg",
              size: 4096,
            })})`,
            inline: true,
          },
          {
            name: "WEBP",
            value: `[Link](${user.displayAvatarURL({
              extension: "webp",
              size: 4096,
            })})`,
            inline: true,
          },
        )
        .setTimestamp();

      if (isSlashCommand) {
        await interaction.reply({ embeds: [embed] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }

      Logger.logWithContext(
        "AVATAR",
        `Sent avatar embed for user ${user.tag}`,
        "success",
      );
    } catch (error) {
      Logger.logWithContext(
        "AVATAR",
        `Error getting avatar: ${error}`,
        "error",
      );
      const embed = Embeds.error(
        "Avatar Error",
        "An unexpected error occurred while fetching the avatar.",
      );
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], flags: [64] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    }
  },
} as Command;
