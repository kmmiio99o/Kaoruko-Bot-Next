using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Fun;

public class HugCommand : BotCommand
{
    private static readonly string[] Gifs =
    [
        "https://media.tenor.com/CwOP4_nzRCAAAAAC/hug-anime.gif",
        "https://media.tenor.com/8QlLeM0d0BoAAAAC/hug-anime-hug.gif",
        "https://media.tenor.com/8x2w5_S0iDkAAAAd/anime-hug.gif"
    ];

    public override string Name => "hug";
    public override string Description => "Hug someone!";
    public override CommandCategory Category => CommandCategory.Fun;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("hug")
            .WithDescription("Hug someone!")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to hug")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var target = command.Data.Options.First().Value as SocketUser;
        if (target == null || target.Id == command.User.Id)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Error", "You cannot hug yourself!").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var embed = Embeds.Info("🤗 Hug!",
            $"{command.User.Username} hugged {target.Username}! 🤗")
            .WithImage(Gifs[Random.Shared.Next(Gifs.Length)]);
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (args.Length == 0)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Usage", "Usage: `.hug <@user>`").ToDiscordEmbed()]);
            return;
        }

        var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        if (!ulong.TryParse(userId, out var id) || id == message.Author.Id)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Error", "You cannot hug yourself!").ToDiscordEmbed()]);
            return;
        }

        var embed = Embeds.Info("🤗 Hug!",
            $"{message.Author.Username} hugged <@{id}>! 🤗")
            .WithImage(Gifs[Random.Shared.Next(Gifs.Length)]);
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
