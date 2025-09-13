import { Client, EmbedBuilder, Message } from 'discord.js';
import { config } from '../config/config';
import { Embeds } from './embeds';

export class PollManager {
  private polls: Map<string, PollData> = new Map();

  addPoll(pollData: PollData) {
    this.polls.set(pollData.messageId, pollData);
  }

  getPoll(messageId: string): PollData | undefined {
    return this.polls.get(messageId);
  }

  removePoll(messageId: string) {
    return this.polls.delete(messageId);
  }

  getAllPolls(): PollData[] {
    return Array.from(this.polls.values());
  }

  async endPoll(client: Client, messageId: string) {
    const pollData = this.polls.get(messageId);
    if (!pollData) return false;

    try {
      const channel = await client.channels.fetch(pollData.channelId);
      if (!channel?.isTextBased()) return false;

      const pollMessage = await channel.messages.fetch(messageId);
      if (!pollMessage) return false;

      // Get final vote counts
      const finalResults: Record<string, number> = {};
      for (const option of pollData.options) {
        try {
          const reaction = pollMessage.reactions.cache.get(option.emoji);
          finalResults[option.emoji] = reaction ? reaction.count - 1 : 0;
        } catch {
          finalResults[option.emoji] = 0;
        }
      }

      // Find winner
      let winnerEmoji = '';
      let maxVotes = -1;
      let tie = false;
      
      for (const [emoji, votes] of Object.entries(finalResults)) {
        if (votes > maxVotes) {
          maxVotes = votes;
          winnerEmoji = emoji;
          tie = false;
        } else if (votes === maxVotes && votes > 0) {
          tie = true;
        }
      }

      // Create results embed
      const resultsEmbed = new EmbedBuilder()
        .setTitle('📊 Poll Results')
        .setDescription(`**${pollData.question}**\n`)
        .setColor(config.colors.success as `#${string}`)
        .setTimestamp();

      if (pollData.anonymous) {
        resultsEmbed.setFooter({ text: 'Anonymous poll results' });
      } else {
        const creator = await client.users.fetch(pollData.creatorId).catch(() => null);
        resultsEmbed.setFooter({ 
          text: `Poll created by ${creator?.tag || 'Unknown'}`,
          iconURL: creator?.displayAvatarURL()
        });
      }

      // Add results for each option
      for (const option of pollData.options) {
        const votes = finalResults[option.emoji] || 0;
        const percentage = pollData.voters.size > 0 ? ((votes / pollData.voters.size) * 100).toFixed(1) : '0.0';
        
        resultsEmbed.addFields({
          name: `${option.emoji} ${option.text}`,
          value: `${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)`,
          inline: pollData.options.length <= 4
        });
      }

      // Add winner info
      if (maxVotes > 0 && !tie) {
        const winningOption = pollData.options.find(opt => opt.emoji === winnerEmoji);
        if (winningOption) {
          resultsEmbed.addFields({
            name: '🏆 Winner',
            value: `${winnerEmoji} **${winningOption.text}** with ${maxVotes} vote${maxVotes !== 1 ? 's' : ''}`
          });
        }
      } else if (tie && maxVotes > 0) {
        resultsEmbed.addFields({
          name: '🤝 Tie',
          value: 'Multiple options tied for the win!'
        });
      } else {
        resultsEmbed.addFields({
          name: '📭 No Votes',
          value: 'Nobody voted in this poll.'
        });
      }

      // Add total votes
      resultsEmbed.addFields({
        name: '📈 Total Votes',
        value: `${pollData.voters.size} unique voter${pollData.voters.size !== 1 ? 's' : ''}`
      });

      await pollMessage.edit({ embeds: [resultsEmbed] });
      
      // Remove from active polls
      this.polls.delete(messageId);
      
      return true;
      
    } catch (error) {
      console.error('Error ending poll:', error);
      return false;
    }
  }
}

interface PollData {
  messageId: string;
  channelId: string;
  guildId: string | null;
  creatorId: string;
  question: string;
  options: Array<{ emoji: string; text: string }>;
  results: Record<string, number>;
  anonymous: boolean;
  createdAt: Date;
  endsAt: Date | null;
  voters: Set<string>;
}

// Export singleton instance
export const pollManager = new PollManager();
