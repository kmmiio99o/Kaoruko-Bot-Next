import { CustomCommandService } from "@services/CustomCommandService";
import { Embeds } from "@utils/embeds";
import { Logger } from "@utils/logger";
import { type SandboxContext, SandboxExecutor } from "@utils/sandboxExecutor";
import type { ChatInputCommandInteraction, Client, GuildMember, Message, TextChannel } from "discord.js";
import type { ICustomCommand } from "@/models/CustomCommand";

const cooldowns = new Map<string, Map<string, number>>();

export class CustomCommandHandler {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async handleMessage(message: Message): Promise<boolean> {
		if (message.author.bot || !message.guild || !message.content) return false;

		const guildId = message.guild.id;
		const content = message.content.trim();

		const commands = await CustomCommandService.findAllByGuild(guildId, { enabled: true });
		const approvedCommands = commands.filter((cmd) => cmd.approvalStatus === "approved");

		const matchedCommand = await this.findMatchingCommand(approvedCommands, content, message);
		if (!matchedCommand) return false;

		if (!this.checkPermissions(matchedCommand, message.member, message.channelId)) {
			return false;
		}

		if (this.isOnCooldown(matchedCommand._id.toString(), message.author.id, "user", matchedCommand.cooldown?.user)) {
			return false;
		}

		await this.executeCommand(matchedCommand, { message }, message.channel as TextChannel);
		await CustomCommandService.incrementUsage(matchedCommand._id.toString());

		return true;
	}

	async handleInteraction(interaction: ChatInputCommandInteraction): Promise<boolean> {
		if (!interaction.guild) return false;

		const guildId = interaction.guild.id;
		const commandName = interaction.commandName;

		const command = await CustomCommandService.findByGuildAndName(guildId, commandName);
		if (!command || command.triggerType !== "slash") return false;

		if (!this.checkPermissions(command, interaction.member as GuildMember, interaction.channelId)) {
			return false;
		}

		if (this.isOnCooldown(command._id.toString(), interaction.user.id, "user", command.cooldown?.user)) {
			return false;
		}

		const args: string[] = [];
		if (interaction.options.data) {
			for (const opt of interaction.options.data) {
				if (opt.value !== undefined) {
					args.push(String(opt.value));
				}
			}
		}

		await this.executeCommand(command, { interaction, args }, interaction.channel as TextChannel);
		await CustomCommandService.incrementUsage(command._id.toString());

		return true;
	}

	async handleEvent(eventType: string, guildId: string, context: Record<string, any>): Promise<void> {
		const commands = await CustomCommandService.findEventCommands(guildId, eventType);

		for (const command of commands) {
			if (!command.enabled) continue;

			try {
				await this.executeCommand(command, context, context.channel);
			} catch (error) {
				Logger.error(`Error executing event custom command "${command.name}": ${error}`);
			}
		}
	}

	async handleRandomTriggers(guildId: string): Promise<void> {
		const commands = await CustomCommandService.findRandomCommands(guildId);

		for (const command of commands) {
			if (!command.enabled || !command.random) continue;

			const chance = command.random.chance;
			if (Math.random() * 100 >= chance) continue;

			if (command.random.interval) {
				const lastUsed = command.lastUsed?.getTime() || 0;
				const now = Date.now();
				if (now - lastUsed < command.random.interval) continue;
			}

			let targetChannelId: string | null = null;

			if (command.random.channels && command.random.channels.length > 0) {
				targetChannelId = command.random.channels[Math.floor(Math.random() * command.random.channels.length)];
			}

			if (!targetChannelId) {
				const guild = this.client.guilds.cache.get(guildId);
				if (!guild) continue;

				const textChannels = guild.channels.cache.filter(
					(ch) => ch.isTextBased() && !ch.isDMBased(),
				);
				if (textChannels.size === 0) continue;

				targetChannelId = textChannels.random()?.id || null;
			}

			if (!targetChannelId) continue;

			const channel = await this.client.channels.fetch(targetChannelId).catch(() => null);
			if (!channel || !channel.isTextBased()) continue;

			try {
				await this.executeCommand(command, { channel }, channel as TextChannel);
				await CustomCommandService.incrementUsage(command._id.toString());
			} catch (error) {
				Logger.error(`Error executing random custom command "${command.name}": ${error}`);
			}
		}
	}

