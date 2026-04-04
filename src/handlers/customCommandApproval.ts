import { CustomCommandService } from "@services/CustomCommandService";
import { Logger } from "@utils/logger";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client, EmbedBuilder, type TextChannel } from "discord.js";
import type { ICustomCommand } from "@/models/CustomCommand";

export class CustomCommandApproval {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async sendForApproval(command: ICustomCommand): Promise<void> {
		const approvalChannelId = process.env.CUSTOM_COMMAND_APPROVAL_CHANNEL;
		if (!approvalChannelId) {
			Logger.warn("CUSTOM_COMMAND_APPROVAL_CHANNEL not set. Code command will be auto-approved.");
			await CustomCommandService.approveCommand(command._id.toString(), "system");
			return;
		}

		const channel = await this.client.channels.fetch(approvalChannelId).catch(() => null);
		if (!channel || !channel.isTextBased()) {
			Logger.warn(`Approval channel ${approvalChannelId} not found. Code command will be auto-approved.`);
			await CustomCommandService.approveCommand(command._id.toString(), "system");
			return;
		}

		const creator = await this.client.users.fetch(command.createdBy).catch(() => null);
		const creatorTag = creator?.tag || command.createdBy;

		const guild = await this.client.guilds.fetch(command.guildId).catch(() => null);
		const guildName = guild?.name || command.guildId;

		const codeBlock = command.code?.source || "No code";
		const truncatedCode = codeBlock.length > 3500 ? `${codeBlock.slice(0, 3500)}\n\n... (truncated)` : codeBlock;

		const embed = new EmbedBuilder()
			.setTitle("Custom Command Code Approval")
			.setColor("#FFA500")
			.addFields(
				{ name: "Command", value: `\`${command.name}\``, inline: true },
				{ name: "Guild", value: guildName, inline: true },
				{ name: "Created By", value: creatorTag, inline: true },
				{ name: "Type", value: command.type, inline: true },
				{ name: "Trigger", value: `\`${command.triggerType}\`: \`${command.trigger}\``, inline: true },
				{ name: "Aliases", value: command.aliases.length > 0 ? command.aliases.map((a) => `\`${a}\``).join(", ") : "None", inline: true },
				{ name: "Code", value: `\`\`\`javascript\n${truncatedCode}\n\`\`\`` },
			)
			.setTimestamp();

