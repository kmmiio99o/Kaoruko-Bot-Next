import { Logger } from "@utils/logger";
import * as fs from "fs";
import * as path from "path";
import { Database } from "@/config/database";
import type { ICustomCommand } from "@/models/CustomCommand";
import CustomCommand from "@/models/CustomCommand";

const DATA_FILE = path.join(process.cwd(), "data", "customCommands.json");

function loadJsonData(): Record<string, any[]> {
	try {
		if (fs.existsSync(DATA_FILE)) {
			return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
		}
	} catch (error) {
		Logger.warn(`Failed to load custom commands JSON: ${error}`);
	}
	return {};
}

function saveJsonData(data: Record<string, any[]>): void {
	try {
		const dir = path.dirname(DATA_FILE);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		Logger.error(`Failed to save custom commands JSON: ${error}`);
	}
}

function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function matchesFilter(cmd: any, options?: { enabled?: boolean; type?: string; approvalStatus?: string }): boolean {
	if (options?.enabled !== undefined && cmd.enabled !== options.enabled) return false;
	if (options?.type && cmd.type !== options.type) return false;
	if (options?.approvalStatus && cmd.approvalStatus !== options.approvalStatus) return false;
	return true;
}

export class CustomCommandService {
	private static isUsingFallback(): boolean {
		return Database.isUsingFallback();
	}

	private static getGuildCommands(guildId: string): any[] {
		const data = loadJsonData();
		return data[guildId] || [];
	}

	private static setGuildCommands(guildId: string, commands: any[]): void {
		const data = loadJsonData();
		data[guildId] = commands;
		saveJsonData(data);
	}

	private static findCommand(guildId: string, predicate: (cmd: any) => boolean): any {
		const commands = CustomCommandService.getGuildCommands(guildId);
		return commands.find(predicate) || null;
	}

	static async create(data: Partial<ICustomCommand>): Promise<ICustomCommand> {
		if (CustomCommandService.isUsingFallback()) {
			const command = {
				_id: generateId(),
				guildId: data.guildId || "",
				name: data.name || "",
				description: data.description || "",
				aliases: data.aliases || [],
				type: data.type || "response",
				triggerType: data.triggerType || "exact",
				trigger: data.trigger || "",
				regexFlags: data.regexFlags || "i",
				response: data.response || null,
				code: data.code || null,
				eventType: data.eventType || null,
				permissions: data.permissions || {},
				cooldown: data.cooldown || {},
				variables: data.variables || [],
				random: data.random || null,
				enabled: data.enabled !== undefined ? data.enabled : true,
				deleted: data.deleted !== undefined ? data.deleted : false,
				approvalStatus: data.approvalStatus || "approved",
				approvalMessageId: data.approvalMessageId || null,
				rejectionReason: data.rejectionReason || null,
				approvedBy: data.approvedBy || null,
				approvedAt: data.approvedAt || null,
				usageCount: 0,
				lastUsed: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: data.createdBy || "",
			};

			const commands = CustomCommandService.getGuildCommands(command.guildId);
			commands.push(command);
			CustomCommandService.setGuildCommands(command.guildId, commands);
			Logger.info(`Created custom command "${command.name}" for guild ${command.guildId} (JSON)`);
			return command as unknown as ICustomCommand;
		}

		try {
			const command = new CustomCommand(data);
			await command.save();
			Logger.info(`Created custom command "${command.name}" for guild ${command.guildId}`);
			return command;
		} catch (error) {
			Logger.error(`Error creating custom command: ${error}`);
			throw error;
		}
	}

