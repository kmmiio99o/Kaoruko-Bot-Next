import { Client } from "discord.js";
import { Event } from "../types";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

export class EventHandler {
  async loadEvents(client: Client) {
    const eventsPath = path.join(__dirname, "../events");

    if (!fs.existsSync(eventsPath)) {
      Logger.warn("Events directory not found");
      return;
    }

    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      try {
        const filePath = path.join(eventsPath, file);
        const eventModule = await import(filePath);
        const event: Event = eventModule.default || eventModule;

        if (!event.name) {
          Logger.warn(`Invalid event in ${file}`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        Logger.info(`Loaded event: ${event.name}`);
      } catch (error) {
        Logger.error(`Error loading event ${file}: ${error}`);
      }
    }

    Logger.success(`Loaded ${eventFiles.length} events`);
  }
}
