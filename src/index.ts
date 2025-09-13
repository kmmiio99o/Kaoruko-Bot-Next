import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  PresenceStatusData, // Add this import
} from "discord.js";
import { config } from "./config/config";
import { CommandHandler } from "./handlers/commandHandler";
import { EventHandler } from "./handlers/eventHandler";
import { Logger } from "./utils/logger";
import { Embeds } from "./utils/embeds";
import { WebhookLogger } from "./utils/webhooklogger";
import { Database } from "./config/database";
import { DatabaseService } from "./services/DatabaseService";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const commandHandler = new CommandHandler();
const eventHandler = new EventHandler();

// Status system variables
let startTime: number | null = null;
let statusInterval: NodeJS.Timeout | null = null;

(client as any).commandHandler = commandHandler;

process.on("unhandledRejection", (reason, promise) => {
  Logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  WebhookLogger.logError(
    "UnhandledRejection",
    String(reason),
    null,
    null,
    null,
  );
});

process.on("uncaughtException", (error) => {
  Logger.error(`Uncaught Exception: ${error}`);
  WebhookLogger.logError(
    "UncaughtException",
    error.message,
    error.stack || null,
    null,
    null,
  );
  process.exit(1);
});

client.once("ready", async () => {
  // Set start time for uptime calculation
  startTime = Date.now();
  Logger.success(`Bot is ready! Logged in as ${client.user?.tag}`);

  try {
    await Database.connect();

    const guildCount = client.guilds.cache.size;
    let userCount = 0;
    client.guilds.cache.forEach((guild) => {
      userCount += guild.memberCount || 0;
    });

    WebhookLogger.logStartup(
      client.user?.tag || "Unknown Bot",
      guildCount,
      userCount,
    );

    await commandHandler.loadCommands(config.clientId, config.token);
    await eventHandler.loadEvents(client);

    // Start status rotation
    updateStatus(client);
    statusInterval = setInterval(() => updateStatus(client), 15000);

    Logger.success("Bot initialized successfully!");
  } catch (error) {
    Logger.error(`Failed to initialize bot: ${error}`);
    WebhookLogger.logError(
      "BotInitialization",
      String(error),
      null,
      null,
      null,
    );
  }
});

// Status update functions
async function updateStatus(client: Client) {
  if (!client.user) return;

  try {
    const guildCount = client.guilds.cache.size;
    const memberCount = await getMemberCount(client);
    const uptime = getUptime();

    // Define status messages
    const statusOptions = [
      {
        name: `${guildCount} servers`,
        type: ActivityType.Watching,
        status: "online" as PresenceStatusData,
      },
      {
        name: `${memberCount.toLocaleString()} users`,
        type: ActivityType.Watching,
        status: "online" as PresenceStatusData,
      },
      {
        name: `for commands | /help`,
        type: ActivityType.Listening,
        status: "idle" as PresenceStatusData, // Set to idle for this status
      },
      {
        name: `Uptime: ${uptime}`,
        type: ActivityType.Competing,
        status: "online" as PresenceStatusData,
      },
    ];

    // Select a random status from the options
    const randomStatus =
      statusOptions[Math.floor(Math.random() * statusOptions.length)];

    // Set both the activity and status
    client.user.setActivity(randomStatus.name, {
      type: randomStatus.type,
    });

    // Set the status (online, idle, dnd, invisible)
    client.user.setStatus(randomStatus.status);

    Logger.info(
      `Status updated: ${randomStatus.name} | Status: ${randomStatus.status} | ${guildCount} servers | ${memberCount.toLocaleString()} users | Uptime: ${uptime}`,
    );
  } catch (error: any) {
    Logger.error(`Failed to update status: ${error.message}`);
  }
}

async function getMemberCount(client: Client): Promise<number> {
  let totalMemberCount = 0;

  // Use the cached member counts from each guild
  client.guilds.cache.forEach((guild) => {
    totalMemberCount += guild.memberCount || guild.members.cache.size;
  });

  return totalMemberCount;
}

