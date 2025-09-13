import { ChatInputCommandInteraction, Message, EmbedBuilder } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import { config } from "../../config/config";

export default {
  name: "help",
  description: "Get help with bot commands",
  category: "info",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /help [command]\nPrefix: .help [command]",
  examples: ["/help", "/help poll"],
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
    commandHandler: any,
  ) {
    const isSlashCommand = !!interaction;
    const client = isSlashCommand ? interaction!.client : message!.client;

    if (!commandHandler) {
      const errorEmbed = Embeds.error(
        "Help Error",
        "Command handler not found.",
      );
      if (isSlashCommand) {
        return await interaction!.reply({
          embeds: [errorEmbed],
          flags: [64], // EPHEMERAL flag
        });
      } else {
        return await message!.reply({ embeds: [errorEmbed] });
      }
    }

    const commandName = isSlashCommand
      ? interaction!.options.getString("command")
      : args?.[0];

    // Handle single command help
    if (commandName) {
      const command = commandHandler.commands.get(commandName.toLowerCase());

      if (!command) {
        const errorEmbed = Embeds.error(
          "Command Not Found",
          `The command \`${commandName}\` does not exist.`,
        );
        if (isSlashCommand) {
          return await interaction!.reply({
            embeds: [errorEmbed],
            flags: [64],
          });
        } else {
          return await message!.reply({ embeds: [errorEmbed] });
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Command Help: ${command.name}`)
        .setDescription(command.description || "No description available.")
        .setColor("#5865F2")
        .addFields(
          {
            name: "🏷️ **Category**",
            value: `\`${command.category || "Uncategorized"}\``,
            inline: true,
          },
          {
            name: "⚡ **Usage**",
            value: `\`${command.usage || `/${command.name}`}\``,
            inline: true,
          },
          {
            name: "📝 **Command Types**",
            value: `**Slash Command:** ${command.slashCommand ? "✅" : "❌"}\n**Prefix Command:** ${command.prefixCommand ? "✅" : "❌"}`,
            inline: true,
          },
        );

      if (command.aliases && command.aliases.length > 0) {
        embed.addFields({
          name: "🔗 **Aliases**",
          value: command.aliases
            .map((alias: string) => `\`${alias}\``)
            .join(", "),
          inline: false,
        });
      }

      if (command.examples && command.examples.length > 0) {
        embed.addFields({
          name: "📝 **Examples**",
          value: command.examples
            .map((example: string) => `\`${example}\``)
            .join("\n"),
        });
      }

      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed], flags: [64] });
      } else {
        await message!.reply({ embeds: [embed] });
      }
      return;
    }

    // Handle main help menu with multiple embeds
    const categories = commandHandler.getCategories();
    const totalCommands = commandHandler.commands.size;
    const embedsToSend: EmbedBuilder[] = [];

    // Main embed containing all commands
    const mainEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🤖 **Kaoruko Bot Help**")
      .setDescription("A list of all my available commands:");

    // Add command categories as fields to the main embed
    for (const [category, commands] of categories) {
      const commandList = commands
        .map((cmd: any) => `\`${cmd.name}\``)
        .join(", ");
      mainEmbed.addFields({
        name: `📁 **${category.charAt(0).toUpperCase() + category.slice(1)}** (${commands.length})`,
        value: commandList,
        inline: false,
      });
    }

    // Embed for tips and footer
    const tipsEmbed = new EmbedBuilder()
      .setColor("#2F3136")
      .setDescription(
        `**💡 Use \`${config.prefix || "."}help <command>\` or \`/help [command]\` for more information on a specific command.**`,
      )
      .setFooter({
        text: `Total Commands: ${totalCommands}`,
        iconURL: client?.user?.displayAvatarURL(),
      });

    embedsToSend.push(mainEmbed, tipsEmbed);

    if (isSlashCommand) {
      await interaction!.reply({ embeds: embedsToSend, flags: [64] });
    } else {
      await message!.reply({ embeds: embedsToSend });
    }
  },
} as Command;
