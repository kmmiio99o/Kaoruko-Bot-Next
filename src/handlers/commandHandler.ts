import { commands } from "@manifest";
import { Logger } from "@utils/logger";
import { Collection, REST, Routes } from "discord.js";
import type { ICommand } from "@/types/Command";

export class CommandHandler {
	public commands: Collection<string, ICommand> = new Collection();
	public slashCommands: Collection<string, ICommand> = new Collection();
	private categories: Map<string, ICommand[]> = new Map();

	async loadCommands(clientId: string, token: string) {
		for (const entry of commands) {
			try {
				const commandModule = await entry.module;
				const command: ICommand =
					(commandModule as any).command || (commandModule as any).default;

				if (!command || !command.name || !command.description) {
					Logger.warn(
						`Invalid command in ${entry.path} - missing name, description, or proper export`,
					);
					continue;
				}

				this.commands.set(command.name, command);

				if (command.slashCommand !== false) {
					this.slashCommands.set(command.name, command);
				}

				const category = command.category || "Uncategorized";
				if (!this.categories.has(category)) {
					this.categories.set(category, []);
				}
				this.categories.get(category)?.push(command);

				Logger.info(`Loaded command: ${command.name}`);
			} catch (error) {
				Logger.error(`Error loading command ${entry.path}: ${error}`);
			}
		}

		await this.registerSlashCommands(clientId, token);
		Logger.success(`Loaded ${this.commands.size} commands`);
	}

	private async registerSlashCommands(clientId: string, token: string) {
		const rest = new REST({ version: "10" }).setToken(token);

		const commandsData = [];

		for (const command of this.slashCommands.values()) {
			try {
				if (command.data && typeof command.data.toJSON === "function") {
					commandsData.push(command.data.toJSON());
				} else {
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
