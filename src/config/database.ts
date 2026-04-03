import { Logger } from "@utils/logger";
import * as fs from "fs";
import mongoose from "mongoose";
import * as path from "path";

interface FallbackData {
	guildSettings: Record<string, any>;
	ticketConfig: Record<string, any>;
}

class JsonStorage {
	private dataPath = "./data";
	private data: FallbackData = {
		guildSettings: {},
		ticketConfig: {},
	};

	constructor() {
		if (!fs.existsSync(this.dataPath)) {
			fs.mkdirSync(this.dataPath, { recursive: true });
		}
		this.load();
	}

	private load() {
		try {
			const guildSettingsPath = path.join(this.dataPath, "guildSettings.json");
			const ticketConfigPath = path.join(this.dataPath, "ticketConfig.json");

			if (fs.existsSync(guildSettingsPath)) {
				this.data.guildSettings = JSON.parse(fs.readFileSync(guildSettingsPath, "utf-8"));
			}
			if (fs.existsSync(ticketConfigPath)) {
				this.data.ticketConfig = JSON.parse(fs.readFileSync(ticketConfigPath, "utf-8"));
			}
		} catch (error) {
			Logger.warn(`Failed to load JSON data: ${error}`);
		}
	}

	private save(key: keyof FallbackData) {
		try {
			const filePath = path.join(this.dataPath, `${key}.json`);
			fs.writeFileSync(filePath, JSON.stringify(this.data[key], null, 2));
		} catch (error) {
			Logger.error(`Failed to save ${key} data: ${error}`);
		}
	}

	getGuildSettings(guildId: string): any {
		return this.data.guildSettings[guildId] || null;
	}

	setGuildSettings(guildId: string, settings: any): any {
		this.data.guildSettings[guildId] = settings;
		this.save("guildSettings");
		return settings;
	}

	getAllGuildSettings(): any[] {
		return Object.values(this.data.guildSettings);
	}

	getTicketConfig(guildId: string): any {
		return this.data.ticketConfig[guildId] || null;
	}

	setTicketConfig(guildId: string, config: any): any {
		this.data.ticketConfig[guildId] = config;
		this.save("ticketConfig");
		return config;
	}
}

let storage: JsonStorage | null = null;
let useFallback = false;

export class Database {
	static async connect() {
		const uri = process.env.MONGODB_URI || "";

		if (!uri) {
			Logger.warn("MONGODB_URI not found, using JSON file storage");
			storage = new JsonStorage();
			useFallback = true;
			Logger.success("Using JSON file storage (fallback mode)");
			return;
		}

		if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
			Logger.warn("Invalid MongoDB URI, using JSON file storage");
			storage = new JsonStorage();
			useFallback = true;
			Logger.success("Using JSON file storage (fallback mode)");
			return;
		}

		try {
			await mongoose.connect(uri);
			Logger.success("Connected to MongoDB database");
		} catch (error) {
			Logger.warn(`Failed to connect to MongoDB: ${error}, using JSON file storage`);
			storage = new JsonStorage();
			useFallback = true;
			Logger.success("Using JSON file storage (fallback mode)");
		}
	}

	static async disconnect() {
		if (useFallback) {
			Logger.info("Disconnected from JSON file storage");
			return;
		}
		try {
			await mongoose.disconnect();
			Logger.info("Disconnected from MongoDB database");
		} catch (error) {
			Logger.error(`Error disconnecting from MongoDB: ${error}`);
		}
	}

	static isUsingFallback(): boolean {
		return useFallback;
	}

	static getStorage(): JsonStorage | null {
		return storage;
	}
}
