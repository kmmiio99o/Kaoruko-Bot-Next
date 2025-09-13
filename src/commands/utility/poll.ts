import { ChatInputCommandInteraction, Message } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default {
  name: "poll",
  description: "Create an interactive poll with up to 6 options",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  usage:
    'Slash: /poll <question> <option1> <option2> [option3] [option4] [option5] [option6] [anonymous] [duration]\nPrefix: .poll "<question>" "<option1>" "<option2>" ["<option3>"] ["<option4>"] ["<option5>"] ["<option6>"] [anonymous:true] [duration:10]',
  examples: [
    '/poll "What is your favorite color?" "Red" "Blue" "Green"',
    '/poll "Team A or B?" "Team A" "Team B" anonymous:true duration:10',
  ],
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    try {
      // Determine if this is a slash command or prefix command
      const isSlashCommand = !!interaction;
      const creatorTag = isSlashCommand
        ? interaction?.user.tag
        : message?.author.tag;
      const creatorId = isSlashCommand
        ? interaction?.user.id
        : message?.author.id;

      Logger.logWithContext(
        "POLL",
        `User ${creatorTag} (${creatorId}) creating poll`,
        "info",
      );

      let question: string;
      let options: (string | null)[] = [];
      let anonymous: boolean = false;
      let duration: number = 0;

      if (isSlashCommand && interaction) {
        question = interaction.options.getString("question", true);
        options.push(interaction.options.getString("option1", true));
        options.push(interaction.options.getString("option2", true));
        options.push(interaction.options.getString("option3"));
        options.push(interaction.options.getString("option4"));
        options.push(interaction.options.getString("option5"));
        options.push(interaction.options.getString("option6"));
        anonymous = interaction.options.getBoolean("anonymous") || false;
        duration = interaction.options.getInteger("duration") || 0;
      } else if (message && args) {
        // --- FIX FOR PREFIX COMMANDS ---
        // Regex to find content inside double quotes
        const quotedArgs = message.content.match(/"[^"]+"/g);
        if (!quotedArgs || quotedArgs.length < 3) {
          return await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Poll",
                'You need at least a question and two options, all enclosed in double quotes.\nUsage: `.poll "<question>" "<option1>" "<option2>" ["<option3>"]...`',
              ),
            ],
          });
        }

        // Remove quotes and assign arguments
        question = quotedArgs[0].slice(1, -1);
        for (let i = 1; i < quotedArgs.length && i <= 6; i++) {
          options.push(quotedArgs[i].slice(1, -1));
        }

        // Check for anonymous and duration flags outside of quotes
        const otherArgs = message.content
          .replace(/"[^"]+"/g, "")
          .split(/\s+/)
          .filter((a) => a !== "");
        for (const arg of otherArgs) {
          if (arg.toLowerCase() === "anonymous:true") {
            anonymous = true;
          } else if (arg.startsWith("duration:")) {
            const durationValue = parseInt(arg.split(":")[1]);
            if (
              !isNaN(durationValue) &&
              durationValue >= 0 &&
              durationValue <= 1440
            ) {
              duration = durationValue;
            }
          }
        }
        // --- END OF FIX ---
      } else {
        // No valid command context
        return;
      }

      // Filter out null options
      const filteredOptions = options.filter(
        (opt): opt is string => opt !== null,
      );

      if (filteredOptions.length < 2) {
        Logger.logWithContext(
          "POLL",
          `User ${creatorTag} provided insufficient options`,
          "warn",
        );

        if (isSlashCommand && interaction) {
          return await interaction.reply({
            embeds: [
              Embeds.error(
                "Invalid Poll",
                "You need at least 2 options to create a poll.",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          return await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Poll",
                "You need at least 2 options to create a poll.",
              ),
            ],
          });
        }
        return;
      }

      if (duration > 0 && (duration < 1 || duration > 1440)) {
        Logger.logWithContext(
          "POLL",
          `User ${creatorTag} provided invalid duration: ${duration}`,
          "warn",
        );

        if (isSlashCommand && interaction) {
          return await interaction.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Poll duration must be between 1 and 1440 minutes (24 hours).",
              ),
            ],
            flags: [64],
          });
        } else if (message) {
          return await message.reply({
            embeds: [
              Embeds.error(
                "Invalid Duration",
                "Poll duration must be between 1 and 1440 minutes (24 hours).",
              ),
            ],
          });
        }
        return;
      }

      // Create poll embed with better formatting
      const pollEmbed = Embeds.info("📊 **Poll**", `**${question}**`)
        .setFooter({
          text: anonymous ? "Anonymous poll" : `Created by ${creatorTag}`,
          iconURL: anonymous
            ? undefined
            : isSlashCommand
              ? interaction?.user.displayAvatarURL()
              : message?.author.displayAvatarURL(),
        })
        .setTimestamp();

      // Add poll info field
      let infoText = `📊 **${filteredOptions.length}** options\n`;
      if (duration > 0) {
        const endTime = new Date(Date.now() + duration * 60000);
        infoText += `⏰ **Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n`;
      }
      infoText += `🆔 **ID:** _Use this for /endpoll_\n`;

      pollEmbed.addFields({
        name: "📋 **Poll Info**",
        value: infoText,
        inline: false,
      });

      // Add options to embed with emojis
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];
      let optionsText = "";
      filteredOptions.forEach((option, index) => {
        optionsText += `${emojis[index]} **${option}**\n`;
      });

      pollEmbed.addFields({
        name: "🗳️ **Options**",
        value: optionsText,
        inline: false,
      });

      // Add instructions
      pollEmbed.addFields({
        name: "💡 **How to Vote**",
        value: "React with the emoji corresponding to your choice",
        inline: false,
      });

      let pollMessage: Message | null = null;
      if (isSlashCommand && interaction) {
        await interaction.reply({ embeds: [pollEmbed] });
        pollMessage = (await interaction?.fetchReply()) as Message;
      } else if (message) {
        // --- REACTION FIX: Store the bot's reply message
        pollMessage = await message.reply({ embeds: [pollEmbed] });

        // --- ANONYMOUS OPTION FIX: Delete the user's message if anonymous
        if (anonymous) {
          try {
            await message.delete();
          } catch (error) {
            Logger.logWithContext(
              "POLL",
              `Failed to delete creator's message for anonymous poll: ${error}`,
              "error",
            );
          }
        }
      }

      if (!pollMessage) {
        Logger.logWithContext(
          "POLL",
          "Failed to get poll message object.",
          "error",
        );
        return;
      }

      Logger.logWithContext(
        "POLL",
        `Poll created successfully with ID: ${pollMessage?.id}`,
        "success",
      );

      // Add reactions
      if (pollMessage) {
        for (let i = 0; i < filteredOptions.length; i++) {
          try {
            await pollMessage.react(emojis[i]);
            Logger.logWithContext(
              "POLL",
              `Added reaction ${emojis[i]} to poll ${pollMessage.id}`,
              "debug",
            );
          } catch (error) {
            Logger.logWithContext(
              "POLL",
              `Failed to add reaction ${emojis[i]}: ${error}`,
              "error",
            );
          }
        }
      }

      // Store poll data
      const pollData = {
        messageId: pollMessage?.id,
        channelId: pollMessage?.channelId,
        guildId: pollMessage?.guildId,
        creatorId: creatorId,
        question,
        options: filteredOptions.map((opt: string, i: number) => ({
          emoji: emojis[i],
          text: opt,
        })),
        anonymous,
        createdAt: new Date(),
        endsAt: duration > 0 ? new Date(Date.now() + duration * 60000) : null,
      };

      // Store in client (temporary)
      const client = isSlashCommand ? interaction?.client : message?.client;
      if (client) {
        if (!(client as any).polls) {
          (client as any).polls = new Map<string, any>();
        }
        (client as any).polls.set(pollMessage?.id, pollData);
        Logger.logWithContext(
          "POLL",
          `Poll data stored for poll ${pollMessage?.id}`,
          "debug",
        );
      }

      // Set timeout for poll end
      if (duration > 0 && client) {
        Logger.logWithContext(
          "POLL",
          `Setting timeout for poll ${pollMessage?.id} to end in ${duration} minutes`,
          "info",
        );
        // Add this conditional check
        if (pollMessage?.id) {
          setTimeout(async () => {
            try {
              await endPoll(client, pollMessage.id); // 'pollMessage.id' is now guaranteed to be a string
            } catch (error) {
              Logger.logWithContext(
                "POLL",
                `Error ending timed poll ${pollMessage?.id}: ${error}`,
                "error",
              );
            }
          }, duration * 60000);
        }
      }
    } catch (error) {
      Logger.logWithContext("POLL", `Error creating poll: ${error}`, "error");

      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Poll Creation Failed",
              "An error occurred while creating the poll.",
            ),
          ],
          flags: [64],
        });
      } else if (message) {
        await message.reply({
          embeds: [
            Embeds.error(
              "Poll Creation Failed",
              "An error occurred while creating the poll.",
            ),
          ],
        });
      }
    }
  },
} as Command;

