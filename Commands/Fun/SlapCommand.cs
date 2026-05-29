using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Fun;

public class SlapCommand : BotCommand
{
    private static readonly string[] Gifs =
    [
        "https://media.tenor.com/8x2w5_S0iDkAAAAd/anime-slap.gif",
        "https://media.tenor.com/N4JX2hJ3aYIAAAAC/anime-slap.gif"
    ];

    public override string Name => "slap";
    public override string Description => "Slap someone!";
    public override CommandCategory Category => CommandCategory.Fun;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("slap")
            .WithDescription("Slap someone!")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to slap")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var target = command.Data.Options.First().Value as SocketUser;
        if (target == null || target.Id == command.User.Id)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Error", "You cannot slap yourself!").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var embed = Embeds.Info("🖐️ Slap!",
            $"{command.User.Username} slapped {target.Username}! 🖐️")
            .WithImage(Gifs[Random.Shared.Next(Gifs.Length)]);
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (args.Length == 0)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Usage", "Usage: `.slap <@user>`").ToDiscordEmbed()]);
            return;
        }

        var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        if (!ulong.TryParse(userId, out var id) || id == message.Author.Id)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Error", "You cannot slap yourself!").ToDiscordEmbed()]);
            return;
        }

        var embed = Embeds.Info("🖐️ Slap!",
            $"{message.Author.Username} slapped <@{id}>! 🖐️")
            .WithImage(Gifs[Random.Shared.Next(Gifs.Length)]);
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
