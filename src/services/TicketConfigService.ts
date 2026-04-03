import { Logger } from "@utils/logger";
import { Database } from "@/config/database";
import TicketConfig, { defaultTicketConfig, type TicketConfigData } from "@/types/TicketConfig";

export class TicketConfigService {
	private static getStorage() {
		return Database.getStorage();
	}

	private static isUsingFallback(): boolean {
		return Database.isUsingFallback();
	}

	static async findByGuild(guildId: string): Promise<TicketConfigData | null> {
		const storage = TicketConfigService.getStorage();
		const usingFallback = TicketConfigService.isUsingFallback();

		if (usingFallback && storage) {
			const config = storage.getTicketConfig(guildId);
			if (!config) {
				const defaultConfig = { ...defaultTicketConfig, guildId };
				storage.setTicketConfig(guildId, defaultConfig);
				Logger.info(`Created default ticket config for ${guildId} (JSON)`);
				return defaultConfig as TicketConfigData;
			}
			return config as TicketConfigData;
		}

		try {
			const config = await TicketConfig.findByGuild(guildId);
			return config as TicketConfigData;
		} catch (error) {
			Logger.error(`Error finding ticket config for ${guildId}: ${error}`);
			return null;
		}
	}

	static async createDefault(guildId: string): Promise<TicketConfigData> {
		const storage = TicketConfigService.getStorage();
		const usingFallback = TicketConfigService.isUsingFallback();

		if (usingFallback && storage) {
			const defaultConfig = { ...defaultTicketConfig, guildId };
			storage.setTicketConfig(guildId, defaultConfig);
			Logger.info(`Created default ticket config for ${guildId} (JSON)`);
			return defaultConfig as TicketConfigData;
		}

		try {
			const config = await TicketConfig.createDefault(guildId);
			return config as TicketConfigData;
		} catch (error) {
			Logger.error(`Error creating default ticket config for ${guildId}: ${error}`);
			throw error;
		}
	}
}
