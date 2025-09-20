import {
  Collection,
  REST,
  Routes,
  ApplicationCommandOptionType,
} from "discord.js";
import { Command } from "../types";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

export class CommandHandler {
  public commands: Collection<string, Command> = new Collection();
  public slashCommands: Collection<string, Command> = new Collection();
  private categories: Map<string, Command[]> = new Map();

  async loadCommands(clientId: string, token: string) {
    const commandsPath = path.join(__dirname, "../commands");
    const commandFiles = this.getCommandFiles(commandsPath);

    for (const file of commandFiles) {
      try {
        if (!file.endsWith(".js")) continue;

        const commandModule = await import(file);
        const command: Command = commandModule.default || commandModule;

        if (!command.name || !command.description) {
          Logger.warn(`Invalid command in ${file}`);
          continue;
        }

        this.commands.set(command.name, command);

        if (command.slashCommand !== false) {
          this.slashCommands.set(command.name, command);
        }

        // Categorize commands
        if (!this.categories.has(command.category)) {
          this.categories.set(command.category, []);
        }
        this.categories.get(command.category)?.push(command);

        Logger.info(`Loaded command: ${command.name}`);
      } catch (error) {
        Logger.error(`Error loading command ${file}: ${error}`);
      }
    }

    await this.registerSlashCommands(clientId, token);
    Logger.success(`Loaded ${this.commands.size} commands`);
  }

  private getCommandFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      Logger.warn(`Directory not found: ${dir}`);
      return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        files.push(...this.getCommandFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith(".js")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async registerSlashCommands(clientId: string, token: string) {
    const rest = new REST({ version: "10" }).setToken(token);

    // Build commands data with proper options
    const commandsData = [];

    // Add help command with autocomplete
    commandsData.push({
      name: "help",
      description: "Get help with bot commands",
      options: [
        {
          name: "command",
          description: "The command to get help for",
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
      ],
    });

    // Add poll command with all options
    commandsData.push({
      name: "poll",
      description: "Create an interactive poll with up to 6 options",
      options: [
        {
          name: "question",
          description: "The poll question",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "option1",
          description: "First option",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "option2",
          description: "Second option",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "option3",
          description: "Third option (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "option4",
          description: "Fourth option (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "option5",
          description: "Fifth option (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "option6",
          description: "Sixth option (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "anonymous",
          description: "Make poll anonymous (default: false)",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: "duration",
          description: "Poll duration in minutes (0 = no end, max 1440)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    });

    // Add endpoll command
    commandsData.push({
      name: "endpoll",
      description: "End a poll early and show results",
      options: [
        {
          name: "message_id",
          description:
            "The message ID of the poll to end (leave empty for help)",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "use_last",
          description: "End the most recent poll",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    });

    // Add testerror command
    commandsData.push({
      name: "testerror",
      description: "Test command to verify error handling (Owner only)",
      options: [
        {
          name: "error_type",
          description: "Type of error to test",
          type: 3,
          required: false,
          choices: [
            { name: "General Error", value: "general" },
            { name: "Reference Error", value: "reference" },
            { name: "Timeout Error", value: "timeout" },
          ],
        },
      ],
    });

    // Add other slash commands
    const otherCommands = Array.from(this.slashCommands.values())
      .filter(
        (cmd) =>
          cmd.name !== "help" &&
          cmd.name !== "poll" &&
          cmd.name !== "endpoll" &&
          cmd.name !== "testerror",
      )
      .map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: [],
      }));

    commandsData.push(...otherCommands);

    try {
      Logger.info("Started refreshing application (/) commands.");

      await rest.put(Routes.applicationCommands(clientId), {
        body: commandsData,
      });

      Logger.success("Successfully reloaded application (/) commands.");
    } catch (error) {
      Logger.error(`Error registering slash commands: ${error}`);
    }
  }

  getCategories(): Map<string, Command[]> {
    return this.categories;
  }

  getCategoryCommands(category: string): Command[] {
    return this.categories.get(category) || [];
  }

  getAllCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}
