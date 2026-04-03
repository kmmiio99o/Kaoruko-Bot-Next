import {
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import type { ICommand } from "@/types/Command";

export const command: ICommand = {
	name: "ticket",
	description: "Manage tickets",
	category: "Tickets",
	permissions: [PermissionFlagsBits.ManageMessages],
	cooldown: 5,
	slashCommand: true,
	guildOnly: true,

	data: new SlashCommandBuilder()
		.setName("ticket")
		.setDescription("Manage tickets")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

	async run(interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			default:
				await interaction.reply({
					content: "Unknown subcommand",
					flags: [64],
				});
		}
	},
};
