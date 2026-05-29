using System.Collections.Concurrent;
using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using PollModel = KaorukoBot.Models.Poll;

namespace KaorukoBot.Services;

public class PollService
{
    private readonly DiscordSocketClient _client;
    private readonly ConcurrentDictionary<string, PollModel> _polls = new();
    private readonly ConcurrentDictionary<string, Timer> _pollTimers = new();

    public PollService(DiscordSocketClient client)
    {
        _client = client;
    }

    public PollModel? GetPoll(string messageId)
    {
        _polls.TryGetValue(messageId, out var poll);
        return poll;
    }

    public bool PollExists(string messageId)
    {
        return _polls.ContainsKey(messageId);
    }

    public void CreatePoll(PollModel poll)
    {
        _polls[poll.MessageId] = poll;

        var timer = new Timer(
            async _ => await EndPollAsync(poll.MessageId),
            null,
            TimeSpan.FromMinutes(poll.DurationMinutes),
            Timeout.InfiniteTimeSpan);
        _pollTimers[poll.MessageId] = timer;
    }

    public async Task<bool> HandleVoteAsync(string messageId, ulong userId, int optionIndex)
    {
        if (!_polls.TryGetValue(messageId, out var poll) || !poll.IsActive)
            return false;

        if (optionIndex < 0 || optionIndex >= poll.Options.Count)
            return false;

        poll.Votes[userId.ToString(CultureInfo.InvariantCulture)] = optionIndex;
        await UpdatePollMessageAsync(messageId);
        return true;
    }

    public async Task<bool> EndPollAsync(string messageId)
    {
        if (!_polls.TryGetValue(messageId, out var poll))
            return false;

        poll.IsActive = false;

        if (_pollTimers.TryRemove(messageId, out var timer))
        {
            await timer.DisposeAsync();
        }

        await ShowResultsAsync(poll);
        return true;
    }

    private async Task UpdatePollMessageAsync(string messageId)
    {
        if (!_polls.TryGetValue(messageId, out var poll)) return;

        try
        {
            var channel = _client.GetChannel(ulong.Parse(poll.ChannelId, CultureInfo.InvariantCulture)) as SocketTextChannel;
            if (channel == null) return;

            var message = await channel.GetMessageAsync(ulong.Parse(messageId, CultureInfo.InvariantCulture)) as IUserMessage;
            if (message == null) return;

            var voteCounts = new int[poll.Options.Count];
            var totalVotes = poll.Votes.Count;

            foreach (var vote in poll.Votes.Values)
            {
                if (vote >= 0 && vote < poll.Options.Count)
                    voteCounts[vote]++;
            }

            var emojis = new[] { "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣" };
            var description = "**Vote using the buttons below!**\n\n";

            for (var i = 0; i < poll.Options.Count; i++)
            {
                var percentage = totalVotes > 0 ? (int)Math.Round((double)voteCounts[i] / totalVotes * 100) : 0;
                var bar = CreateProgressBar(percentage);
                description += $"{emojis[i]} {poll.Options[i]}\n{bar} {voteCounts[i]} vote(s) ({percentage}%)\n\n";
            }

            var embed = new EmbedBuilder()
                .WithTitle("📊 " + poll.Question)
                .WithColor(new Color(0x5865F2))
                .WithTimestamp(DateTimeOffset.UtcNow)
                .WithFooter(footer =>
                {
                    footer.Text = $"Poll by {poll.CreatedBy} • {totalVotes} vote(s)" +
                                  (poll.Anonymous ? " • Anonymous" : "");
                })
                .WithDescription(description);

            var buttons = new ActionRowBuilder();
            for (var i = 0; i < poll.Options.Count; i++)
            {
                var button = new ButtonBuilder()
                    .WithCustomId($"poll_vote_{i}")
                    .WithLabel(poll.Options[i].Length > 80 ? poll.Options[i][..80] : poll.Options[i])
                    .WithStyle(ButtonStyle.Primary)
                    .WithEmote(new Emoji(emojis[i]));
                buttons.AddComponent(button);
            }

            var component = new Discord.ComponentBuilder().AddRow(buttons).Build();
            await message.ModifyAsync(props =>
            {
                props.Embeds = new[] { embed.Build() };
                props.Components = component;
            });
        }
        catch { }
    }

    private async Task ShowResultsAsync(PollModel poll)
    {
        try
        {
            var channel = _client.GetChannel(ulong.Parse(poll.ChannelId, CultureInfo.InvariantCulture)) as SocketTextChannel;
            if (channel == null) return;

            var message = await channel.GetMessageAsync(ulong.Parse(poll.MessageId, CultureInfo.InvariantCulture)) as IUserMessage;
            if (message == null) return;

            var voteCounts = new int[poll.Options.Count];
            var totalVotes = poll.Votes.Count;

            foreach (var vote in poll.Votes.Values)
            {
                if (vote >= 0 && vote < poll.Options.Count)
                    voteCounts[vote]++;
            }

            var maxVotes = voteCounts.Length > 0 ? voteCounts.Max() : 0;
            var winners = voteCounts.Select((count, index) => new { index, count })
                .Where(x => x.count == maxVotes && maxVotes > 0)
                .ToList();

            var emojis = new[] { "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣" };
            var description = "";

            for (var i = 0; i < poll.Options.Count; i++)
            {
                var percentage = totalVotes > 0 ? (int)Math.Round((double)voteCounts[i] / totalVotes * 100) : 0;
                var isWinner = winners.Any(w => w.index == i) && maxVotes > 0;
                var trophy = isWinner ? "🏆 " : "";
                var bar = CreateProgressBar(percentage);
                description += $"{trophy}{emojis[i]} **{poll.Options[i]}**\n{bar} {voteCounts[i]} vote(s) ({percentage}%)\n\n";
            }

            if (totalVotes == 0)
            {
                description += "🚫 **No votes were cast**";
            }
            else if (winners.Count == 1)
            {
                description += $"🎉 **Winner:** {poll.Options[winners[0].index]} with {maxVotes} vote(s)!";
            }
            else
            {
                var winnerNames = string.Join(", ", winners.Select(w => poll.Options[w.index]));
                description += $"🤝 **Tie:** {winnerNames} ({maxVotes} vote(s) each)";
            }

            var embed = new EmbedBuilder()
                .WithTitle("📊 Poll Results: " + poll.Question)
                .WithColor(maxVotes > 0 ? new Color(0x00FF00) : new Color(0xFFA500))
                .WithTimestamp(DateTimeOffset.UtcNow)
                .WithFooter(footer =>
                {
                    footer.Text = $"Poll ended • {totalVotes} total vote(s)" +
                                  (poll.Anonymous ? " • Anonymous" : "");
                })
                .WithDescription(description);

            var emptyComponent = new Discord.ComponentBuilder().Build();
            await message.ModifyAsync(props =>
            {
                props.Embeds = new[] { embed.Build() };
                props.Components = emptyComponent;
            });
        }
        catch { }
    }

    private static string CreateProgressBar(int percentage, int length = 10)
    {
        var filled = (int)Math.Round(percentage / 100.0 * length);
        return new string('▓', filled) + new string('░', length - filled);
    }
}
