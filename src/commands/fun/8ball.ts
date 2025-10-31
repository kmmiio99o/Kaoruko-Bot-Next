import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "8ball",
  description: "Ask the magic 8-ball a question",
  category: "fun",
  slashCommand: true,
  prefixCommand: true,
  usage: "Slash: /8ball [question:<question>]\nPrefix: .8ball <question>",

  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question for the magic 8-ball")
        .setRequired(true),
    ),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
  ) {
    const isSlashCommand = !!interaction;
    let question: string;

    if (isSlashCommand && interaction) {
      question = interaction.options.getString("question", true);
    } else if (args && args.length > 0) {
      question = args.join(" ");
    } else {
      // Handle missing question for prefix command
      if (message) {
        await message.reply({
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

    if (isSlashCommand && interaction) {
      await interaction.reply({ embeds: [embed] });
    } else if (message) {
      await message.reply({ embeds: [embed] });
    }
  },
};
