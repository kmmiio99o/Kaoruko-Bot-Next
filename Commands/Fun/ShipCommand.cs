using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Fun;

public class ShipCommand : BotCommand
{
    public override string Name => "ship";
    public override string Description => "Ship two users together!";
    public override CommandCategory Category => CommandCategory.Fun;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("ship")
            .WithDescription("Ship two users together!")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user1")
                .WithDescription("First user")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user2")
                .WithDescription("Second user")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var user1 = command.Data.Options.First(o => o.Name == "user1").Value as SocketUser;
        var user2 = command.Data.Options.First(o => o.Name == "user2").Value as SocketUser;

        if (user1 == null || user2 == null) return;

        var name1 = user1.Username;
        var name2 = user2.Username;
        var shipName = name1[..Math.Min(name1.Length / 2, 4)] + name2[Math.Max(name2.Length / 2 - 2, 0)..Math.Min(name2.Length, 5)];
        var compatibility = Random.Shared.Next(101);

        var barLength = 10;
        var filled = (int)Math.Round(compatibility / 100.0 * barLength);
        var bar = string.Concat(Enumerable.Repeat("❤", filled)) + string.Concat(Enumerable.Repeat("🖤", barLength - filled));

        var embed = Embeds.Info("💞 Ship",
            $"{user1.Mention} 💕 {user2.Mention}\n\n**Ship Name:** {shipName}\n**Compatibility:** {compatibility}%\n{bar}");

        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (args.Length < 2)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Usage", "Usage: `.ship <@user1> <@user2>`").ToDiscordEmbed()]);
            return;
        }

        var id1 = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        var id2 = args[1].Replace("<@", "").Replace("!", "").Replace(">", "");

        if (!ulong.TryParse(id1, out _) || !ulong.TryParse(id2, out _))
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Invalid Users", "Please mention two valid users.").ToDiscordEmbed()]);
            return;
        }

        var client = services.GetRequiredService<DiscordSocketClient>();
        var user1 = client.GetUser(ulong.Parse(id1, CultureInfo.InvariantCulture));
        var user2 = client.GetUser(ulong.Parse(id2, CultureInfo.InvariantCulture));
        var name1 = user1?.Username ?? id1;
        var name2 = user2?.Username ?? id2;

        var shipName = name1[..Math.Min(name1.Length / 2, 4)] + name2[Math.Max(name2.Length / 2 - 2, 0)..Math.Min(name2.Length, 5)];
        var compatibility = Random.Shared.Next(101);
        var barLength = 10;
        var filled = (int)Math.Round(compatibility / 100.0 * barLength);
        var bar = string.Concat(Enumerable.Repeat("❤", filled)) + string.Concat(Enumerable.Repeat("🖤", barLength - filled));

        var embed = Embeds.Info("💞 Ship",
            $"<@{id1}> 💕 <@{id2}>\n\n**Ship Name:** {shipName}\n**Compatibility:** {compatibility}%\n{bar}");
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
