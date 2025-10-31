import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";
import { PollManager } from "../../utils/pollManager";

export const command: ICommand = {
  name: "poll",
  description: "Create an interactive poll",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage:
    'Slash: /poll question:"Your question" options:"Option 1,Option 2,Option 3" [duration:60] [anonymous:true]\nPrefix: .poll "Your question" "Option 1" "Option 2" [duration:60] [anonymous:true]',
  examples: [
    '/poll question:"What\'s your favorite color?" options:"Red,Blue,Green"',
    '/poll question:"Should we have pizza for lunch?" options:"Yes,No" duration:30',
    '.poll "Best programming language?" "JavaScript" "Python" "TypeScript"',
  ],

  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create an interactive poll")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The poll question")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Poll options separated by commas (max 5)")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Poll duration in minutes (default: 60, max: 1440)")
        .setMinValue(1)
        .setMaxValue(1440)
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("anonymous")
        .setDescription("Hide who voted for what (default: false)")
        .setRequired(false),
    ),

  async run(
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
  ) {
    try {
      const isSlashCommand = !!interaction;
      let question: string;
      let options: string[];
      let duration = 60; // Default 60 minutes
      let anonymous = false;

      if (isSlashCommand && interaction) {
        // Handle slash command
        question = interaction.options.getString("question", true);
        const optionsString = interaction.options.getString("options", true);
        options = optionsString.split(",").map((opt) => opt.trim());
        duration = interaction.options.getInteger("duration") || 60;
        anonymous = interaction.options.getBoolean("anonymous") || false;
      } else if (message && args && args.length >= 2) {
        // Handle prefix command
        // Parse quoted arguments
        const quotedArgs = message.content.match(/"([^"]+)"/g);

        if (!quotedArgs || quotedArgs.length < 2) {
          await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Format",
                'Please use quotes around your question and options.\nExample: `.poll "Your question?" "Option 1" "Option 2"`',
              ),
            ],
          });
          return;
        }

        question = quotedArgs[0].slice(1, -1); // Remove quotes
        options = quotedArgs.slice(1).map((opt) => opt.slice(1, -1)); // Remove quotes from options

        // Parse additional options from remaining args
        const remainingArgs = args.filter(
          (arg) => !quotedArgs.some((quoted) => quoted.includes(arg)),
        );

        for (const arg of remainingArgs) {
          if (
            arg.toLowerCase() === "anonymous:true" ||
            arg.toLowerCase() === "anonymous"
          ) {
            anonymous = true;
          } else if (arg.startsWith("duration:")) {
            const durationValue = parseInt(arg.split(":")[1]);
            if (
              !isNaN(durationValue) &&
              durationValue >= 1 &&
              durationValue <= 1440
            ) {
              duration = durationValue;
            }
          }
        }
      } else {
        // Invalid usage
        const errorEmbed = Embeds.error(
          "Invalid Usage",
          isSlashCommand
            ? "Please provide a question and options for the poll."
            : 'Use: `.poll "Your question?" "Option 1" "Option 2"`',
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Validate options
      if (options.length < 2) {
        const errorEmbed = Embeds.error(
          "Not Enough Options",
          "A poll needs at least 2 options.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      if (options.length > 5) {
        const errorEmbed = Embeds.error(
          "Too Many Options",
          "A poll can have a maximum of 5 options.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Validate question length
      if (question.length > 256) {
        const errorEmbed = Embeds.error(
          "Question Too Long",
          "Poll question cannot exceed 256 characters.",
        );

        if (isSlashCommand && interaction) {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        } else if (message) {
          await message.reply({ embeds: [errorEmbed] });
        }
        return;
      }

      // Validate option lengths
      for (const option of options) {
        if (option.length > 100) {
          const errorEmbed = Embeds.error(
            "Option Too Long",
            "Poll options cannot exceed 100 characters each.",
          );

          if (isSlashCommand && interaction) {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          } else if (message) {
            await message.reply({ embeds: [errorEmbed] });
          }
          return;
        }
      }

      // Create poll embed
      const embed = new EmbedBuilder()
        .setTitle("📊 " + question)
        .setColor("#5865F2")
        .setTimestamp()
        .setFooter({
          text: `Poll by ${isSlashCommand ? interaction!.user.username : message!.author.username} • Duration: ${duration} min${anonymous ? " • Anonymous" : ""}`,
          iconURL: isSlashCommand
            ? interaction!.user.displayAvatarURL()
            : message!.author.displayAvatarURL(),
        });

      // Add options to embed
      let description = "**React with the buttons below to vote!**\n\n";
      for (let i = 0; i < options.length; i++) {
        description += `${getNumberEmoji(i + 1)} ${options[i]}\n`;
      }
      embed.setDescription(description);

      // Create buttons
      const row = new ActionRowBuilder<ButtonBuilder>();
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

      for (let i = 0; i < options.length; i++) {
        const button = new ButtonBuilder()
          .setCustomId(`poll_vote_${i}`)
          .setLabel(options[i].substring(0, 80)) // Discord button label limit
          .setStyle(ButtonStyle.Primary)
          .setEmoji(emojis[i]);

        row.addComponents(button);
      }

      // Send the poll
      let pollMessage;
      if (isSlashCommand && interaction) {
        await interaction.reply({ embeds: [embed], components: [row] });
        pollMessage = await interaction.fetchReply();
      } else if (message) {
        pollMessage = await message.reply({
          embeds: [embed],
          components: [row],
        });
      }

      if (!pollMessage) {
        return;
      }

      // Create poll data
      const pollData = {
        messageId: pollMessage.id,
        channelId: isSlashCommand ? interaction!.channelId : message!.channelId,
        guildId: isSlashCommand ? interaction!.guildId : message!.guildId,
        question,
        options,
        votes: new Map(),
        anonymous,
        duration: duration * 60 * 1000, // Convert to milliseconds
        createdAt: Date.now(),
        createdBy: isSlashCommand ? interaction!.user.id : message!.author.id,
      };

      // Register poll with PollManager
      PollManager.createPoll(pollData);

      // Schedule poll end
      setTimeout(
        () => {
          PollManager.endPoll(pollMessage.id);
        },
        duration * 60 * 1000,
      );
    } catch (error) {
      console.error("Error in poll command:", error);

      const errorEmbed = Embeds.error(
        "Poll Error",
        "An error occurred while creating the poll. Please try again.",
      );

      if (interaction) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } else if (message) {
        await message.reply({ embeds: [errorEmbed] });
      }
    }
  },
};

function getNumberEmoji(number: number): string {
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  return emojis[number - 1] || "❓";
}
