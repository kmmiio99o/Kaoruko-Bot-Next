using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Fun;

public class HowGayCommand : BotCommand
{
    public override string Name => "howgay";
    public override string Description => "Check how gay someone is!";
    public override CommandCategory Category => CommandCategory.Fun;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("howgay")
            .WithDescription("Check how gay someone is!")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to check")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var user = command.Data.Options.FirstOrDefault()?.Value as SocketUser ?? context.User;
        var percentage = Random.Shared.Next(101);

        var barLength = 10;
        var filled = (int)Math.Round(percentage / 100.0 * barLength);
        var bar = string.Concat(Enumerable.Repeat("🌈", filled)) + string.Concat(Enumerable.Repeat("⬜", barLength - filled));

        var embed = Embeds.Info("🏳️\u200d🌈 How Gay?",
            $"**{user.Username}** is **{percentage}%** gay!\n{bar}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        SocketUser? user = message.Author;
        if (args.Length > 0)
        {
            var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
            if (ulong.TryParse(userId, out var id))
            {
                var client = services.GetRequiredService<DiscordSocketClient>();
                user = client.GetUser(id) ?? message.Author;
            }
        }

        var percentage = Random.Shared.Next(101);
        var barLength = 10;
        var filled = (int)Math.Round(percentage / 100.0 * barLength);
        var bar = string.Concat(Enumerable.Repeat("🌈", filled)) + string.Concat(Enumerable.Repeat("⬜", barLength - filled));

        var embed = Embeds.Info("🏳️‍🌈 How Gay?",
            $"**{user.Username}** is **{percentage}%** gay!\n{bar}");
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