	private async findMatchingCommand(
		commands: ICustomCommand[],
		content: string,
		message: Message,
	): Promise<ICustomCommand | null> {
		const prefix = ".";
		const contentWithoutPrefix = content.startsWith(prefix) ? content.slice(prefix.length).trim() : null;

		for (const command of commands) {
			if (command.triggerType === "event" || command.triggerType === "random" || command.triggerType === "interval") {
				continue;
			}

			if (command.triggerType === "slash") continue;

			let matched = false;

			if (contentWithoutPrefix) {
				const commandName = contentWithoutPrefix.split(/\s+/)[0]?.toLowerCase();
				if (commandName === command.name.toLowerCase()) {
					matched = true;
				}
				if (command.aliases.some((alias) => alias.toLowerCase() === commandName)) {
					matched = true;
				}
			}

			if (!matched && contentWithoutPrefix) {
				if (command.triggerType === "exact" && contentWithoutPrefix.toLowerCase() === command.trigger.toLowerCase()) {
					matched = true;
				}
			}

			if (!matched) {
				switch (command.triggerType) {
					case "contains":
						if (content.toLowerCase().includes(command.trigger.toLowerCase())) {
							matched = true;
						}
						break;
					case "starts_with":
						if (content.toLowerCase().startsWith(command.trigger.toLowerCase())) {
							matched = true;
						}
						break;
					case "regex":
						try {
							const regex = new RegExp(command.trigger, command.regexFlags || "i");
							if (regex.test(content)) {
								matched = true;
							}
						} catch (e) {
							Logger.error(`Invalid regex in custom command "${command.name}": ${e}`);
						}
						break;
				}
			}

			if (matched) {
				return command;
			}
		}

		return null;
	}

	private checkPermissions(
		command: ICustomCommand,
		member: GuildMember | null,
		channelId: string,
	): boolean {
		if (!member) return false;

		const perms = command.permissions;
		if (!perms) return true;

		if (perms.blockedUsers?.includes(member.user.id)) return false;
		if (perms.blockedRoles?.some((role) => member.roles.cache.has(role))) return false;
		if (perms.blockedChannels?.includes(channelId)) return false;

		if (perms.allowedUsers?.length > 0 && !perms.allowedUsers.includes(member.user.id)) return false;
		if (perms.allowedRoles?.length > 0 && !perms.allowedRoles.some((role) => member.roles.cache.has(role))) return false;
		if (perms.allowedChannels?.length > 0 && !perms.allowedChannels.includes(channelId)) return false;

		return true;
	}

	private isOnCooldown(
		commandId: string,
		userId: string,
		cooldownType: string,
		cooldownTime?: number,
	): boolean {
		if (!cooldownTime || cooldownTime <= 0) return false;

		const key = `${commandId}:${cooldownType}:${userId}`;
		const now = Date.now();

		if (!cooldowns.has(commandId)) {
			cooldowns.set(commandId, new Map());
		}

		const commandCooldowns = cooldowns.get(commandId)!;
		const lastUsed = commandCooldowns.get(key);

		if (lastUsed && now - lastUsed < cooldownTime) {
			const remaining = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
			Logger.info(`Custom command on cooldown: ${remaining}s remaining`);
			return true;
		}

		commandCooldowns.set(key, now);

		setTimeout(() => {
			commandCooldowns.delete(key);
		}, cooldownTime);

		return false;
	}

	private async executeCommand(
		command: ICustomCommand,
		context: SandboxContext,
		channel: TextChannel,
	): Promise<void> {
		try {
			if (command.code && command.type === "code") {
				await this.executeCodeCommand(command, context, channel);
			} else if (command.response) {
				await this.executeResponseCommand(command, context, channel);
			}
		} catch (error: any) {
			Logger.error(`Error executing custom command "${command.name}": ${error.message}`);
			try {
				await channel.send({
					embeds: [Embeds.error("Custom Command Error", `An error occurred while executing "${command.name}".`)],
				});
			} catch (e) {
				Logger.error(`Failed to send error message for custom command "${command.name}": ${e}`);
			}
		}
	}

	private async executeCodeCommand(
		command: ICustomCommand,
		context: SandboxContext,
		channel: TextChannel,
	): Promise<void> {
		if (!command.code) return;

		const variables: Record<string, any> = {};
		if (command.variables) {
			for (const variable of command.variables) {
				variables[variable.name] = variable.defaultValue;
			}
		}

		const sandboxContext: SandboxContext = {
			...context,
			variables,
			customCommand: command,
		};

		const result = await SandboxExecutor.execute(
			command.code.source,
			sandboxContext,
			command.code.timeout || 5000,
		);

		if (!result.success) {
			await channel.send({
				embeds: [Embeds.error("Code Execution Error", result.error || "Unknown error occurred")],
			});
			return;
		}

		if (result.output) {
			if (typeof result.output === "string") {
				await channel.send(this.parseVariables(result.output, context));
			} else if (typeof result.output === "object") {
				if (result.output.content || result.output.embeds || result.output.files) {
					await channel.send(result.output);
				} else {
					await channel.send(`\`\`\`json\n${JSON.stringify(result.output, null, 2)}\`\`\``);
				}
			}
		}
	}

