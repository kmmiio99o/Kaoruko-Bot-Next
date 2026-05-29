using Discord;
using KaorukoBot.Components;
using PollModel = KaorukoBot.Models.Poll;

namespace KaorukoBot.Builders;

public class PollBuilder
{
    public static (EmbedProperties embed, ActionRowBuilder row) BuildPollEmbed(
        string question,
        List<string> options,
        string createdBy,
        int durationMinutes,
        bool anonymous)
    {
        var emojis = new[] { "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣" };
        var description = "**Vote using the buttons below!**\n\n";
        for (var i = 0; i < options.Count; i++)
        {
            description += $"{emojis[i]} {options[i]}\n";
        }

        var embed = new EmbedProperties
        {
            Title = $"📊 {question}",
            Description = description,
            Color = new Color(0x5865F2),
            FooterText = $"Poll by {createdBy} • Duration: {durationMinutes} min" + (anonymous ? " • Anonymous" : ""),
            Timestamp = DateTimeOffset.UtcNow
        };

        var row = new ActionRowBuilder();
        for (var i = 0; i < options.Count; i++)
        {
            var button = new ButtonBuilder()
                .WithCustomId($"poll_vote_{i}")
                .WithLabel(options[i].Length > 80 ? options[i][..80] : options[i])
                .WithStyle(ButtonStyle.Primary)
                .WithEmote(new Emoji(emojis[i]));
            row.AddComponent(button);
        }

        return (embed, row);
    }

    public static EmbedProperties BuildResultsEmbed(
        PollModel poll,
        Dictionary<string, int> voteCounts,
        int totalVotes)
    {
        var emojis = new[] { "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣" };

        var maxVotes = voteCounts.Values.Count > 0 ? voteCounts.Values.Max() : 0;
        var winners = voteCounts.Where(x => x.Value == maxVotes && maxVotes > 0).ToList();

        var description = "";

        for (var i = 0; i < poll.Options.Count; i++)
        {
            voteCounts.TryGetValue(poll.Options[i], out var count);
            var percentage = totalVotes > 0 ? (int)Math.Round((double)count / totalVotes * 100) : 0;
            var isWinner = winners.Any(w => w.Key == poll.Options[i]) && maxVotes > 0;
            var trophy = isWinner ? "🏆 " : "";
            var bar = CreateProgressBar(percentage);
            description += $"{trophy}{emojis[i]} **{poll.Options[i]}**\n{bar} {count} vote(s) ({percentage}%)\n\n";
        }

        if (totalVotes == 0)
        {
            description += "🚫 **No votes were cast**";
        }
        else if (winners.Count == 1)
        {
            description += $"🎉 **Winner:** {winners[0].Key} with {maxVotes} vote(s)!";
        }
        else
        {
            var winnerNames = string.Join(", ", winners.Select(w => w.Key));
            description += $"🤝 **Tie:** {winnerNames} ({maxVotes} vote(s) each)";
        }

        return new EmbedProperties
        {
            Title = $"📊 Poll Results: {poll.Question}",
            Description = description,
            Color = maxVotes > 0 ? new Color(0x00FF00) : new Color(0xFFA500),
            FooterText = $"Poll ended • {totalVotes} total vote(s)" + (poll.Anonymous ? " • Anonymous" : ""),
            Timestamp = DateTimeOffset.UtcNow
        };
    }

    private static string CreateProgressBar(int percentage, int length = 10)
    {
        var filled = (int)Math.Round(percentage / 100.0 * length);
        return new string('▓', filled) + new string('░', length - filled);
    }
}
