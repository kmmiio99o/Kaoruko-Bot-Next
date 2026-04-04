import { CustomCommandService } from "@services/CustomCommandService";
import { Embeds } from "@utils/embeds";
import { SandboxExecutor } from "@utils/sandboxExecutor";
import { type ChatInputCommandInteraction, type Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import https from "https";
import type { CustomCommandType, EventType, TriggerType } from "@/models/CustomCommand";
import type { ICommand } from "@/types/Command";

function fetchAttachment(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => resolve(data));
		}).on("error", reject);
	});
}

let approvalHandler: any = null;

export function setApprovalHandler(handler: any) {
	approvalHandler = handler;
}

export const command: ICommand = {
	name: "customcommand",
	description: "Manage custom commands for this server",
	category: "admin",
	slashCommand: true,
	prefixCommand: true,
	data: new SlashCommandBuilder()
		.setName("customcommand")
		.setDescription("Manage custom commands for this server")
		.addSubcommand((sub) =>
			sub
				.setName("create")
				.setDescription("Create a new custom command")
				.addStringOption((opt) => opt.setName("name").setDescription("Command name").setRequired(true))
				.addStringOption((opt) => opt.setName("type").setDescription("Command type").addChoices(
					{ name: "Response", value: "response" },
					{ name: "Embed", value: "embed" },
					{ name: "Code", value: "code" },
					{ name: "Image", value: "image" },
					{ name: "Random Image", value: "random_image" },
					{ name: "Welcome", value: "welcome" },
					{ name: "Goodbye", value: "goodbye" },
					{ name: "Auto Responder", value: "auto_responder" },
				))
				.addStringOption((opt) => opt.setName("trigger_type").setDescription("How the command is triggered").addChoices(
					{ name: "Exact Match", value: "exact" },
					{ name: "Contains", value: "contains" },
					{ name: "Starts With", value: "starts_with" },
					{ name: "Regex", value: "regex" },
					{ name: "Slash Command", value: "slash" },
					{ name: "Event", value: "event" },
					{ name: "Random", value: "random" },
				))
				.addStringOption((opt) => opt.setName("trigger").setDescription("The trigger text/pattern"))
				.addStringOption((opt) => opt.setName("response").setDescription("Response text"))
				.addStringOption((opt) => opt.setName("code").setDescription("Paste JavaScript/TypeScript code here"))
				.addAttachmentOption((opt) => opt.setName("code_file").setDescription("Upload a .js or .ts file with your code"))
				.addStringOption((opt) => opt.setName("event_type").setDescription("Event type (for event trigger)").addChoices(
					{ name: "Member Join", value: "member_join" },
					{ name: "Member Leave", value: "member_leave" },
				))
				.addStringOption((opt) => opt.setName("aliases").setDescription("Comma-separated aliases"))
				.addIntegerOption((opt) => opt.setName("cooldown").setDescription("Cooldown in seconds"))
				.addStringOption((opt) => opt.setName("chance").setDescription("Chance % for random triggers (0-100)")),
		)
		.addSubcommand((sub) =>
			sub
				.setName("edit")
				.setDescription("Edit an existing custom command")
				.addStringOption((opt) => opt.setName("name").setDescription("Command name").setRequired(true))
				.addStringOption((opt) => opt.setName("response").setDescription("New response text"))
				.addStringOption((opt) => opt.setName("code").setDescription("Paste new JavaScript code"))
				.addAttachmentOption((opt) => opt.setName("code_file").setDescription("Upload a .js or .ts file with new code"))
				.addStringOption((opt) => opt.setName("trigger").setDescription("New trigger"))
				.addStringOption((opt) => opt.setName("aliases").setDescription("New comma-separated aliases"))
				.addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable the command")),
		)
		.addSubcommand((sub) =>
			sub
				.setName("delete")
				.setDescription("Delete a custom command")
				.addStringOption((opt) => opt.setName("name").setDescription("Command name").setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName("toggle")
				.setDescription("Toggle a custom command on/off")
				.addStringOption((opt) => opt.setName("name").setDescription("Command name").setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName("list")
				.setDescription("List all custom commands")
				.addStringOption((opt) => opt.setName("type").setDescription("Filter by type")),
		)
		.addSubcommand((sub) =>
			sub
				.setName("info")
				.setDescription("Get info about a custom command")
				.addStringOption((opt) => opt.setName("name").setDescription("Command name").setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName("validate")
				.setDescription("Validate custom command code before saving")
				.addStringOption((opt) => opt.setName("code").setDescription("JavaScript code to validate").setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName("pending")
				.setDescription("List custom commands pending approval"),
		),
	run: async (interaction?: ChatInputCommandInteraction, message?: Message, args?: string[]) => {
		const ctx = interaction || message;
		if (!ctx) return;

		const guild = interaction?.guild || message?.guild;
		if (!guild) {
			await reply(ctx, Embeds.error("Error", "This command can only be used in a server."));
			return;
		}

		const member = interaction?.member || message?.member;
		if (!member) return;

		const hasPermission = interaction
			? (member as any).permissions?.has(PermissionsBitField.Flags.ManageGuild)
			: (member as any).permissions?.has(PermissionsBitField.Flags.ManageGuild);

		if (!hasPermission) {
			await reply(ctx, Embeds.error("Permission Denied", "You need the Manage Guild permission to use this command."));
			return;
		}

		const subcommand = interaction?.options?.getSubcommand?.() || args?.[0];

		switch (subcommand) {
			case "create":
				await handleCreate(interaction, message, args, guild.id, (interaction?.user || message?.author)?.id || "");
				break;
			case "edit":
				await handleEdit(interaction, message, args, guild.id);
				break;
			case "delete":
				await handleDelete(interaction, message, args, guild.id);
				break;
			case "toggle":
				await handleToggle(interaction, message, args, guild.id);
				break;
			case "list":
				await handleList(interaction, message, args, guild.id);
				break;
			case "info":
				await handleInfo(interaction, message, args, guild.id);
				break;
			case "validate":
				await handleValidate(interaction, message, args);
				break;
			case "pending":
				await handlePending(interaction, message, args);
				break;
			default:
				await reply(ctx, Embeds.info(
					"Custom Commands Help",
					"Subcommands: `create`, `edit`, `delete`, `toggle`, `list`, `info`, `validate`\n\n" +
					"Types: response, embed, code, image, random_image, welcome, goodbye, auto_responder\n" +
					"Triggers: exact, contains, starts_with, regex, slash, event, random\n\n" +
					"Example: `/customcommand create name:hello type:response trigger_type:exact trigger:hello response:Hello there!`"
				));
		}
	},
};

async function handleCreate(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string, createdBy: string) {
	let name: string;
	let type = "response";
	let triggerType = "exact";
	let trigger = "";
	let response: string | undefined, code: string | undefined;
	let eventType: string | undefined, aliases: string | undefined;
	let cooldown: number | undefined, chance: string | undefined;

	if (interaction) {
		name = interaction.options.getString("name", true);
		type = interaction.options.getString("type") || "response";
		triggerType = interaction.options.getString("trigger_type") || "exact";
		trigger = interaction.options.getString("trigger") || name;
		response = interaction.options.getString("response") || undefined;
		code = interaction.options.getString("code") || undefined;
		eventType = interaction.options.getString("event_type") || undefined;
		aliases = interaction.options.getString("aliases") || undefined;
		cooldown = interaction.options.getInteger("cooldown") || undefined;
		chance = interaction.options.getString("chance") || undefined;

		const attachment = interaction.options.getAttachment("code_file");
		if (attachment) {
			if (!attachment.contentType?.includes("text") && !attachment.name?.match(/\.(js|ts|mjs|cjs)$/i)) {
				await replyCtx(interaction, message, Embeds.error("Error", "Code file must be a .js, .ts, .mjs, or .cjs file."));
				return;
			}
			try {
				code = await fetchAttachment(attachment.url);
			} catch {
				await replyCtx(interaction, message, Embeds.error("Error", "Failed to read the uploaded code file."));
				return;
			}
		}
	} else if (args && args.length >= 1) {
		name = args[1];
		const typeIdx = args.indexOf("--type");
		const triggerTypeIdx = args.indexOf("--trigger_type");
		const triggerIdx = args.indexOf("--trigger");
		const responseIdx = args.indexOf("--response");
		const codeIdx = args.indexOf("--code");
		const aliasesIdx = args.indexOf("--aliases");
		const cooldownIdx = args.indexOf("--cooldown");
		const chanceIdx = args.indexOf("--chance");
		const eventIdx = args.indexOf("--event");

		if (typeIdx > -1) type = args[typeIdx + 1];
		if (triggerTypeIdx > -1) triggerType = args[triggerTypeIdx + 1];
		if (triggerIdx > -1) trigger = args[triggerIdx + 1];
		else trigger = name;
		if (responseIdx > -1) response = args[responseIdx + 1];
		if (codeIdx > -1) code = args[codeIdx + 1];
		if (aliasesIdx > -1) aliases = args[aliasesIdx + 1];
		if (cooldownIdx > -1) cooldown = parseInt(args[cooldownIdx + 1]);
		if (chanceIdx > -1) chance = args[chanceIdx + 1];
		if (eventIdx > -1) eventType = args[eventIdx + 1];
	} else {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand create <name> [--type response] [--trigger_type exact] [--trigger <text>] [--response <text>] [--code <code>] [--aliases <a,b>] [--cooldown <seconds>]`"));
		return;
	}

	const existing = await CustomCommandService.findByGuildAndName(guildId, name);
	if (existing) {
		await replyCtx(interaction, message, Embeds.error("Error", `A custom command named "${name}" already exists.`));
		return;
	}

	const commandData: any = {
		guildId,
		name,
		description: `Custom command: ${name}`,
		aliases: aliases ? aliases.split(",").map((a) => a.trim()).filter(Boolean) : [],
		type: type as any,
		triggerType: triggerType as any,
		trigger,
		enabled: true,
		deleted: false,
		usageCount: 0,
		createdBy,
	};

	if (type === "code") {
		if (!code) {
			await replyCtx(interaction, message, Embeds.error("Error", "Code type requires --code option."));
			return;
		}

		const validationError = SandboxExecutor.validateCode(code);
		if (validationError) {
			await replyCtx(interaction, message, Embeds.error("Validation Error", validationError));
			return;
		}

		commandData.code = { language: "javascript", source: code, timeout: 5000 };
		commandData.approvalStatus = "pending";
		commandData.enabled = false;
	} else if (type === "embed") {
		commandData.response = {
			type: "embed",
			content: response || "",
			embedTitle: response || "Custom Command",
			embedDescription: response || "",
		};
	} else if (type === "image" || type === "random_image") {
		commandData.response = {
			type: "image",
			content: response || "",
			images: response ? [response] : [],
		};
	} else if (type === "welcome" || type === "goodbye") {
		commandData.triggerType = "event";
		commandData.eventType = type === "welcome" ? "member_join" : "member_leave";
		commandData.response = { type: "text", content: response || "Welcome {user.mention} to {guild}!" };
	} else {
		commandData.response = { type: "text", content: response || "" };
	}

	if (eventType) {
		commandData.eventType = eventType as EventType;
	}

	if (cooldown) {
		commandData.cooldown = { user: cooldown * 1000 };
	}

	if (chance) {
		const chanceNum = parseFloat(chance);
		if (!isNaN(chanceNum) && chanceNum >= 0 && chanceNum <= 100) {
			commandData.random = { chance: chanceNum };
		}
	}

	try {
		const createdCommand = await CustomCommandService.create(commandData);

		if (type === "code" && approvalHandler) {
			await approvalHandler.sendForApproval(createdCommand);
			await replyCtx(interaction, message, Embeds.info(
				"Pending Approval",
				`Custom command "${name}" has been created and is pending approval. An administrator will review the code before it becomes active.`,
			));
		} else {
			await replyCtx(interaction, message, Embeds.success("Success", `Custom command "${name}" created successfully!`));
		}
	} catch (error: any) {
		await replyCtx(interaction, message, Embeds.error("Error", `Failed to create custom command: ${error.message}`));
	}
}

async function handleEdit(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string) {
	let name: string;
	let response: string | undefined, code: string | undefined, trigger: string | undefined;
	let aliases: string | undefined, enabled: boolean | undefined;

	if (interaction) {
		name = interaction.options.getString("name", true);
		response = interaction.options.getString("response") || undefined;
		code = interaction.options.getString("code") || undefined;
		trigger = interaction.options.getString("trigger") || undefined;
		aliases = interaction.options.getString("aliases") || undefined;
		enabled = interaction.options.getBoolean("enabled") ?? undefined;

		const attachment = interaction.options.getAttachment("code_file");
		if (attachment) {
			if (!attachment.contentType?.includes("text") && !attachment.name?.match(/\.(js|ts|mjs|cjs)$/i)) {
				await replyCtx(interaction, message, Embeds.error("Error", "Code file must be a .js, .ts, .mjs, or .cjs file."));
				return;
			}
			try {
				code = await fetchAttachment(attachment.url);
			} catch {
				await replyCtx(interaction, message, Embeds.error("Error", "Failed to read the uploaded code file."));
				return;
			}
		}
	} else if (args && args.length >= 2) {
		name = args[1];
		const responseIdx = args.indexOf("--response");
		const codeIdx = args.indexOf("--code");
		const triggerIdx = args.indexOf("--trigger");
		const aliasesIdx = args.indexOf("--aliases");
		const enabledIdx = args.indexOf("--enabled");

		if (responseIdx > -1) response = args[responseIdx + 1];
		if (codeIdx > -1) code = args[codeIdx + 1];
		if (triggerIdx > -1) trigger = args[triggerIdx + 1];
		if (aliasesIdx > -1) aliases = args[aliasesIdx + 1];
		if (enabledIdx > -1) enabled = args[enabledIdx + 1] === "true";
	} else {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand edit <name> [--response <text>] [--code <code>] [--trigger <text>] [--aliases <a,b>] [--enabled <true/false>]`"));
		return;
	}

	const command = await CustomCommandService.findByGuildAndName(guildId, name);
	if (!command) {
		await replyCtx(interaction, message, Embeds.error("Error", `Custom command "${name}" not found.`));
		return;
	}

	const updates: any = {};
	if (response !== undefined) updates["response.content"] = response;
	if (trigger !== undefined) updates.trigger = trigger;
	if (aliases !== undefined) updates.aliases = aliases.split(",").map((a) => a.trim()).filter(Boolean);
	if (enabled !== undefined) updates.enabled = enabled;

	if (code) {
		const validationError = SandboxExecutor.validateCode(code);
		if (validationError) {
			await replyCtx(interaction, message, Embeds.error("Validation Error", validationError));
			return;
		}
		updates.code = { language: "javascript", source: code, timeout: 5000 };
		updates.approvalStatus = "pending";
		updates.enabled = false;
	}

	const updatedCommand = await CustomCommandService.update(command._id.toString(), updates);

	if (code && approvalHandler && updatedCommand) {
		await approvalHandler.sendForApproval(updatedCommand);
		await replyCtx(interaction, message, Embeds.info(
			"Pending Re-Approval",
			`Custom command "${name}" has been updated but requires re-approval since the code was changed.`,
		));
	} else {
		await replyCtx(interaction, message, Embeds.success("Success", `Custom command "${name}" updated successfully!`));
	}
}

async function handleDelete(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string) {
	const name = interaction?.options.getString("name", true) || args?.[1];
	if (!name) {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand delete <name>`"));
		return;
	}

	const command = await CustomCommandService.findByGuildAndName(guildId, name);
	if (!command) {
		await replyCtx(interaction, message, Embeds.error("Error", `Custom command "${name}" not found.`));
		return;
	}

	await CustomCommandService.softDelete(command._id.toString());
	await replyCtx(interaction, message, Embeds.success("Success", `Custom command "${name}" deleted successfully!`));
}

async function handleToggle(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string) {
	const name = interaction?.options.getString("name", true) || args?.[1];
	if (!name) {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand toggle <name>`"));
		return;
	}

	const command = await CustomCommandService.findByGuildAndName(guildId, name);
	if (!command) {
		await replyCtx(interaction, message, Embeds.error("Error", `Custom command "${name}" not found.`));
		return;
	}

	const updated = await CustomCommandService.toggle(command._id.toString());
	await replyCtx(interaction, message, Embeds.success("Success", `Custom command "${name}" is now ${updated?.enabled ? "enabled" : "disabled"}.`));
}

async function handleList(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string) {
	const typeFilter = interaction?.options.getString("type") || args?.[1];

	const commands = await CustomCommandService.findAllByGuild(guildId, {
		enabled: true,
		type: typeFilter || undefined,
	});

	if (commands.length === 0) {
		const typeText = typeFilter ? ` of type \`${typeFilter}\`` : "";
		await replyCtx(interaction, message, Embeds.info(
			"Custom Commands",
			`There are no custom commands${typeText} for this server yet.\n\nUse \`/customcommand create\` to add one!`,
		));
		return;
	}

	const list = commands
		.map((cmd) => `\`${cmd.name}\` - Type: \`${cmd.type}\` | Trigger: \`${cmd.triggerType}\` | Uses: \`${cmd.usageCount}\``)
		.join("\n");

	const embed = Embeds.info(
		`Custom Commands (${commands.length})`,
		list.slice(0, 4000),
	);

	await replyCtx(interaction, message, embed);
}

async function handleInfo(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined, guildId: string) {
	const name = interaction?.options.getString("name", true) || args?.[1];
	if (!name) {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand info <name>`"));
		return;
	}

	const command = await CustomCommandService.findByGuildAndName(guildId, name);
	if (!command) {
		await replyCtx(interaction, message, Embeds.error("Error", `Custom command "${name}" not found.`));
		return;
	}

	const embed = Embeds.info(
		`Custom Command: ${command.name}`,
		[
			`**Type:** ${command.type}`,
			`**Trigger Type:** ${command.triggerType}`,
			`**Trigger:** ${command.trigger}`,
			`**Aliases:** ${command.aliases.length > 0 ? command.aliases.join(", ") : "None"}`,
			`**Enabled:** ${command.enabled ? "Yes" : "No"}`,
			`**Usage Count:** ${command.usageCount}`,
			`**Created:** <t:${Math.floor(command.createdAt.getTime() / 1000)}:R>`,
			command.lastUsed ? `**Last Used:** <t:${Math.floor(command.lastUsed.getTime() / 1000)}:R>` : "",
		].filter(Boolean).join("\n"),
	);

	await replyCtx(interaction, message, embed);
}

async function handleValidate(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, args: string[] | undefined) {
	const code = interaction?.options.getString("code", true) || args?.slice(1).join(" ");
	if (!code) {
		await replyCtx(interaction, message, Embeds.error("Error", "Usage: `customcommand validate <code>`"));
		return;
	}

	const validationError = SandboxExecutor.validateCode(code);
	if (validationError) {
		await replyCtx(interaction, message, Embeds.error("Validation Failed", validationError));
		return;
	}

	await replyCtx(interaction, message, Embeds.success("Validation Passed", "The code appears safe. Note: this is a basic check and does not guarantee complete safety."));
}

async function reply(ctx: any, embed: any) {
	try {
		if (ctx.reply) {
			await ctx.reply({ embeds: [embed] });
		} else if (ctx.channel) {
			await ctx.channel.send({ embeds: [embed] });
		}
	} catch (e) {
		if (ctx.channel) {
			await ctx.channel.send({ embeds: [embed] });
		}
	}
}

async function replyCtx(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, embed: any) {
	if (interaction) {
		await reply(interaction, embed);
	} else if (message) {
		await reply(message, embed);
	}
}

async function handlePending(interaction: ChatInputCommandInteraction | undefined, message: Message | undefined, _args: string[] | undefined) {
	const pendingCommands = await CustomCommandService.findPendingApproval();

	if (pendingCommands.length === 0) {
		await replyCtx(interaction, message, Embeds.info("Pending Approvals", "No custom commands are pending approval."));
		return;
	}

	const list = pendingCommands
		.map((cmd) => `\`${cmd.name}\` - Guild: \`${cmd.guildId}\` | By: \`${cmd.createdBy}\` | <t:${Math.floor(cmd.createdAt.getTime() / 1000)}:R>`)
		.join("\n");

	const embed = Embeds.info(
		`Pending Approvals (${pendingCommands.length})`,
		list.slice(0, 4000),
	);

	await replyCtx(interaction, message, embed);
}
