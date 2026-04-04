import type { CustomCommandHandler } from "@handlers/customCommandHandler";
import { CustomCommandService } from "@services/CustomCommandService";
import { Embeds } from "@utils/embeds";
import { Logger } from "@utils/logger";
import type { Client, GuildMember } from "discord.js";

export class CustomCommandEventHandlers {
	private client: Client;
	private customCommandHandler: CustomCommandHandler;

	constructor(client: Client, customCommandHandler: CustomCommandHandler) {
		this.client = client;
		this.customCommandHandler = customCommandHandler;
	}

	async handleMemberJoin(member: GuildMember): Promise<void> {
		if (!member.guild) return;

		const guildId = member.guild.id;

		await this.customCommandHandler.handleEvent("member_join", guildId, {
			member,
			guild: member.guild,
			user: member.user,
			channel: null,
		});

		const welcomeCommands = await CustomCommandService.findEventCommands(guildId, "member_join");
		const welcomeChannelId = welcomeCommands[0]?.response?.content?.match(/<#(\d+)>/)?.[1];

		if (welcomeChannelId) {
			const channel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
			if (channel && channel.isTextBased()) {
				const welcomeCommand = welcomeCommands[0];
				if (welcomeCommand?.response) {
					const response = welcomeCommand.response;
					let content = response.content || "";
					content = content
						.replace(/{user}/g, member.user.username)
						.replace(/{user.mention}/g, `<@${member.id}>`)
						.replace(/{member}/g, member.displayName)
						.replace(/{guild}/g, member.guild.name)
						.replace(/{guild.memberCount}/g, String(member.guild.memberCount));

					if (response.type === "embed") {
						const embed = Embeds.info(
							response.embedTitle?.replace(/{user}/g, member.user.username).replace(/{member}/g, member.displayName) || "Welcome!",
							response.embedDescription?.replace(/{user}/g, member.user.username).replace(/{member}/g, member.displayName) || "",
						);
						if (response.embedColor) embed.setColor(response.embedColor as any);
						if (response.embedThumbnail) embed.setThumbnail(response.embedThumbnail);
						if (response.embedImage) embed.setImage(response.embedImage);
						await channel.send({ content, embeds: [embed] });
					} else {
						await channel.send(content);
					}
				}
			}
		}
	}

	async handleMemberLeave(member: GuildMember | { user: { id: string; username: string; tag: string }; guild: { id: string; name: string } }): Promise<void> {
		if (!member.guild) return;

		const guildId = member.guild.id;

		await this.customCommandHandler.handleEvent("member_leave", guildId, {
			member,
			guild: member.guild,
			user: member.user,
			channel: null,
		});
	}

	startListening(): void {
		this.client.on("guildMemberAdd", async (member) => {
			try {
				await this.handleMemberJoin(member);
			} catch (error) {
				Logger.error(`Error handling guildMemberAdd for custom commands: ${error}`);
			}
		});

		this.client.on("guildMemberRemove", async (member) => {
			try {
				await this.handleMemberLeave(member);
			} catch (error) {
				Logger.error(`Error handling guildMemberRemove for custom commands: ${error}`);
			}
		});
	}
}
