import { Client, ActivityType, GuildMember } from "discord.js";
import { Logger } from "../utils/logger";
import { config } from "../config/config";

export default {
  name: "clientReady",
  once: true,
  async execute(client: Client) {
    Logger.success(`Bot is ready! Logged in as ${client.user?.tag}`);

    // Start status rotation
    updateStatus(client);
    setInterval(() => updateStatus(client), 10000); // Every 10 seconds
  },
};

async function updateStatus(client: Client) {
  if (!client.user) return;

  try {
    const guildCount = client.guilds.cache.size;
    let memberCount = 0;
    await Promise.all(
      client.guilds.cache.map(async (guild) => {
        await guild.members
          .fetch()
          .catch((err) =>
            Logger.error(
              `Failed to fetch members for guild ${guild.id}: ${err.message}`,
            ),
          );
        memberCount += guild.memberCount || guild.members.cache.size;
      }),
    );

    // More informative status messages
    const statusMessages = [
      {
        name: `${guildCount} servers`,
        type: ActivityType.Watching,
      },
      {
        name: `${memberCount.toLocaleString()} users`,
        type: ActivityType.Watching,
      },
      {
        name: `for commands`,
        type: ActivityType.Listening,
      },
      {
        name: `uptime`,
        type: ActivityType.Competing,
      },
      {
        name: `moderation`,
        type: ActivityType.Playing,
      },
      {
        name: `security`,
        type: ActivityType.Playing,
      },
      {
        name: `messages`,
        type: ActivityType.Listening,
      },
      {
        name: `issues`,
        type: ActivityType.Watching,
      },
    ];

    // Get random status
    const randomStatus =
      statusMessages[Math.floor(Math.random() * statusMessages.length)];

    // Set both activity and status
    client.user.setActivity(randomStatus.name, { type: randomStatus.type });
    client.user.setStatus("idle");

    Logger.info(
      `Status updated: ${randomStatus.name} | ${guildCount} servers | ${memberCount.toLocaleString()} users`,
    );
  } catch (error) {
    Logger.error(`Failed to update status: ${error}`);
  }
}