	private async executeResponseCommand(
		command: ICustomCommand,
		context: SandboxContext,
		channel: TextChannel,
	): Promise<void> {
		if (!command.response) return;

		const response = command.response;

		if (response.type === "image" && response.images && response.images.length > 0) {
			const image = response.images[Math.floor(Math.random() * response.images.length)];
			await channel.send({
				content: response.content ? this.parseVariables(response.content, context) : undefined,
				files: [image],
			});
			return;
		}

		if (response.type === "embed" || response.embedTitle || response.embedDescription) {
			const embed = Embeds.info(
				response.embedTitle ? this.parseVariables(response.embedTitle, context) : "Custom Command",
				response.embedDescription ? this.parseVariables(response.embedDescription, context) : "",
			);

			if (response.embedColor) {
				embed.setColor(response.embedColor as any);
			}
			if (response.embedFooter) {
				embed.setFooter({ text: this.parseVariables(response.embedFooter, context) });
			}
			if (response.embedThumbnail) {
				embed.setThumbnail(response.embedThumbnail);
			}
			if (response.embedImage) {
				embed.setImage(response.embedImage);
			}
			if (response.embedFields && response.embedFields.length > 0) {
				for (const field of response.embedFields) {
					embed.addFields({
						name: this.parseVariables(field.name, context),
						value: this.parseVariables(field.value, context),
						inline: field.inline,
					});
				}
			}

			await channel.send({
				content: response.content ? this.parseVariables(response.content, context) : undefined,
				embeds: [embed],
			});
			return;
		}

		if (response.content) {
			await channel.send({
				content: this.parseVariables(response.content, context),
				tts: response.tts || false,
			});
		}
	}

	private parseVariables(text: string, context: SandboxContext): string {
		if (!text) return "";

		const { message, interaction, user, member, guild, channel, args } = context;

		const replacements: Record<string, string> = {
			"{user}": user?.username || "Unknown",
			"{user.id}": user?.id || "",
			"{user.tag}": user?.tag || "Unknown#0000",
			"{user.mention}": user ? `<@${user.id}>` : "",
			"{user.avatar}": user?.displayAvatarURL() || "",
			"{user.discriminator}": user?.discriminator || "0000",
			"{member}": member?.displayName || user?.username || "Unknown",
			"{member.id}": member?.id || user?.id || "",
			"{member.mention}": member ? `<@${member.id}>` : user ? `<@${user.id}>` : "",
			"{guild}": guild?.name || "Unknown",
			"{guild.id}": guild?.id || "",
			"{guild.memberCount}": String(guild?.memberCount || 0),
			"{guild.icon}": guild?.iconURL() || "",
			"{channel}": channel?.name || "Unknown",
			"{channel.id}": channel?.id || "",
			"{channel.mention}": channel ? `<#${channel.id}>` : "",
			"{args}": args?.join(" ") || "",
			"{args.0}": args?.[0] || "",
			"{args.1}": args?.[1] || "",
			"{args.2}": args?.[2] || "",
			"{timestamp}": new Date().toLocaleString(),
			"{date}": new Date().toLocaleDateString(),
			"{time}": new Date().toLocaleTimeString(),
		};

		let result = text;
		for (const [key, value] of Object.entries(replacements)) {
			result = result.split(key).join(value);
		}

		const randomMatch = result.match(/\{random\[(.*?)\]\}/g);
		if (randomMatch) {
			for (const match of randomMatch) {
				const inner = match.slice(8, -2);
				const options = inner.split("|").map((s) => s.trim());
				const randomValue = options[Math.floor(Math.random() * options.length)];
				result = result.split(match).join(randomValue);
			}
		}

		const choiceMatch = result.match(/\{choice\[(.*?)\]\}/g);
		if (choiceMatch) {
			for (const match of choiceMatch) {
				const inner = match.slice(8, -2);
				const options = inner.split(",").map((s) => s.trim());
				const choiceValue = options[Math.floor(Math.random() * options.length)];
				result = result.split(match).join(choiceValue);
			}
		}

		return result;
	}
}
