import { ChatInputCommandInteraction, Message } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";

export default {
  name: "8ball",
  description: "Ask the magic 8-ball a question",
  category: "fun",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /8ball [question:<question>]\nPrefix: .8ball <question>",
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    const isSlashCommand = !!interaction;
    let question;

    if (isSlashCommand) {
      question = interaction!.options.getString("question", true);
    } else if (args && args.length > 0) {
      question = args.join(" ");
    } else {
      // Handle missing question for prefix command
      if (message) {
        return await message.reply({
          embeds: [
            Embeds.error("Invalid Command", "Please provide a question."),
          ],
        });
      }
      return;
    }

    const responses = [
      "It is certain.",
      "It is decidedly so.",
      "Without a doubt.",
      "Yes - definitely.",
      "You may rely on it.",
      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",
      "Reply hazy, try again.",
      "Ask again later.",
      "Better not tell you now.",
      "Cannot predict now.",
      "Concentrate and ask again.",
      "Don't count on it.",
      "My reply is no.",
      "My sources say no.",
      "Outlook not so good.",
      "Very doubtful.",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = Embeds.info(
      "Magic 8-Ball",
      `**Question:** ${question}\n**Answer:** ${response}`,
    );

    if (isSlashCommand) {
      await interaction!.reply({ embeds: [embed] });
    } else if (message) {
      await message.reply({ embeds: [embed] });
    }
  },
} as Command;
