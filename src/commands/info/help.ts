import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "help",
  description: "Get help for commands",
  category: "info",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /help [command]\nPrefix: .help [command]",
  examples: ["/help", "/help poll"],

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help for commands")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Get help for a specific command")
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
    commandHandler?: any,
  ) {
    const isSlashCommand = !!interaction;
    const client = isSlashCommand ? interaction!.client : message!.client;

    if (!commandHandler) {
      const errorEmbed = Embeds.error(
        "Command Handler Error",
        "Command handler is not available.",
      );
      if (isSlashCommand) {
        await interaction!.reply({ embeds: [errorEmbed], ephemeral: true });
      } else if (message) {
        await message.reply({ embeds: [errorEmbed] });
      }
      return;
    }

    let commandName: string | null = null;

    if (isSlashCommand) {
      commandName = interaction!.options.getString("command");
    } else if (args && args.length > 0) {
      commandName = args[0];
    }

    if (commandName) {
      // Show help for specific command
      const command = commandHandler.commands.get(commandName);
      if (!command) {
        const embed = Embeds.error(
          "Command Not Found",
          `The command \`${commandName}\` was not found.`,
        );
        if (isSlashCommand) {
          await interaction!.reply({ embeds: [embed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [embed] });
        }
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Help: ${command.name}`)
        .setDescription(command.description || "No description available")
        .setColor("#5865F2")
        .setTimestamp();

      if (command.usage) {
        embed.addFields({
          name: "Usage",
          value: `\`\`\`${command.usage}\`\`\``,
        });
      }

      if (command.examples) {
        embed.addFields({
          name: "Examples",
          value: command.examples.map((ex: string) => `\`${ex}\``).join("\n"),
        });
      }

      if (command.category) {
        embed.addFields({
          name: "Category",
          value: command.category,
          inline: true,
        });
      }

      if (command.permissions && command.permissions.length > 0) {
        embed.addFields({
          name: "Required Permissions",
          value: command.permissions.join(", "),
          inline: true,
        });
      }

      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    } else {
      // Show general help
      const commands = Array.from(commandHandler.commands.values());
      const categories: { [key: string]: any[] } = {};

      commands.forEach((cmd: any) => {
        const category = cmd.category || "Other";
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(cmd);
      });

      const embed = new EmbedBuilder()
        .setTitle(`${client.user?.username} Help`)
        .setDescription(
          "Here are all available commands. Use `/help <command>` for detailed information about a specific command.",
        )
        .setColor("#5865F2")
        .setTimestamp()
        .setThumbnail(client.user?.displayAvatarURL() || null);

      Object.keys(categories).forEach((category) => {
        const categoryCommands = categories[category];
        const commandList = categoryCommands
          .map((cmd) => `\`${cmd.name}\``)
          .join(", ");

        embed.addFields({
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryCommands.length})`,
          value: commandList || "No commands",
          inline: false,
        });
      });

      embed.addFields({
        name: "Links",
        value:
          "[Support Server](https://discord.gg/cYZPfXcBGB) | [Invite Bot](https://discord.com/oauth2/authorize?client_id=1398003581512056854&permissions=1101726338055&integration_type=0&scope=bot)",
        inline: false,
      });

      if (isSlashCommand) {
        await interaction!.reply({ embeds: [embed] });
      } else if (message) {
        await message.reply({ embeds: [embed] });
      }
    }
  },
};