// Function to end poll and show results
async function endPoll(client: any, pollId: string) {
  Logger.logWithContext("POLL", `Ending poll ${pollId}`, "info");

  const polls = client.polls;
  if (!polls || !polls.has(pollId)) {
    Logger.logWithContext("POLL", `Poll ${pollId} not found`, "warn");
    return;
  }

  const pollData = polls.get(pollId);

  try {
    const channel = await client.channels.fetch(pollData.channelId);
    if (!channel?.isTextBased()) {
      Logger.logWithContext(
        "POLL",
        `Channel not found for poll ${pollId}`,
        "error",
      );
      return;
    }

    const pollMessage = await channel.messages.fetch(pollId);
    if (!pollMessage) {
      Logger.logWithContext(
        "POLL",
        `Message not found for poll ${pollId}`,
        "error",
      );
      return;
    }

    // Get final vote counts
    const finalResults: Record<string, number> = {};
    let totalVotes = 0;

    for (const option of pollData.options) {
      try {
        const reaction = pollMessage.reactions.cache.get(option.emoji);
        const count = reaction ? reaction.count - 1 : 0; // -1 to exclude bot's reaction
        finalResults[option.emoji] = count;
        totalVotes += count;
        Logger.logWithContext(
          "POLL",
          `Option ${option.emoji}: ${count} votes`,
          "debug",
        );
      } catch (error) {
        Logger.logWithContext(
          "POLL",
          `Error getting votes for ${option.emoji}: ${error}`,
          "error",
        );
        finalResults[option.emoji] = 0;
      }
    }

    // Find winner(s)
    let maxVotes = Math.max(...Object.values(finalResults));
    const winners = Object.keys(finalResults).filter(
      (emoji) => finalResults[emoji] === maxVotes,
    );

    Logger.logWithContext(
      "POLL",
      `Poll results - Max votes: ${maxVotes}, Winners: ${winners.join(", ")}`,
      "info",
    );

    // Create results embed
    const resultsEmbed = Embeds.success(
      "📊 **Poll Results**",
      `**${pollData.question}**`,
    )
      .setFooter({
        text: pollData.anonymous
          ? "Anonymous poll results"
          : `Poll created by ${await getUserName(client, pollData.creatorId)}`,
        iconURL: pollData.anonymous
          ? undefined
          : await getUserAvatar(client, pollData.creatorId),
      })
      .setTimestamp(pollData.createdAt);

    // Add poll info
    const pollOptionsCount = pollData.options.length;
    resultsEmbed.addFields({
      name: "📋 **Poll Info**",
      value: `📊 **${pollOptionsCount}** options\n🆔 **ID:** \`${pollId}\``,
      inline: false,
    });

    // Add results for each option
    let resultsText = "";
    for (const option of pollData.options) {
      const votes = finalResults[option.emoji] || 0;
      const percentage =
        totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : "0.0";
      resultsText += `${option.emoji} **${option.text}** - ${votes} vote${votes !== 1 ? "s" : ""} (${percentage}%)\n`;
    }

    resultsEmbed.addFields({
      name: "🗳️ **Results**",
      value: resultsText,
      inline: false,
    });

    // Add winner info
    if (totalVotes > 0) {
      if (winners.length === 1) {
        const winningOption = pollData.options.find(
          (opt: any) => opt.emoji === winners[0],
        );
        if (winningOption) {
          resultsEmbed.addFields({
            name: "🏆 **Winner**",
            value: `${winners[0]} **${winningOption.text}** with **${maxVotes}** vote${maxVotes !== 1 ? "s" : ""}`,
            inline: false,
          });
        }
      } else {
        resultsEmbed.addFields({
          name: "🤝 **Tie**",
          value: `Multiple options tied with **${maxVotes}** vote${maxVotes !== 1 ? "s" : ""} each!`,
          inline: false,
        });
      }
    } else {
      resultsEmbed.addFields({
        name: "📭 **No Votes**",
        value: "Nobody voted in this poll.",
        inline: false,
      });
    }

    // Add total votes
    resultsEmbed.addFields({
      name: "📈 **Total Votes**",
      value: `**${totalVotes}** total vote${totalVotes !== 1 ? "s" : ""}`,
      inline: false,
    });

    // Edit the original message with results
    await pollMessage.edit({ embeds: [resultsEmbed] });
    Logger.logWithContext(
      "POLL",
      `Poll ${pollId} results displayed successfully`,
      "success",
    );

    // Remove from active polls
    polls.delete(pollId);
    Logger.logWithContext(
      "POLL",
      `Poll ${pollId} removed from active polls`,
      "debug",
    );
  } catch (error) {
    Logger.logWithContext(
      "POLL",
      `Error ending poll ${pollId}: ${error}`,
      "error",
    );
  }
}

// Helper functions
async function getUserName(client: any, userId: string): Promise<string> {
  try {
    const user = await client.users.fetch(userId);
    return user.tag;
  } catch {
    return "Unknown User";
  }
}

async function getUserAvatar(
  client: any,
  userId: string,
): Promise<string | undefined> {
  try {
    const user = await client.users.fetch(userId);
    return user.displayAvatarURL();
  } catch {
    return undefined;
  }
}

// Export endPoll function for use by other commands
export { endPoll };
