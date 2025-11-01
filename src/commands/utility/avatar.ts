import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  User,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "avatar",
  description: "Get a user's avatar",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /avatar [user]\nPrefix: .avatar [@user]",
  examples: [
    "/avatar",
    "/avatar user:@user",
    ".avatar",
    ".avatar @user",
    ".avatar 123456789012345678",
  ],

  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get a user's avatar")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose avatar you want to see")
        .setRequired(false),
    ),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
  ) {
    try {
      const isSlashCommand = !!interaction;
      const client = isSlashCommand ? interaction.client : message?.client;
      const executor = isSlashCommand ? interaction.user : message?.author;
      let user: User | null = null;

      if (!client || !executor) return;

      if (isSlashCommand && interaction) {
        // Get user from slash command option or default to command executor
        user = interaction.options.getUser("user") || interaction.user;
      } else if (message) {
        // Handle prefix command
        if (args && args.length > 0) {
          // Try to get user from mention, ID, or username
          const userInput = args[0];

          // Check if it's a mention
          const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
          if (mentionMatch) {
            try {
              user = await client.users.fetch(mentionMatch[1]);
            } catch {
              user = null;
            }
          } else if (/^\d+$/.test(userInput)) {
            // Check if it's a user ID
            try {
              user = await client.users.fetch(userInput);
            } catch {
              user = null;
            }
          } else {
            // Try to find by username in the guild
            if (message.guild) {
              const member = message.guild.members.cache.find(
                (m) =>
                  m.user.username.toLowerCase() === userInput.toLowerCase() ||
                  m.displayName.toLowerCase() === userInput.toLowerCase(),
              );
              user = member?.user || null;
            }
          }
        } else {
          // No arguments provided, use message author
          user = message.author;
        }
      }

      if (!user) {
        const errorEmbed = Embeds.error(
          "User Not Found",
          "Could not find the specified user. Please check the username, mention, or ID.",
        );

        if (isSlashCommand) {
          await interaction!.reply({ embeds: [errorEmbed], flags: [64] });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Create avatar embed
      const embed = new EmbedBuilder()
        .setTitle(`${user.displayName || user.username}'s Avatar`)
        .setColor("#5865F2")
        .setImage(user.displayAvatarURL({ size: 512, extension: "png" }))
        .setTimestamp()
        .addFields(
          {
            name: "Username",
            value: `${user.username}#${user.discriminator}`,
            inline: true,
          },
          {
            name: "User ID",
            value: user.id,
            inline: true,
          },
          {
            name: "Avatar Links",
            value: [
              `[PNG](${user.displayAvatarURL({ extension: "png", size: 512 })})`,
              `[JPEG](${user.displayAvatarURL({ extension: "jpeg", size: 512 })})`,
              `[WEBP](${user.displayAvatarURL({ extension: "webp", size: 512 })})`,
            ].join(" • "),
            inline: false,
          },
        )
        .setFooter({
          text: `Requested by ${executor.username}`,
          iconURL: executor.displayAvatarURL(),
        });

      // Check if user has a custom avatar (not default)
      if (user.avatar) {
        embed.setDescription("🖼️ Custom avatar");
      } else {
        embed.setDescription("🤖 Default Discord avatar");
      }

      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in avatar command:", error);

      const errorEmbed = Embeds.error(
        "Command Error",
        "An error occurred while fetching the avatar. Please try again.",
      );

      if (interaction) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], flags: [64] });
        }
      } else if (message) {
        await message.reply({ embeds: [errorEmbed] });
      }
    }
  },
};
