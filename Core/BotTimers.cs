using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Models;
using KaorukoBot.Services;

namespace KaorukoBot;

public partial class Bot
{
    private void UpdateStatus()
    {
        try
        {
            var guildCount = _client.Guilds.Count;
            var totalMembers = _client.Guilds.Sum(g => g.MemberCount);
            var uptime = DateTime.UtcNow - _startTime;

            var statusOptions = new (string name, ActivityType type)[]
            {
                ($"{guildCount} servers", ActivityType.Watching),
                ($"{totalMembers:N0} users", ActivityType.Watching),
                ("for commands | /help", ActivityType.Listening),
                ($"Uptime: {uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s", ActivityType.Competing)
            };

            var random = Random.Shared.Next(statusOptions.Length);
            var selected = statusOptions[random];

            _client.SetGameAsync(selected.name, null, selected.type);
        }
        catch { }
    }

    private async Task HandleRandomTriggersAsync(ulong guildId)
    {
        var commands = await _customCommandService.GetCommandsAsync(guildId.ToString(CultureInfo.InvariantCulture));
        var randomCommands = commands.Where(c =>
            c.IsEnabled && c.Trigger == TriggerType.Random && c.RandomChance.HasValue);

        foreach (var cmd in randomCommands)
        {
            if (Random.Shared.NextDouble() * 100 <= cmd.RandomChance)
            {
                if (ulong.TryParse(cmd.RandomChannelId ?? cmd.AllowedChannels.FirstOrDefault(), out var channelId))
                {
                    var channel = _client.GetChannel(channelId) as SocketTextChannel;
                    if (channel != null)
                    {
                        var variables = new Dictionary<string, string>
                        {
                            { "guild", channel.Guild.Name },
                            { "channel", channel.Name }
                        };
                        var response = CustomCommandService.ProcessVariables(cmd.Content, variables);
                        await channel.SendMessageAsync(response);
                    }
                }
            }
        }
    }
}
