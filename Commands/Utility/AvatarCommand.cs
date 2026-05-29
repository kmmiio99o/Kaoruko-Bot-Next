using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class AvatarCommand : BotCommand
{
    public override string Name => "avatar";
    public override string Description => "Get a user's avatar";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("avatar")
            .WithDescription("Get a user's avatar")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("The user to get the avatar of")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var user = command.Data.Options.FirstOrDefault()?.Value as SocketUser ?? context.User;
        var avatarUrl = user.GetAvatarUrl(size: 4096) ?? user.GetDefaultAvatarUrl();

        var embed = Components.Embeds.Info($"{user.Username}'s Avatar", "");
        embed.ImageUrl = avatarUrl;
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Links", Value =
                $"[PNG]({user.GetAvatarUrl(size: 4096, format: ImageFormat.Png) ?? user.GetDefaultAvatarUrl()}) | " +
                $"[JPEG]({user.GetAvatarUrl(size: 4096, format: ImageFormat.Jpeg) ?? user.GetDefaultAvatarUrl()}) | " +
                $"[WEBP]({user.GetAvatarUrl(size: 4096, format: ImageFormat.WebP) ?? user.GetDefaultAvatarUrl()})" }
        ];

        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        SocketUser? user = null;
        if (args.Length > 0)
        {
            var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
            if (ulong.TryParse(userId, out var id))
                user = client.GetUser(id);
        }
        user ??= message.Author;

        var avatarUrl = user.GetAvatarUrl(size: 4096) ?? user.GetDefaultAvatarUrl();
        var embed = Components.Embeds.Info($"{user.Username}'s Avatar", "");
        embed.ImageUrl = avatarUrl;
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Links", Value =
                $"[PNG]({user.GetAvatarUrl(size: 4096, format: ImageFormat.Png) ?? user.GetDefaultAvatarUrl()}) | " +
                $"[JPEG]({user.GetAvatarUrl(size: 4096, format: ImageFormat.Jpeg) ?? user.GetDefaultAvatarUrl()}) | " +
                $"[WEBP]({user.GetAvatarUrl(size: 4096, format: ImageFormat.WebP) ?? user.GetDefaultAvatarUrl()})" }
        ];

        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
