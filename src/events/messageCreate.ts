import { Client, Message } from "discord.js";

export default {
  name: "messageCreate",
  async execute(message: Message, client: Client) {
    // Ignore bots and system messages
    if (message.author.bot || message.system) return;

    // Ignore DMs
    if (!message.guild) return;

    // Message processing can be added here in the future
  },
};