		if (command.response?.content) {
			embed.addFields({ name: "Response", value: command.response.content.slice(0, 1000), inline: false });
		}

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`cc_appro_${command._id.toString()}`)
				.setLabel("Approve")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`cc_reject_${command._id.toString()}`)
				.setLabel("Reject")
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(`cc_reject_reason_${command._id.toString()}`)
				.setLabel("Reject with Reason")
				.setStyle(ButtonStyle.Secondary),
		);

		try {
			const message = await (channel as TextChannel).send({
				embeds: [embed],
				components: [row],
			});

			await CustomCommandService.updateApprovalMessage(command._id.toString(), message.id);

			if (creator) {
				await creator.send({
					embeds: [
						new EmbedBuilder()
							.setTitle("Custom Command Pending Approval")
							.setColor("#FFA500")
							.setDescription(`Your custom command \`${command.name}\` in **${guildName}** has been submitted for review. An administrator will review the code and approve or reject it.`)
							.setTimestamp(),
					],
				}).catch(() => {});
			}
		} catch (error) {
			Logger.error(`Failed to send approval request for command "${command.name}": ${error}`);
		}
	}

	async handleApprovalInteraction(interaction: any): Promise<void> {
		const customId = interaction.customId;

		if (customId.startsWith("cc_appro_")) {
			const commandId = customId.replace("cc_appro_", "");
			await this.handleApprove(interaction, commandId);
		} else if (customId.startsWith("cc_reject_reason_")) {
			const commandId = customId.replace("cc_reject_reason_", "");
			await this.handleRejectWithReason(interaction, commandId);
		} else if (customId.startsWith("cc_reject_")) {
			const commandId = customId.replace("cc_reject_", "");
			await this.handleReject(interaction, commandId);
		}
	}

	private async handleApprove(interaction: any, commandId: string): Promise<void> {
		const command = await CustomCommandService.findById(commandId);
		if (!command) {
			await interaction.reply({ content: "Command not found.", ephemeral: true });
			return;
		}

		await CustomCommandService.approveCommand(commandId, interaction.user.id);

		const embed = new EmbedBuilder()
			.setTitle("Custom Command Approved")
			.setColor("#00FF00")
			.setDescription(`Command \`${command.name}\` has been approved and is now active.`)
			.addFields(
				{ name: "Guild", value: command.guildId, inline: true },
				{ name: "Approved By", value: interaction.user.tag, inline: true },
			)
			.setTimestamp();

		await interaction.update({ embeds: [embed], components: [] });

		const creator = await this.client.users.fetch(command.createdBy).catch(() => null);
		if (creator) {
			const guild = await this.client.guilds.fetch(command.guildId).catch(() => null);
			await creator.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("Custom Command Approved")
						.setColor("#00FF00")
						.setDescription(`Your custom command \`${command.name}\` in **${guild?.name || command.guildId}** has been approved and is now active!`)
						.setTimestamp(),
				],
			}).catch(() => {});
		}
	}

	private async handleReject(interaction: any, commandId: string): Promise<void> {
		await this.handleRejectWithReason(interaction, commandId);
	}

	private async handleRejectWithReason(interaction: any, commandId: string): Promise<void> {
		const command = await CustomCommandService.findById(commandId);
		if (!command) {
			await interaction.reply({ content: "Command not found.", ephemeral: true });
			return;
		}

		const modal = {
			title: "Reject Custom Command",
			custom_id: `cc_reject_modal_${commandId}`,
			components: [
				{
					type: 1,
					components: [
						{
							type: 4,
							custom_id: "rejection_reason",
							label: "Rejection Reason",
							style: 2,
							placeholder: "Explain why this command was rejected...",
							min_length: 10,
							max_length: 500,
							required: true,
						},
					],
				},
			],
		};

		await interaction.showModal(modal);
	}

	async handleRejectModal(interaction: any): Promise<void> {
		const commandId = interaction.customId.replace("cc_reject_modal_", "");
		const reason = interaction.fields.getTextInputValue("rejection_reason");

		const command = await CustomCommandService.findById(commandId);
		if (!command) {
			await interaction.reply({ content: "Command not found.", ephemeral: true });
			return;
		}

		await CustomCommandService.rejectCommand(commandId, reason);

		const embed = new EmbedBuilder()
			.setTitle("Custom Command Rejected")
			.setColor("#FF0000")
			.setDescription(`Command \`${command.name}\` has been rejected.`)
			.addFields(
				{ name: "Guild", value: command.guildId, inline: true },
				{ name: "Rejected By", value: interaction.user.tag, inline: true },
				{ name: "Reason", value: reason },
			)
			.setTimestamp();

		await interaction.update({ embeds: [embed], components: [] });

		const creator = await this.client.users.fetch(command.createdBy).catch(() => null);
		if (creator) {
			const guild = await this.client.guilds.fetch(command.guildId).catch(() => null);
			await creator.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("Custom Command Rejected")
						.setColor("#FF0000")
						.setDescription(`Your custom command \`${command.name}\` in **${guild?.name || command.guildId}** has been rejected.`)
						.addFields({ name: "Reason", value: reason })
						.setTimestamp(),
				],
			}).catch(() => {});
		}
	}

	startListening(): void {
		this.client.on("interactionCreate", async (interaction: any) => {
			if (interaction.customId.startsWith("cc_appro_") || interaction.customId.startsWith("cc_reject_")) {
				try {
					await this.handleApprovalInteraction(interaction);
				} catch (error) {
					Logger.error(`Error handling custom command approval interaction: ${error}`);
				}
			}

			if (interaction.isModalSubmit() && interaction.customId.startsWith("cc_reject_modal_")) {
				try {
					await this.handleRejectModal(interaction);
				} catch (error) {
					Logger.error(`Error handling custom command rejection modal: ${error}`);
				}
			}
		});
	}
}
