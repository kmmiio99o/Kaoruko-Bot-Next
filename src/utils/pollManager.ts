import {
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { Embeds } from "./embeds";
import { Logger } from "./logger";

interface PollData {
  messageId: string;
  channelId: string;
  guildId: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // userId -> optionIndex
  anonymous: boolean;
  duration: number; // in milliseconds
  createdAt: number;
  createdBy: string;
}

interface PollVoteData {
  userId: string;
  optionIndex: number;
  timestamp: number;
}

export class PollManager {
  private static instance: PollManager;
  private polls: Map<string, PollData> = new Map();
  private votes: Map<string, Map<string, PollVoteData>> = new Map(); // pollId -> userId -> vote data

  public static getInstance(): PollManager {
    if (!PollManager.instance) {
      PollManager.instance = new PollManager();
    }
    return PollManager.instance;
  }

  public static createPoll(pollData: any): void {
    const manager = PollManager.getInstance();
    const poll: PollData = {
      messageId: pollData.messageId,
      channelId: pollData.channelId,
      guildId: pollData.guildId,
      question: pollData.question,
      options: pollData.options,
      votes: new Map(),
      anonymous: pollData.anonymous || false,
      duration: pollData.duration,
      createdAt: pollData.createdAt,
      createdBy: pollData.createdBy,
    };

    manager.polls.set(pollData.messageId, poll);
    manager.votes.set(pollData.messageId, new Map());
    Logger.info(`Poll created: ${pollData.messageId}`);
  }

  public static async endPoll(messageId: string): Promise<boolean> {
    const manager = PollManager.getInstance();
    return await manager.endPollInternal(messageId);
  }

  public static pollExists(messageId: string): boolean {
    const manager = PollManager.getInstance();
    return manager.polls.has(messageId);
  }

  public static getPoll(messageId: string): PollData | undefined {
    const manager = PollManager.getInstance();
    return manager.polls.get(messageId);
  }

  public static async handleVote(
    messageId: string,
    userId: string,
    optionIndex: number,
    client: Client,
  ): Promise<boolean> {
    const manager = PollManager.getInstance();
    return await manager.handleVoteInternal(
      messageId,
      userId,
      optionIndex,
      client,
    );
  }

  private async handleVoteInternal(
    messageId: string,
    userId: string,
    optionIndex: number,
    client: Client,
  ): Promise<boolean> {
    const poll = this.polls.get(messageId);
    const pollVotes = this.votes.get(messageId);

    if (!poll || !pollVotes) {
      return false;
    }

    // Check if poll is still active
    const now = Date.now();
    if (now > poll.createdAt + poll.duration) {
      await this.endPollInternal(messageId);
      return false;
    }

    // Check if option index is valid
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return false;
    }

    // Record/update vote
    const existingVote = pollVotes.get(userId);
    pollVotes.set(userId, {
      userId,
      optionIndex,
      timestamp: now,
    });

    // Update poll message with new vote counts
    await this.updatePollMessage(messageId, client);

    Logger.info(
      `Vote recorded: Poll ${messageId}, User ${userId}, Option ${optionIndex}`,
    );
    return true;
  }

  private async updatePollMessage(
    messageId: string,
    client: Client,
  ): Promise<void> {
    const poll = this.polls.get(messageId);
    const pollVotes = this.votes.get(messageId);

    if (!poll || !pollVotes) return;

    try {
      const channel = (await client.channels.fetch(
        poll.channelId,
      )) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(messageId);
      if (!message) return;

      // Calculate vote counts
      const voteCounts = new Array(poll.options.length).fill(0);
      let totalVotes = 0;

      for (const vote of pollVotes.values()) {
        if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
          voteCounts[vote.optionIndex]++;
          totalVotes++;
        }
      }

      // Update embed
      const embed = new EmbedBuilder()
        .setTitle("📊 " + poll.question)
        .setColor("#5865F2")
        .setTimestamp()
        .setFooter({
          text: `Poll by ${poll.createdBy} • ${totalVotes} vote(s)${poll.anonymous ? " • Anonymous" : ""}`,
        });

      let description = "**Vote using the buttons below!**\n\n";
      for (let i = 0; i < poll.options.length; i++) {
        const count = voteCounts[i];
        const percentage =
          totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const progressBar = this.createProgressBar(percentage);

        description += `${this.getNumberEmoji(i + 1)} ${poll.options[i]}\n`;
        description += `${progressBar} ${count} vote(s) (${percentage}%)\n\n`;
      }

      embed.setDescription(description);

      await message.edit({ embeds: [embed] });
    } catch (error) {
      Logger.error(`Error updating poll message ${messageId}: ${error}`);
    }
  }

  private async endPollInternal(messageId: string): Promise<boolean> {
    const poll = this.polls.get(messageId);
    const pollVotes = this.votes.get(messageId);

    if (!poll || !pollVotes) {
      return false;
    }

    try {
      // Calculate final results
      const voteCounts = new Array(poll.options.length).fill(0);
      let totalVotes = 0;

      for (const vote of pollVotes.values()) {
        if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
          voteCounts[vote.optionIndex]++;
          totalVotes++;
        }
      }

      // Find winner(s)
      const maxVotes = Math.max(...voteCounts);
      const winners = voteCounts
        .map((count, index) => ({ index, count }))
        .filter((item) => item.count === maxVotes);

      // Create results embed
      const embed = new EmbedBuilder()
        .setTitle("📊 Poll Results: " + poll.question)
        .setColor(maxVotes > 0 ? "#00FF00" : "#FFA500")
        .setTimestamp()
        .setFooter({
          text: `Poll ended • ${totalVotes} total vote(s)${poll.anonymous ? " • Anonymous" : ""}`,
        });

      let description = "";

      // Add results for each option
      for (let i = 0; i < poll.options.length; i++) {
        const count = voteCounts[i];
        const percentage =
          totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isWinner = winners.some((w) => w.index === i) && maxVotes > 0;
        const trophy = isWinner ? "🏆 " : "";
        const progressBar = this.createProgressBar(percentage);

        description += `${trophy}${this.getNumberEmoji(i + 1)} **${poll.options[i]}**\n`;
        description += `${progressBar} ${count} vote(s) (${percentage}%)\n\n`;
      }

      // Add winner information
      if (totalVotes === 0) {
        description += "🚫 **No votes were cast**";
      } else if (winners.length === 1) {
        description += `🎉 **Winner:** ${poll.options[winners[0].index]} with ${maxVotes} vote(s)!`;
      } else {
        const winnerNames = winners
          .map((w) => poll.options[w.index])
          .join(", ");
        description += `🤝 **Tie:** ${winnerNames} (${maxVotes} vote(s) each)`;
      }

      embed.setDescription(description);

      // Get the channel and message
      const channel = await poll.channelId; // This should be fetched from client
      // Note: We need client access here, which should be passed from the calling function

      // Clean up
      this.polls.delete(messageId);
      this.votes.delete(messageId);

      Logger.info(`Poll ended: ${messageId}`);
      return true;
    } catch (error) {
      Logger.error(`Error ending poll ${messageId}: ${error}`);
      return false;
    }
  }

  private createProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return "▓".repeat(filled) + "░".repeat(empty);
  }

  private getNumberEmoji(number: number): string {
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
    return emojis[number - 1] || "❓";
  }

  public cleanup(): void {
    // Remove expired polls
    const now = Date.now();
    for (const [messageId, poll] of this.polls.entries()) {
      if (now > poll.createdAt + poll.duration) {
        this.endPollInternal(messageId);
      }
    }
  }
}

// Cleanup expired polls every 5 minutes
setInterval(
  () => {
    PollManager.getInstance().cleanup();
  },
  5 * 60 * 1000,
);
