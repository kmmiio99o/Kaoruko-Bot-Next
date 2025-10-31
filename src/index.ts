import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  PresenceData,
} from "discord.js";
import { config } from "./config/config";
import { CommandHandler } from "./handlers/commandHandler";
import { EventHandler } from "./handlers/eventHandler";
import { Logger } from "./utils/logger";
import { Embeds } from "./utils/embeds";
import { WebhookLogger } from "./utils/webhooklogger";
import { Database } from "./config/database";
import { DatabaseService } from "./services/DatabaseService";
import { WebServer } from "./services/WebServer";
import { TicketInteractionHandler } from "./handlers/ticketInteractionHandler";

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
const webServer = new WebServer(client, commandHandler, config.webPort);
const ticketHandler = new TicketInteractionHandler();

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

client.once("clientReady", async () => {
  // Set start time for uptime calculation
  startTime = Date.now();
  Logger.success(`Bot is ready! Logged in as ${client.user?.tag}`);

  try {
    // Start web server first (independent of database)
    await webServer.start();

    // Try to connect to database (optional for web server)
    try {
      await Database.connect();
      Logger.success("Connected to database successfully!");
    } catch (dbError) {
      Logger.warn(`Database connection failed: ${dbError}`);
      Logger.info("Bot will continue without database connection");
    }

    const guildCount = client.guilds.cache.size;
    let userCount = 0;
    client.guilds.cache.forEach((guild) => {
      userCount += guild.memberCount || 0;
    });

    try {
      WebhookLogger.logStartup(
        client.user?.tag || "Unknown Bot",
        guildCount,
        userCount,
      );
    } catch (webhookError) {
      Logger.warn(`Webhook logging failed: ${webhookError}`);
    }

    await commandHandler.loadCommands(config.clientId, config.token);
    await eventHandler.loadEvents(client);

    // Start status rotation
    updateStatus(client);
    statusInterval = setInterval(() => updateStatus(client), 15000);

    Logger.success("Bot initialized successfully!");
  } catch (error) {
    Logger.error(`Failed to initialize bot: ${error}`);
    try {
      WebhookLogger.logError(
        "BotInitialization",
        String(error),
        null,
        null,
        null,
      );
    } catch (webhookError) {
      Logger.warn(`Webhook logging failed: ${webhookError}`);
    }
  }
});

// Status update functions
async function updateStatus(client: Client) {
  if (!client.user) {
    Logger.warn("Client user is not available. Cannot update status.");
    return;
  }

  try {
    const guildCount = client.guilds.cache.size;
    const totalMemberCount = await getTotalMemberCount(client);
    const uptime = getUptime();

    const statusOptions: Array<{ name: string; type: ActivityType }> = [
      {
        name: `${guildCount} servers`,
        type: ActivityType.Watching,
      },
      {
        name: `${totalMemberCount.toLocaleString()} users`,
        type: ActivityType.Watching,
      },
      {
        name: `for commands | /help`,
        type: ActivityType.Listening,
      },
      {
        name: `Uptime: ${uptime}`,
        type: ActivityType.Competing,
      },
    ];

    const randomStatus =
      statusOptions[Math.floor(Math.random() * statusOptions.length)];

    const presenceData: PresenceData = {
      activities: [{ name: randomStatus.name, type: randomStatus.type }],
      status: "idle",
    };

    client.user.setPresence(presenceData);
  } catch (error: any) {
    Logger.error(`Failed to update status: ${error.message}`);
  }
}

async function getTotalMemberCount(client: Client): Promise<number> {
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
  // Handle button interactions for tickets
  if (interaction.isButton() && interaction.customId.startsWith("ticket_")) {
    try {
      await ticketHandler.handleTicketInteraction(interaction);
    } catch (error) {
      Logger.error("Error handling ticket button interaction:" + ": " + error);
    }
    return;
  }

  // Handle string select menu for ticket categories
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "ticket_category_select"
  ) {
    try {
      await ticketHandler.handleCategorySelect(interaction);
    } catch (error) {
      Logger.error("Error handling ticket category selection:" + ": " + error);
    }
    return;
  }

  // Handle modal submissions for tickets
  if (
    interaction.isModalSubmit() &&
    (interaction.customId.startsWith("ticket_") ||
      interaction.customId.startsWith("close_reason_"))
  ) {
    try {
      await ticketHandler.handleModalSubmit(interaction);
    } catch (error) {
      Logger.error("Error handling ticket modal submission:" + ": " + error);
    }
    return;
  }

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
            flags: [64],
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
              flags: [64],
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
            flags: [64],
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
        .slice(0, 25);

      try {
        await interaction.respond(
          filtered.map((choice: string) => ({ name: choice, value: choice })),
        );
      } catch (error) {
        Logger.error(`Failed to respond to autocomplete: ${error}`);
      }
    }
  }
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
    await webServer.stop();
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
