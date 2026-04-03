import { Logger } from "@utils/logger";
import { Database } from "@/config/database";
import type { IGuildSettings } from "@/types/GuildSettings";
import GuildSettings from "@/types/GuildSettings";

const defaultGuildSettings: Partial<IGuildSettings> = {
	guildId: "",
	prefix: ".",
	logCommands: true,
	logErrors: true,
	logEvents: true,
	welcomeChannel: null,
	goodbyeChannel: null,
	modLogChannel: null,
	autoModeration: {
		enabled: false,
		deleteInvites: false,
		deleteSpam: false,
		maxWarnings: 3,
		spamThreshold: 5,
		profanityFilter: false,
	},
	permissions: {
		adminRoles: [],
		modRoles: [],
		blacklistedUsers: [],
		allowedChannels: [],
		blockedChannels: [],
	},
};

export class DatabaseService {
	private static getStorage() {
		return Database.getStorage();
	}

	private static isUsingFallback(): boolean {
		return Database.isUsingFallback();
	}

	static async getGuildSettings(guildId: string): Promise<IGuildSettings> {
		const storage = this.getStorage();
		const usingFallback = this.isUsingFallback();

		if (usingFallback && storage) {
			let settings = storage.getGuildSettings(guildId);
			if (!settings) {
				settings = { ...defaultGuildSettings, guildId };
				storage.setGuildSettings(guildId, settings);
				Logger.info(`Created new guild settings for ${guildId} (JSON)`);
			}
			return settings as IGuildSettings;
		}

		try {
			let settings = await GuildSettings.findOne({ guildId });

			if (!settings) {
				settings = new GuildSettings({
					guildId,
				});
				await settings.save();
				Logger.info(`Created new guild settings for ${guildId}`);
			}

			return settings;
		} catch (error) {
			Logger.error(`Error getting guild settings for ${guildId}: ${error}`);
			throw error;
		}
	}

	static async updateGuildSettings(
		guildId: string,
		updates: Partial<IGuildSettings>,
	): Promise<IGuildSettings> {
		const storage = this.getStorage();
		const usingFallback = this.isUsingFallback();

		if (usingFallback && storage) {
			const current = storage.getGuildSettings(guildId) || { ...defaultGuildSettings, guildId };
			const updated = { ...current, ...updates };
			storage.setGuildSettings(guildId, updated);
			Logger.info(`Updated guild settings for ${guildId} (JSON)`);
			return updated as IGuildSettings;
		}

		try {
			const settings = await GuildSettings.findOneAndUpdate(
				{ guildId },
				{ $set: updates },
				{ new: true, upsert: true, runValidators: true },
			);

			Logger.info(`Updated guild settings for ${guildId}`);
			return settings!;
		} catch (error) {
			Logger.error(`Error updating guild settings for ${guildId}: ${error}`);
			throw error;
		}
	}

	static async resetGuildSettings(guildId: string): Promise<IGuildSettings> {
		return this.updateGuildSettings(guildId, { ...defaultGuildSettings, guildId });
	}

	static async getAllGuildSettings(): Promise<IGuildSettings[]> {
		const storage = this.getStorage();
		const usingFallback = this.isUsingFallback();

		if (usingFallback && storage) {
			return storage.getAllGuildSettings() as IGuildSettings[];
		}

		try {
			const settings = await GuildSettings.find({});
			return settings;
		} catch (error) {
			Logger.error(`Error getting all guild settings: ${error}`);
			throw error;
		}
	}
}
