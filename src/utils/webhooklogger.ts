import { WebhookClient, EmbedBuilder } from "discord.js";
import { Logger, LoggerEvents } from "./logger";

/**
 * WebhookLogger
 *
 * Changes made:
 * - Startup webhook (logStartup) has been disabled (no-op).
 * - Command usage logging remains a no-op.
 * - Optional forwarding of Logger.warn and Logger.error to the webhook is supported via
 *   environment variables WEBHOOK_WARNINGS=true and WEBHOOK_ERRORS=true.
 * - To avoid recursion when forwarding Logger.error, original Logger methods are captured
 *   and used for local logging inside this module.
 */

export class WebhookLogger {
  private static webhookClient: WebhookClient | null = null;

  // Preserve original logger functions to avoid recursion when we patch Logger
  private static originalLoggerError =
    (Logger as any).error?.bind(Logger) ?? ((msg: string) => {});
  private static originalLoggerWarn =
    (Logger as any).warn?.bind(Logger) ?? ((msg: string) => {});
  private static originalLoggerInfo =
    (Logger as any).info?.bind(Logger) ?? ((msg: string) => {});

  static initialize() {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        this.webhookClient = new WebhookClient({ url: webhookUrl });
        // Use original info logger so we don't trigger forwarding here
        try {
          this.originalLoggerInfo("Webhook logger initialized successfully");
        } catch {}

        // Controlled by env vars:
        // - By default forwarding is ENABLED. Set the env var to 'false' to disable.
        // - WEBHOOK_WARNINGS=false to disable forwarding of warnings (enabled by default)
        // - WEBHOOK_ERRORS=false to disable forwarding of errors (enabled by default)
        const forwardWarnings = process.env.WEBHOOK_WARNINGS !== "false";
        const forwardErrors = process.env.WEBHOOK_ERRORS !== "false";

        // Subscribe to LoggerEvents to forward console-level warns/errors to the webhook.
        // This avoids patching Logger methods directly and prevents accidental recursion.
        if (forwardWarnings) {
          try {
            LoggerEvents.on("warn", (message: string) => {
              try {
                // Keep local logging behavior via console.warn to avoid recursion
                console.warn(String(message));
              } catch {}

              // Fire-and-forget to webhook
              try {
                WebhookLogger.logWarning(
                  "Runtime Warning",
                  String(message),
                ).catch(() => {});
              } catch {}
            });

            try {
              this.originalLoggerInfo(
                "Logger.warn forwarding to webhook enabled via LoggerEvents (default or WEBHOOK_WARNINGS!=false)",
              );
            } catch {}
          } catch (err) {
            try {
              this.originalLoggerError(
                `Failed to enable LoggerEvents warn forwarding: ${err}`,
              );
            } catch {}
          }
        }

        if (forwardErrors) {
          try {
            LoggerEvents.on("error", (message: string) => {
              try {
                // Keep local logging behavior via console.error to avoid recursion
                console.error(String(message));
              } catch {}

              // Fire-and-forget: send a minimal error report to webhook
              try {
                WebhookLogger.logError(
                  "RuntimeError",
                  String(message),
                  null,
                  null,
                  null,
                ).catch(() => {});
              } catch {}
            });

            try {
              this.originalLoggerInfo(
                "Logger.error forwarding to webhook enabled via LoggerEvents (default or WEBHOOK_ERRORS!=false)",
              );
            } catch {}
          } catch (err) {
            try {
              this.originalLoggerError(
                `Failed to enable LoggerEvents error forwarding: ${err}`,
              );
            } catch {}
          }
        }
      } catch (error) {
        try {
          this.originalLoggerError(
            `Failed to initialize webhook logger: ${error}`,
          );
        } catch {}
      }
    } else {
      try {
        this.originalLoggerWarn(
          "WEBHOOK_URL not found in environment variables",
        );
      } catch {}
    }
  }

  /**
   * Command usage logging intentionally disabled to respect privacy.
   * Method kept to preserve existing call sites.
   */
  static async logCommandUsage(
    commandName: string,
    userId: string,
    userTag: string,
    guildId: string | null,
    guildName: string | null,
    channelId: string,
    isSuccess: boolean = true,
    error: string | null = null,
  ) {
    // NO-OP
    return;
  }

  /**
   * Log a warning to the configured webhook.
   * Only sends if WEBHOOK_WARNINGS=true.
   */
  static async logWarning(
    warningType: string,
    message: string,
    userId: string | null = null,
    commandName: string | null = null,
  ) {
    if (!this.webhookClient) return;
    if (process.env.WEBHOOK_WARNINGS === "false") return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Bot Warning")
        .setColor(0xffff00)
        .addFields(
          { name: "Type", value: warningType, inline: true },
          {
            name: "Message",
            value: String(message).substring(0, 1024),
            inline: false,
          },
        )
        .setTimestamp();

      if (userId) {
        embed.addFields({ name: "User", value: userId, inline: true });
      }

      if (commandName) {
        embed.addFields({ name: "Command", value: commandName, inline: true });
      }

      await this.webhookClient.send({
        embeds: [embed],
        username: "Bot Warning Logger",
        avatarURL:
          "https://cdn.discordapp.com/avatars/1398003581512056854/a_940a43c9f073d76847788a8982f08c25.gif?size=1024&animated=true",
      });
    } catch (webhookError) {
      // Use console.error to avoid recursion in webhook logging failures
      try {
        console.error(`Failed to send warning webhook log: ${webhookError}`);
      } catch {}
    }
  }

  /**
   * Log an error to the configured webhook.
   * This function will not call Logger.error for its internal failures to prevent recursion.
   */
  static async logError(
    errorType: string,
    errorMessage: string,
    stackTrace: string | null,
    userId: string | null,
    commandName: string | null,
  ) {
    if (!this.webhookClient) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Bot Error")
        .setColor(0xff0000)
        .addFields(
          { name: "Type", value: errorType, inline: true },
          {
            name: "Message",
            value: String(errorMessage).substring(0, 1024),
            inline: false,
          },
        )
        .setTimestamp();

      if (userId) {
        embed.addFields({ name: "User", value: userId, inline: true });
      }

      if (commandName) {
        embed.addFields({ name: "Command", value: commandName, inline: true });
      }

      if (stackTrace) {
        embed.addFields({
          name: "Stack Trace",
          value: `\`\`\`${String(stackTrace).substring(0, 1000)}\`\`\``,
        });
      }

      await this.webhookClient.send({
        embeds: [embed],
        username: "Bot Error Logger",
        avatarURL:
          "https://cdn.discordapp.com/avatars/1398003581512056854/a_940a43c9f073d76847788a8982f08c25.gif?size=1024&animated=true",
      });
    } catch (webhookError) {
      // Use console.error to avoid recursion in webhook logging failures
      try {
        console.error(`Failed to send error webhook log: ${webhookError}`);
      } catch {}
    }
  }

  static async logStartup(
    botName: string,
    guildCount: number,
    userCount: number,
  ) {
    return;
  }
}

// Initialize webhook logger
WebhookLogger.initialize();
