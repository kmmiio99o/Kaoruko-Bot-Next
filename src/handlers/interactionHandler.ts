import { Embeds } from "@utils/embeds";
import { Logger } from "@utils/logger";
import type { ChatInputCommandInteraction, Client } from "discord.js";
import type { CommandHandler } from "./commandHandler";

export class InteractionHandler {
	constructor(private commandHandler: CommandHandler) {}

	async handleInteraction(
		interaction: ChatInputCommandInteraction,
		client: Client,
	) {
		if (!interaction.isChatInputCommand()) return;

		const command = this.commandHandler.commands.get(interaction.commandName);

		if (!command) {
			await interaction.reply({
				embeds: [
					Embeds.error("Command Not Found", "This command does not exist."),
				],
				flags: [64],
			});
			return;
		}

		try {
			await command.run(interaction);
		} catch (error) {
			Logger.error(`Error executing command ${command.name}: ${error}`);

			const replyOptions = {
				embeds: [
					Embeds.error(
						"Command Error",
						"An error occurred while executing this command.",
					),
				],
				flags: [64],
			};

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(replyOptions);
			} else {
				await interaction.reply(replyOptions);
			}
		}
	}
}
