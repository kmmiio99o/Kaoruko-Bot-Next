using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Info;

public class HelpCommand : BotCommand
{
    private static readonly Dictionary<string, List<(string name, string desc)>> Categories = new()
    {
        ["Admin"] = [("config", "Configure bot settings"), ("customcommand", "Manage custom commands"), ("ticketcategory", "Manage ticket categories")],
        ["Moderation"] = [("ban", "Ban a user"), ("kick", "Kick a user"), ("timeout", "Timeout a user")],
        ["Utility"] = [("ping", "Check latency"), ("avatar", "Get avatar"), ("userinfo", "User info"), ("serverinfo", "Server info"), ("invite", "Bot invite"), ("poll", "Create a poll"), ("endpoll", "End a poll")],
        ["Fun"] = [("8ball", "Magic 8-ball"), ("hug", "Hug someone"), ("slap", "Slap someone"), ("ship", "Ship two users"), ("howgay", "How gay are you?")],
        ["Info"] = [("help", "Show this message")],
        ["Tickets"] = [("ticketpanel", "Create a ticket panel")]
    };

    public override string Name => "help";
    public override string Description => "Show all commands or get help for a specific command";
    public override CommandCategory Category => CommandCategory.Info;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("help")
            .WithDescription("Show all commands or get help for a specific command")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("command")
                .WithDescription("Command to get help for")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var commandName = command.Data.Options.FirstOrDefault()?.Value as string;

        if (!string.IsNullOrEmpty(commandName))
        {
            var helpEmbed = Embeds.Info($"Help: /{commandName}",
                $"More information about `/{commandName}`");
            await command.RespondAsync(embeds: [helpEmbed.ToDiscordEmbed()], ephemeral: true);
            return;
        }

        var prefix = await GetPrefixAsync(context, services);
        var description = "";
        foreach (var (category, cmds) in Categories)
        {
            description += $"**{category}**\n";
            foreach (var (name, desc) in cmds)
            {
                description += $"  `/{name}` — {desc}\n";
            }
            description += "\n";
        }

        var embed = Embeds.Info("📚 Kaoruko Bot Help",
            $"**Prefix:** `{prefix}`\n\n{description}")
            .WithFooter($"Total commands: {Categories.Values.Sum(c => c.Count)}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var prefix = guild != null
            ? await services.GetRequiredService<GuildSettingsService>()
                .GetOrCreateSettingsAsync(guild.Id.ToString(CultureInfo.InvariantCulture))
                .ContinueWith(t => t.Result.Prefix)
            : GetDefaultPrefix();

        var description = "";
        foreach (var (category, cmds) in Categories)
        {
            description += $"**{category}**\n";
            foreach (var (name, desc) in cmds)
            {
                description += $"  `{prefix}{name}` — {desc}\n";
            }
            description += "\n";
        }

        var embed = Embeds.Info("📚 Kaoruko Bot Help",
            $"**Prefix:** `{prefix}`\n\n{description}")
            .WithFooter($"Total commands: {Categories.Values.Sum(c => c.Count)}");
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    private static string GetDefaultPrefix() => ".";

    private static async Task<string> GetPrefixAsync(ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return ".";
        var settings = await services.GetRequiredService<GuildSettingsService>()
            .GetOrCreateSettingsAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));
        return settings.Prefix;
    }
}
