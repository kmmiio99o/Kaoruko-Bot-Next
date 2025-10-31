import {
  Collection,
  REST,
  Routes,
  ApplicationCommandOptionType,
} from "discord.js";
import { ICommand } from "../types/Command";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

export class CommandHandler {
  public commands: Collection<string, ICommand> = new Collection();
  public slashCommands: Collection<string, ICommand> = new Collection();
  private categories: Map<string, ICommand[]> = new Map();

  async loadCommands(clientId: string, token: string) {
    const commandsPath = path.join(__dirname, "../commands");
    const commandFiles = this.getCommandFiles(commandsPath);

    for (const file of commandFiles) {
      try {
        if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;

        const commandModule = await import(file);
        const command: ICommand =
          commandModule.command || commandModule.default;

        if (!command || !command.name || !command.description) {
          Logger.warn(
            `Invalid command in ${file} - missing name, description, or proper export`,
          );
          continue;
        }

        this.commands.set(command.name, command);

        if (command.slashCommand !== false) {
          this.slashCommands.set(command.name, command);
        }

        // Categorize commands
        const category = command.category || "Uncategorized";
        if (!this.categories.has(category)) {
          this.categories.set(category, []);
        }
        this.categories.get(category)?.push(command);

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
      } else if (
        item.isFile() &&
        (item.name.endsWith(".js") || item.name.endsWith(".ts"))
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async registerSlashCommands(clientId: string, token: string) {
    const rest = new REST({ version: "10" }).setToken(token);

    // Build commands data from loaded commands
    const commandsData = [];

    // Process all slash commands
    for (const command of this.slashCommands.values()) {
      try {
        if (command.data && typeof command.data.toJSON === "function") {
          // Use the SlashCommandBuilder data if available
          commandsData.push(command.data.toJSON());
        } else {
          // Fallback to basic command structure
          commandsData.push({
            name: command.name,
            description: command.description,
            options: [],
          });
        }
        Logger.info(`Registered slash command: ${command.name}`);
      } catch (error) {
        Logger.error(
          `Error processing command ${command.name} for registration: ${error}`,
        );
      }
    }

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

  getCategories(): Map<string, ICommand[]> {
    return this.categories;
  }

  getCategoryCommands(category: string): ICommand[] {
    return this.categories.get(category) || [];
  }

  getAllCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  getAllCommands(): ICommand[] {
    return Array.from(this.commands.values());
  }
}
