import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "invite",
  description: "Get the bot's invite link",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /invite\nPrefix: .invite",

  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the bot's invite link"),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
  ) {
    try {
      const isSlashCommand = !!interaction;
      const client = isSlashCommand ? interaction!.client : message!.client;

      if (!client.user) {
        const errorEmbed = Embeds.error(
          "Bot Error",
          "Unable to get bot information. Please try again later.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Generate invite link with comprehensive permissions
      const inviteURL = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

      // Generate minimal permissions invite link
      const minimalInviteURL = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=2147483647&scope=bot%20applications.commands`;

      const embed = new EmbedBuilder()
        .setTitle("🎭 Invite Kaoruko Bot")
        .setDescription(
          `Thank you for your interest in adding **${client.user.username}** to your server!`,
        )
        .setColor("#5865F2")
        .setTimestamp()
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "🔗 Full Permissions (Recommended)",
            value: `[**Click here to invite with all permissions**](${inviteURL})`,
            inline: false,
          },
          {
            name: "⚡ Standard Permissions",
            value: `[**Click here for standard invite**](${minimalInviteURL})`,
            inline: false,
          },
          {
            name: "📋 What permissions do I need?",
            value: [
              "• **Administrator** - For full functionality",
              "• **Manage Channels** - For ticket system",
              "• **Manage Messages** - For moderation",
              "• **Send Messages** - Basic functionality",
              "• **Embed Links** - Rich embeds",
              "• **Use Slash Commands** - Modern commands",
            ].join("\n"),
            inline: false,
          },
          {
            name: "✨ Key Features",
            value: [
              "🎫 Advanced ticket system",
              "🛡️ Moderation tools",
              "🎪 Fun commands",
              "⚙️ Comprehensive configuration",
              "📊 Polls and utilities",
              "🔧 Custom commands",
            ].join("\n"),
            inline: false,
          },
          {
            name: "🆘 Need Help?",
            value: [
              "[Support Server](https://discord.gg/support)",
              "[Documentation](https://docs.example.com)",
              "[GitHub](https://github.com/example/kaoruko-bot)",
            ].join(" • "),
            inline: false,
          },
        )
        .setFooter({
          text: `${client.user.username} • Made with ❤️`,
          iconURL: client.user.displayAvatarURL(),
        });

      if (isSlashCommand && interaction) {
        await interaction.reply({ embeds: [embed] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in invite command:", error);

      const errorEmbed = Embeds.error(
        "Command Error",
        "An error occurred while generating the invite link. Please try again.",
      );

      if (interaction) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } else if (message) {
        await message.reply({ embeds: [errorEmbed] });
      }
    }
  },
};
