using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class PingCommand : BotCommand
{
    public override string Name => "ping";
    public override string Description => "Check the bot's latency";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("ping")
            .WithDescription("Check the bot's latency");
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        var embed = Components.Embeds.Info("Pinging...", "Calculating ping...");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);

        var ping = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - command.CreatedAt.ToUnixTimeMilliseconds();
        var apiPing = client.Latency;

        embed = Components.Embeds.Success("Pong!",
            $"🏓 **Latency:** {ping}ms\n📡 **API Ping:** {apiPing}ms");
        await command.ModifyOriginalResponseAsync(props =>
        {
            props.Embeds = new[] { embed.ToDiscordEmbed() };
        });
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        var embed = Components.Embeds.Info("Pinging...", "Calculating ping...");
        var sent = await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);

        var ping = (sent.CreatedAt - message.CreatedAt).Milliseconds;
        var apiPing = client.Latency;

        embed = Components.Embeds.Success("Pong!",
            $"🏓 **Latency:** {ping}ms\n📡 **API Ping:** {apiPing}ms");
        await sent.ModifyAsync(props =>
        {
            props.Embeds = new[] { embed.ToDiscordEmbed() };
        });
    }
}
