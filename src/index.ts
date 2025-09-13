import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

  // Handle button interactions (for polls)
  else if (interaction.isButton()) {
    if (interaction.customId.startsWith("poll_")) {
      const polls = (client as any).polls;
      if (!polls) {
        try {
          if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
          ) {
            await interaction.reply({
              embeds: [Embeds.error("Poll Error", "No active polls found.")],
              flags: [64], // EPHEMERAL flag
            });
          }
        } catch (error) {
          Logger.error(`Failed to send poll error reply: ${error}`);
        }
        return;
      }

      const parts = interaction.customId.split("_");
      if (parts.length !== 3) {
        try {
          if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
          ) {
            await interaction.reply({
              embeds: [
                Embeds.error("Invalid Poll", "This poll button is invalid."),
              ],
              flags: [64], // EPHEMERAL flag
            });
          }
        } catch (error) {
          Logger.error(`Failed to send invalid poll reply: ${error}`);
        }
        return;
      }

      const pollId = interaction.message.id;
      const selectedOption = parts[2];

      const pollData = polls.get(pollId);
      if (!pollData) {
        try {
          if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
          ) {
            await interaction.reply({
              embeds: [
                Embeds.error(
                  "Poll Expired",
                  "This poll has ended or is no longer active.",
                ),
              ],
              flags: [64], // EPHEMERAL flag
            });
          }
        } catch (error) {
          Logger.error(`Failed to send poll expired reply: ${error}`);
        }
        return;
      }

      // Initialize votes object if it doesn't exist
      if (!pollData.votes || typeof pollData.votes !== "object") {
        pollData.votes = {};
      }

      // Initialize voters set if it doesn't exist
      if (!pollData.voters || !(pollData.voters instanceof Set)) {
        pollData.voters = new Set<string>();
      }

      // Check if user already voted - More explicit checking
      let hasVoted = false;
      if (pollData.votes && typeof pollData.votes === "object") {
        hasVoted = pollData.votes[interaction.user.id] !== undefined;
      }

      if (hasVoted) {
        try {
          if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
          ) {
            await interaction.reply({
              embeds: [
                Embeds.error(
                  "Already Voted",
                  "You have already voted in this poll.",
                ),
              ],
              flags: [64], // EPHEMERAL flag
            });
          }
        } catch (error) {
          Logger.error(`Failed to send already voted reply: ${error}`);
        }
        return;
      }

      // Record the vote
      pollData.votes[interaction.user.id] = selectedOption;
      pollData.voters.add(interaction.user.id);

      Logger.logWithContext(
        "POLL",
        `User ${interaction.user.tag} voted for option ${selectedOption} in poll ${pollId}`,
        "info",
      );

      // Confirm vote
      const option = pollData.options.find(
        (opt: any) => opt.letter === selectedOption,
      );
      try {
        if (
          interaction.isRepliable() &&
          !interaction.replied &&
          !interaction.deferred
        ) {
          if (option) {
            await interaction.reply({
              embeds: [
                Embeds.success(
                  "Vote Recorded",
                  `You voted for: **${option.text}**`,
                ),
              ],
              flags: [64], // EPHEMERAL flag
            });
          } else {
            await interaction.reply({
              embeds: [
                Embeds.success("Vote Recorded", `Your vote has been recorded.`),
              ],
              flags: [64], // EPHEMERAL flag
            });
          }
        }
      } catch (error) {
        Logger.error(`Failed to send vote confirmation: ${error}`);
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
