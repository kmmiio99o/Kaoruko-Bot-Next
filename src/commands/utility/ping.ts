import { ChatInputCommandInteraction, Message } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";

export default {
  name: "ping",
  description: "Check the bot's latency",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage: "/ping or .ping",
  examples: ["/ping", ".ping"],
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
    commandHandler: any,
  ) {
    if (interaction) {
      // Slash command version
      const sent = await interaction.reply({
        embeds: [Embeds.info("Pinging...", "Calculating ping...")],
        flags: [64], // EPHEMERAL flag
        fetchReply: true,
      });

      const ping = sent.createdTimestamp - interaction.createdTimestamp;
      const apiPing = Math.round(interaction.client.ws.ping);

      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Pong!",
            `🏓 **Latency:** ${ping}ms\n📡 **API Ping:** ${apiPing}ms`,
          ),
        ],
      });
    } else if (message) {
      // Prefix command version
      const sent = await message.reply({
        embeds: [Embeds.info("Pinging...", "Calculating ping...")],
      });

      const ping = sent.createdTimestamp - message.createdTimestamp;
      const apiPing = Math.round(message.client.ws.ping);

      await sent.edit({
        embeds: [
          Embeds.success(
            "Pong!",
            `🏓 **Latency:** ${ping}ms\n📡 **API Ping:** ${apiPing}ms`,
          ),
        ],
      });
    }
  },
} as Command;
