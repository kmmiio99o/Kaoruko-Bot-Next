import { Logger } from "@utils/logger";
import type { Guild } from "discord.js";

export default {
	name: "guildCreate",
	async execute(guild: Guild) {
		Logger.info(
			`Joined new guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`,
		);
	},
};
