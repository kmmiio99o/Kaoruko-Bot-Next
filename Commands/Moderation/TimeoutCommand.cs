using System.Globalization;
using System.Text.RegularExpressions;
using Discord;
using Discord.Net;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Moderation;

public partial class TimeoutCommand : BotCommand
{
    public override string Name => "timeout";
    public override string Description => "Timeout a user";
    public override CommandCategory Category => CommandCategory.Moderation;
    public override GuildPermission? RequiredPermission => GuildPermission.ModerateMembers;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName(Name)
            .WithDescription(Description)
            .WithDefaultMemberPermissions(GuildPermission.ModerateMembers)
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to timeout")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("duration")
                .WithDescription("Duration (e.g., 10m, 2h, 1d)")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("reason")
                .WithDescription("Reason for timeout")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        if (context.GuildUser?.GuildPermissions.Has(GuildPermission.ModerateMembers) != true)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Moderate Members** permission to use this command.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var user = command.Data.Options.First(o => o.Name == "user").Value as SocketUser;
        var durationStr = command.Data.Options.First(o => o.Name == "duration").Value as string ?? "";
        var reason = command.Data.Options.FirstOrDefault(o => o.Name == "reason")?.Value as string ?? "No reason provided";

        if (user == null || string.IsNullOrEmpty(durationStr)) return;

        var duration = ParseTimeSpan(durationStr);
        if (duration <= TimeSpan.Zero || duration.TotalDays > 28)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Invalid Duration",
                    "Please provide a valid duration (e.g., 10m, 2h, 1d). Maximum is 28 days.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var client = services.GetRequiredService<DiscordSocketClient>();
        var guildUser = context.Guild.GetUser(user.Id);
        var botUser = context.Guild?.GetUser(client.CurrentUser.Id);
        if (guildUser == null || (botUser != null && botUser.Hierarchy <= guildUser.Hierarchy))
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Cannot Timeout",
                    "I cannot timeout this user.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        await guildUser.SetTimeOutAsync(duration, new RequestOptions());
        var embed = Embeds.Success("User Timed Out",
            $"**{user.Username}** has been timed out for **{FormatTimeSpan(duration)}**.\n**Reason:** {reason}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (guild == null) return;

        if (!((message.Author as SocketGuildUser)?.GuildPermissions.Has(GuildPermission.ModerateMembers) ?? false))
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Moderate Members** permission to use this command.").ToDiscordEmbed()]);
            return;
        }

        if (args.Length < 2)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Invalid Usage",
                    "Usage: `.timeout <user> <duration> [reason]`").ToDiscordEmbed()]);
            return;
        }

        var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        var duration = ParseTimeSpan(args[1]);
        var reason = args.Length > 2 ? string.Join(" ", args[2..]) : "No reason provided";

        if (duration <= TimeSpan.Zero || duration.TotalDays > 28)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Invalid Duration",
                    "Please provide a valid duration (e.g., 10m, 2h, 1d).").ToDiscordEmbed()]);
            return;
        }

        if (ulong.TryParse(userId, out var id))
        {
            var client = services.GetRequiredService<DiscordSocketClient>();
            var guildUser = guild.GetUser(id);
            var botUser = guild.GetUser(client.CurrentUser.Id);
            if (guildUser != null && botUser != null && botUser.Hierarchy > guildUser.Hierarchy)
            {
                await guildUser.SetTimeOutAsync(duration);
                var embed = Embeds.Success("User Timed Out",
                    $"**{guildUser.Username}** has been timed out for **{FormatTimeSpan(duration)}**.\n**Reason:** {reason}");
                await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
            }
        }
    }

    [GeneratedRegex(@"^(\d+)([smhd])$")]
    private static partial Regex TimeSpanRegex();

    private static TimeSpan ParseTimeSpan(string input)
    {
        var match = TimeSpanRegex().Match(input);
        if (!match.Success) return TimeSpan.Zero;

        var value = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        return match.Groups[2].Value switch
        {
            "s" => TimeSpan.FromSeconds(value),
            "m" => TimeSpan.FromMinutes(value),
            "h" => TimeSpan.FromHours(value),
            "d" => TimeSpan.FromDays(value),
            _ => TimeSpan.Zero
        };
    }

    private static string FormatTimeSpan(TimeSpan time)
    {
        if (time.TotalDays >= 1) return $"{(int)time.TotalDays}d {time.Hours}h";
        if (time.TotalHours >= 1) return $"{(int)time.TotalHours}h {time.Minutes}m";
        if (time.TotalMinutes >= 1) return $"{(int)time.TotalMinutes}m {time.Seconds}s";
        return $"{(int)time.TotalSeconds}s";
    }
}