function getUptime(): string {
  if (startTime === null) {
    return "Uptime N/A";
  }

  const uptimeMs = Date.now() - startTime;
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

client.on("interactionCreate", async (interaction: any) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const commandHandler = (client as any).commandHandler;
    if (!commandHandler) return;

    const command = commandHandler.commands.get(interaction.commandName);
    if (!command) {
      try {
        if (interaction.isRepliable()) {
          await interaction.reply({
            embeds: [
              Embeds.error("Command Not Found", "This command does not exist."),
            ],
            flags: [64], // EPHEMERAL flag
          });
        }

        WebhookLogger.logCommandUsage(
          interaction.commandName,
          interaction.user.id,
          interaction.user.tag,
          interaction.guild?.id || null,
          interaction.guild?.name || null,
          interaction.channelId,
          false,
          "Command not found",
        );
      } catch (error) {
        Logger.error(`Failed to send command not found reply: ${error}`);
      }
      return;
    }

    if (command.ownerOnly) {
      const ownerId = process.env.OWNER_ID;
      if (!ownerId || interaction.user.id !== ownerId) {
        try {
          if (interaction.isRepliable()) {
            await interaction.reply({
              embeds: [
                Embeds.error(
                  "Permission Denied",
                  "Only the bot owner can use this command.",
                ),
              ],
              flags: [64], // EPHEMERAL flag
            });
          }

          WebhookLogger.logCommandUsage(
            interaction.commandName,
            interaction.user.id,
            interaction.user.tag,
            interaction.guild?.id || null,
            interaction.guild?.name || null,
            interaction.channelId,
            false,
            "Permission denied - owner only",
          );
        } catch (error) {
          Logger.error(`Failed to send permission denied reply: ${error}`);
        }
        return;
      }
    }

    try {
      await command.run(interaction, undefined, undefined, commandHandler);

      WebhookLogger.logCommandUsage(
        interaction.commandName,
        interaction.user.id,
        interaction.user.tag,
        interaction.guild?.id || null,
        interaction.guild?.name || null,
        interaction.channelId,
        true,
      );
    } catch (error: any) {
      Logger.error(`Error executing command ${command.name}: ${error}`);

      WebhookLogger.logCommandUsage(
        interaction.commandName,
        interaction.user.id,
        interaction.user.tag,
        interaction.guild?.id || null,
        interaction.guild?.name || null,
        interaction.channelId,
        false,
        error.message || String(error),
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        try {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Command Error",
                "An error occurred while executing this command.",
              ),
            ],
            flags: [64], // EPHEMERAL flag
          });
        } catch (replyError) {
          Logger.error(`Failed to send error reply: ${replyError}`);
        }
      }

      WebhookLogger.logError(
        "CommandError",
        error.message || String(error),
        error.stack || null,
        interaction.user.id,
        command.name,
      );
    }
  }

  // Handle autocomplete
  else if (interaction.isAutocomplete()) {
    if (interaction.commandName === "help") {
      const commandHandler = (client as any).commandHandler;
      if (!commandHandler) return;

      const focusedValue = interaction.options.getFocused();
      const commandNames = commandHandler.getAllCommandNames();

      const filtered: string[] = commandNames
        .filter((choice: string) =>
          choice.toLowerCase().includes(focusedValue.toLowerCase()),
        )
        .slice(0, 25); // Discord limit is 25 choices

      try {
        await interaction.respond(
          filtered.map((choice: string) => ({ name: choice, value: choice })),
        );
      } catch (error) {
        Logger.error(`Failed to respond to autocomplete: ${error}`);
      }
    }
  }

  // Note: Poll button handling has been removed as requested
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const commandHandler = (client as any).commandHandler;
  if (!commandHandler) return;

  const command = commandHandler.commands.get(commandName);
  if (!command) {
    try {
      await message.reply({
        embeds: [
          Embeds.error(
            "Command Not Found",
            `The command \`${commandName}\` does not exist.`,
          ),
        ],
      });
    } catch (error) {
      Logger.error(`Failed to send command not found reply: ${error}`);
    }
    return;
  }

  // Check if command supports prefix commands
  if (command.slashCommand === true && command.prefixCommand !== true) {
    try {
      await message.reply({
        embeds: [
          Embeds.error(
            "Command Not Available",
            `The command \`${commandName}\` is only available as a slash command.`,
          ),
        ],
      });
    } catch (error) {
      Logger.error(`Failed to send command not available reply: ${error}`);
    }
    return;
  }

  // Check owner-only commands
  if (command.ownerOnly) {
    const ownerId = process.env.OWNER_ID;
    if (!ownerId || message.author.id !== ownerId) {
      try {
        await message.reply({
          embeds: [
            Embeds.error(
              "Permission Denied",
              "Only the bot owner can use this command.",
            ),
          ],
        });

        WebhookLogger.logCommandUsage(
          commandName,
          message.author.id,
          message.author.tag,
          message.guild?.id || null,
          message.guild?.name || null,
          message.channelId,
          false,
          "Permission denied - owner only",
        );
      } catch (error) {
        Logger.error(`Failed to send permission denied reply: ${error}`);
      }
      return;
    }
  }

  try {
    await command.run(undefined, message, args, commandHandler);

    WebhookLogger.logCommandUsage(
      commandName,
      message.author.id,
      message.author.tag,
      message.guild?.id || null,
      message.guild?.name || null,
      message.channelId,
      true,
    );
  } catch (error: any) {
    Logger.error(`Error executing command ${command.name}: ${error}`);

    WebhookLogger.logCommandUsage(
      commandName,
      message.author.id,
      message.author.tag,
      message.guild?.id || null,
      message.guild?.name || null,
      message.channelId,
      false,
      error.message || String(error),
    );

    WebhookLogger.logError(
      "CommandError",
      error.message || String(error),
      error.stack || null,
      message.author.id,
      command.name,
    );

    try {
      await message.reply({
        embeds: [
          Embeds.error(
            "Command Error",
            "An error occurred while executing this command.",
          ),
        ],
      });
    } catch (replyError) {
      Logger.error(`Failed to send error reply: ${replyError}`);
    }
  }
});

// Handle process exit
process.on("SIGINT", async () => {
  Logger.info("Shutting down bot...");

  // Clear the status interval
  if (statusInterval) {
    clearInterval(statusInterval);
  }

  try {
    await Database.disconnect();
    process.exit(0);
  } catch (error) {
    Logger.error(`Error during shutdown: ${error}`);
    process.exit(1);
  }
});

// Login
client.login(config.token).catch((error) => {
  Logger.error(`Failed to login: ${error}`);
  WebhookLogger.logError(
    "LoginError",
    error.message,
    error.stack || null,
    null,
    null,
  );
  process.exit(1);
});
