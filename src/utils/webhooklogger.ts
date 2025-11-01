import { WebhookClient, EmbedBuilder } from "discord.js";
import { Logger } from "./logger";

export class WebhookLogger {
  private static webhookClient: WebhookClient | null = null;

  static initialize() {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        this.webhookClient = new WebhookClient({ url: webhookUrl });
        Logger.info("Webhook logger initialized successfully");
      } catch (error) {
        Logger.error(`Failed to initialize webhook logger: ${error}`);
      }
    } else {
      Logger.warn("WEBHOOK_URL not found in environment variables");
    }
  }

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
    if (!this.webhookClient) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Executed")
        .setColor(isSuccess ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: "Command", value: `\`${commandName}\``, inline: true },
          { name: "User", value: `${userTag} (${userId})`, inline: true },
          {
            name: "Location",
            value: guildName ? `${guildName} (${guildId})` : "DM",
            inline: true,
          },
          { name: "Channel", value: channelId, inline: true },
          {
            name: "Status",
            value: isSuccess ? "✅ Success" : "❌ Failed",
            inline: true,
          },
        )
        .setTimestamp();

      if (error) {
        embed.addFields({
          name: "Error",
          value: `\`\`\`${error.substring(0, 1000)}\`\`\``,
        });
      }

      await this.webhookClient.send({
        embeds: [embed],
        username: "Bot Command Logger",
        avatarURL: "https://cdn.discordapp.com/embed/avatars/0.png",
      });
    } catch (webhookError) {
      Logger.error(`Failed to send webhook log: ${webhookError}`);
    }
  }

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
            value: errorMessage.substring(0, 1024),
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
          value: `\`\`\`${stackTrace.substring(0, 1000)}\`\`\``,
        });
      }

      await this.webhookClient.send({
        embeds: [embed],
        username: "Bot Error Logger",
        avatarURL: "https://cdn.discordapp.com/embed/avatars/4.png",
      });
    } catch (webhookError) {
      Logger.error(`Failed to send error webhook log: ${webhookError}`);
    }
  }

  static async logStartup(
    botName: string,
    guildCount: number,
    userCount: number,
  ) {
    if (!this.webhookClient) return;

    try {
      // Collect runtime diagnostics
      const uptimeSec = Math.floor(process.uptime() || 0);
      const hours = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = uptimeSec % 60;
      const uptimeReadable = `${hours}h ${mins}m ${secs}s`;

      const mem = process.memoryUsage ? process.memoryUsage() : null;
      const heapMB = mem ? (mem.heapUsed / 1024 / 1024).toFixed(2) : "N/A";
      const rssMB = mem ? (mem.rss / 1024 / 1024).toFixed(2) : "N/A";

      const pid = process.pid?.toString() ?? "N/A";
      const platform = process.platform ?? "unknown";
      const arch = process.arch ?? "unknown";
      const nodeVersion = process.version ?? "unknown";
      const bunVersion =
        typeof (process as any).versions === "object" &&
        (process as any).versions?.bun
          ? (process as any).versions.bun
          : undefined;
      const runtime = bunVersion ? `bun ${bunVersion}` : `node ${nodeVersion}`;
      const env = process.env.NODE_ENV ?? "unknown";
      const hostname =
        process.env.HOSTNAME ?? process.env.COMPUTERNAME ?? "unknown";

      const embed = new EmbedBuilder()
        .setTitle("🚀 Bot Started")
        .setColor(0x0066cc)
        .setDescription(`Instance \`${botName}\` is up and running`)
        .addFields(
          {
            name: "Summary",
            value: `• Guilds: **${guildCount}**\n• Users: **${userCount}**`,
            inline: true,
          },
          {
            name: "Runtime",
            value: `• PID: \`${pid}\`\n• Runtime: ${runtime}\n• Env: \`${env}\``,
            inline: true,
          },
          {
            name: "Uptime / Memory",
            value: `• Uptime: **${uptimeReadable}**\n• Heap: **${heapMB} MB**\n• RSS: **${rssMB} MB**`,
            inline: false,
          },
          {
            name: "Host",
            value: `• Hostname: \`${hostname}\`\n• Platform: \`${platform}\` • Arch: \`${arch}\``,
            inline: true,
          },
        )
        .setTimestamp()
        .setFooter({ text: `Startup at ${new Date().toLocaleString()}` });

      // Add a subtle success username & avatar for clarity
      await this.webhookClient.send({
        embeds: [embed],
        username: "Bot Status Logger",
        avatarURL: "https://cdn.discordapp.com/embed/avatars/1.png",
      });

      // Also log locally for quick console visibility
      try {
        Logger.info(
          `Bot Started: ${botName} — guilds=${guildCount} users=${userCount} uptime=${uptimeReadable} pid=${pid} runtime=${runtime}`,
        );
      } catch {}
    } catch (webhookError) {
      Logger.error(`Failed to send startup webhook log: ${webhookError}`);
    }
  }
}

// Initialize webhook logger
WebhookLogger.initialize();
