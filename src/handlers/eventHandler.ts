import { events } from "@manifest";
import { Logger } from "@utils/logger";
import type { Client } from "discord.js";
import type { Event } from "@/types";

export class EventHandler {
	async loadEvents(client: Client) {
		let loadedCount = 0;

		for (const entry of events) {
			try {
				const eventModule = await entry.module;
				const event: Event = (eventModule as any).default || eventModule;

				if (!event.name) {
					Logger.warn(`Invalid event in ${entry.path}`);
					continue;
				}

				if (event.once) {
					client.once(event.name, (...args) => event.execute(...args, client));
				} else {
					client.on(event.name, (...args) => event.execute(...args, client));
				}

				Logger.info(`Loaded event: ${event.name}`);
				loadedCount++;
			} catch (error) {
				Logger.error(`Error loading event ${entry.path}: ${error}`);
			}
		}

		Logger.success(`Loaded ${loadedCount} events`);
	}
}