	static async findById(id: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const commands of Object.values(data)) {
				const found = commands.find((cmd: any) => cmd._id === id);
				if (found) return found as ICustomCommand;
			}
			return null;
		}

		try {
			return await CustomCommand.findById(id);
		} catch (error) {
			Logger.error(`Error finding custom command by id ${id}: ${error}`);
			throw error;
		}
	}

	static async findByGuildAndName(guildId: string, name: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			return CustomCommandService.findCommand(guildId, (cmd) =>
				cmd.name.toLowerCase() === name.toLowerCase() && !cmd.deleted,
			);
		}

		try {
			return await CustomCommand.findOne({
				guildId,
				name: { $regex: new RegExp(`^${name}$`, "i") },
				deleted: false,
			});
		} catch (error) {
			Logger.error(`Error finding custom command by name ${name}: ${error}`);
			throw error;
		}
	}

	static async findByGuildAndTrigger(guildId: string, trigger: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			return CustomCommandService.findCommand(guildId, (cmd) =>
				cmd.trigger.toLowerCase() === trigger.toLowerCase() && cmd.enabled && !cmd.deleted,
			);
		}

		try {
			return await CustomCommand.findOne({
				guildId,
				trigger: { $regex: new RegExp(`^${trigger}$`, "i") },
				enabled: true,
				deleted: false,
			});
		} catch (error) {
			Logger.error(`Error finding custom command by trigger ${trigger}: ${error}`);
			throw error;
		}
	}

	static async findByGuildAndAlias(guildId: string, alias: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			return CustomCommandService.findCommand(guildId, (cmd) =>
				cmd.aliases.some((a: string) => a.toLowerCase() === alias.toLowerCase()) && cmd.enabled && !cmd.deleted,
			);
		}

		try {
			return await CustomCommand.findOne({
				guildId,
				aliases: { $regex: new RegExp(`^${alias}$`, "i") },
				enabled: true,
				deleted: false,
			});
		} catch (error) {
			Logger.error(`Error finding custom command by alias ${alias}: ${error}`);
			throw error;
		}
	}

	static async findAllByGuild(guildId: string, options?: { enabled?: boolean; type?: string; approvalStatus?: string }): Promise<ICustomCommand[]> {
		if (CustomCommandService.isUsingFallback()) {
			const commands = CustomCommandService.getGuildCommands(guildId);
			return commands.filter((cmd) => !cmd.deleted && matchesFilter(cmd, options)) as ICustomCommand[];
		}

		try {
			const query: any = { guildId, deleted: false };
			if (options?.enabled !== undefined) query.enabled = options.enabled;
			if (options?.type) query.type = options.type;
			if (options?.approvalStatus) query.approvalStatus = options.approvalStatus;
			return await CustomCommand.find(query).sort({ createdAt: -1 });
		} catch (error) {
			Logger.error(`Error finding all custom commands for guild ${guildId}: ${error}`);
			throw error;
		}
	}

	static async findEventCommands(guildId: string, eventType: string): Promise<ICustomCommand[]> {
		if (CustomCommandService.isUsingFallback()) {
			const commands = CustomCommandService.getGuildCommands(guildId);
			return commands.filter((cmd) =>
				!cmd.deleted && cmd.enabled && cmd.triggerType === "event" && cmd.eventType === eventType,
			) as ICustomCommand[];
		}

		try {
			return await CustomCommand.find({
				guildId,
				triggerType: "event",
				eventType,
				enabled: true,
				deleted: false,
			}).sort({ createdAt: -1 });
		} catch (error) {
			Logger.error(`Error finding event commands for guild ${guildId}: ${error}`);
			throw error;
		}
	}

	static async findRandomCommands(guildId: string): Promise<ICustomCommand[]> {
		if (CustomCommandService.isUsingFallback()) {
			const commands = CustomCommandService.getGuildCommands(guildId);
			return commands.filter((cmd) =>
				!cmd.deleted && cmd.enabled && cmd.triggerType === "random",
			) as ICustomCommand[];
		}

		try {
			return await CustomCommand.find({
				guildId,
				triggerType: "random",
				enabled: true,
				deleted: false,
			});
		} catch (error) {
			Logger.error(`Error finding random commands for guild ${guildId}: ${error}`);
			throw error;
		}
	}

	static async findAutoResponders(guildId: string): Promise<ICustomCommand[]> {
		if (CustomCommandService.isUsingFallback()) {
			const commands = CustomCommandService.getGuildCommands(guildId);
			return commands.filter((cmd) =>
				!cmd.deleted && cmd.enabled && ["contains", "starts_with", "regex"].includes(cmd.triggerType),
			) as ICustomCommand[];
		}

		try {
			return await CustomCommand.find({
				guildId,
				triggerType: { $in: ["contains", "starts_with", "regex"] },
				enabled: true,
				deleted: false,
			});
		} catch (error) {
			Logger.error(`Error finding auto responders for guild ${guildId}: ${error}`);
			throw error;
		}
	}

	static async update(id: string, updates: Partial<ICustomCommand>): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx] = { ...commands[idx], ...updates, updatedAt: new Date() };
					data[guildId] = commands;
					saveJsonData(data);
					Logger.info(`Updated custom command "${commands[idx].name}" for guild ${guildId} (JSON)`);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			const command = await CustomCommand.findByIdAndUpdate(
				id,
				{ $set: updates },
				{ new: true, runValidators: true },
			);
			if (command) {
				Logger.info(`Updated custom command "${command.name}" for guild ${command.guildId}`);
			}
			return command;
		} catch (error) {
			Logger.error(`Error updating custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async toggle(id: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].enabled = !commands[idx].enabled;
					commands[idx].updatedAt = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					Logger.info(`Toggled custom command "${commands[idx].name}" to ${commands[idx].enabled ? "enabled" : "disabled"} (JSON)`);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			const command = await CustomCommand.findById(id);
			if (!command) return null;
			command.enabled = !command.enabled;
			await command.save();
			Logger.info(`Toggled custom command "${command.name}" to ${command.enabled ? "enabled" : "disabled"}`);
			return command;
		} catch (error) {
			Logger.error(`Error toggling custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async softDelete(id: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].deleted = true;
					commands[idx].updatedAt = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			return await CustomCommand.findByIdAndUpdate(
				id,
				{ $set: { deleted: true } },
				{ new: true },
			);
		} catch (error) {
			Logger.error(`Error deleting custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async hardDelete(id: string): Promise<boolean> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands.splice(idx, 1);
					data[guildId] = commands;
					saveJsonData(data);
					Logger.info(`Hard deleted custom command for guild ${guildId} (JSON)`);
					return true;
				}
			}
			return false;
		}

		try {
			const result = await CustomCommand.findByIdAndDelete(id);
			if (result) {
				Logger.info(`Hard deleted custom command "${result.name}" for guild ${result.guildId}`);
			}
			return !!result;
		} catch (error) {
			Logger.error(`Error hard deleting custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async incrementUsage(id: string): Promise<void> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].usageCount = (commands[idx].usageCount || 0) + 1;
					commands[idx].lastUsed = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					return;
				}
			}
			return;
		}

		try {
			await CustomCommand.findByIdAndUpdate(id, {
				$inc: { usageCount: 1 },
				$set: { lastUsed: new Date() },
			});
		} catch (error) {
			Logger.error(`Error incrementing usage for custom command ${id}: ${error}`);
		}
	}

	static async countByGuild(guildId: string): Promise<number> {
		if (CustomCommandService.isUsingFallback()) {
			const commands = CustomCommandService.getGuildCommands(guildId);
			return commands.filter((cmd: any) => !cmd.deleted).length;
		}

		try {
			return await CustomCommand.countDocuments({ guildId, deleted: false });
		} catch (error) {
			Logger.error(`Error counting custom commands for guild ${guildId}: ${error}`);
			return 0;
		}
	}

	static async findPendingApproval(): Promise<ICustomCommand[]> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			const pending: any[] = [];
			for (const commands of Object.values(data)) {
				for (const cmd of commands) {
					if (!cmd.deleted && cmd.approvalStatus === "pending") {
						pending.push(cmd);
					}
				}
			}
			return pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as ICustomCommand[];
		}

		try {
			return await CustomCommand.find({
				approvalStatus: "pending",
				deleted: false,
			}).sort({ createdAt: -1 });
		} catch (error) {
			Logger.error(`Error finding pending approvals: ${error}`);
			throw error;
		}
	}

	static async approveCommand(id: string, approvedBy: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].approvalStatus = "approved";
					commands[idx].approvedBy = approvedBy;
					commands[idx].approvedAt = new Date();
					commands[idx].enabled = true;
					commands[idx].updatedAt = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			return await CustomCommand.findByIdAndUpdate(
				id,
				{
					$set: {
						approvalStatus: "approved",
						approvedBy,
						approvedAt: new Date(),
						enabled: true,
					},
				},
				{ new: true },
			);
		} catch (error) {
			Logger.error(`Error approving custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async rejectCommand(id: string, reason?: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].approvalStatus = "rejected";
					commands[idx].rejectionReason = reason || null;
					commands[idx].enabled = false;
					commands[idx].updatedAt = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			return await CustomCommand.findByIdAndUpdate(
				id,
				{
					$set: {
						approvalStatus: "rejected",
						rejectionReason: reason || null,
						enabled: false,
					},
				},
				{ new: true },
			);
		} catch (error) {
			Logger.error(`Error rejecting custom command ${id}: ${error}`);
			throw error;
		}
	}

	static async updateApprovalMessage(id: string, messageId: string): Promise<ICustomCommand | null> {
		if (CustomCommandService.isUsingFallback()) {
			const data = loadJsonData();
			for (const [guildId, commands] of Object.entries(data)) {
				const idx = commands.findIndex((cmd: any) => cmd._id === id);
				if (idx !== -1) {
					commands[idx].approvalMessageId = messageId;
					commands[idx].updatedAt = new Date();
					data[guildId] = commands;
					saveJsonData(data);
					return commands[idx] as ICustomCommand;
				}
			}
			return null;
		}

		try {
			return await CustomCommand.findByIdAndUpdate(
				id,
				{ $set: { approvalMessageId: messageId } },
				{ new: true },
			);
		} catch (error) {
			Logger.error(`Error updating approval message for custom command ${id}: ${error}`);
			throw error;
		}
	}
}
