import { ActivityType } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.CLIENT_ID || "",
  guildId: process.env.GUILD_ID || "",
  ownerId: process.env.OWNER_ID || "",
  prefix: process.env.PREFIX || ".",
  status: {
    activities: [
      {
        name: "{guilds} servers | {members} members",
        type: ActivityType.Watching,
      },
      {
        name: "Protecting servers",
        type: ActivityType.Playing,
      },
      {
        name: "Moderation commands",
        type: ActivityType.Listening,
      },
    ],
    updateInterval: 30000, // 30 seconds
  },
  colors: {
    success: "#00FF00",
    error: "#FF0000",
    warning: "#FFFF00",
    info: "#0000FF",
    primary: "#5865F2",
  },
  limits: {
    banLimit: 100,
    kickLimit: 100,
    muteLimit: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};
