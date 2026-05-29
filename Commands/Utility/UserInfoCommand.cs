using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class UserInfoCommand : BotCommand
{
    public override string Name => "userinfo";
    public override string Description => "Get information about a user";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("userinfo")
            .WithDescription("Get information about a user")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("The user to get information about")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var user = command.Data.Options.FirstOrDefault()?.Value as SocketUser ?? context.User;
        var guildUser = context.Guild?.GetUser(user.Id);

        var embed = Components.Embeds.Info("User Information",
            $"**Username:** {user.Username}\n**ID:** {user.Id}")
            .WithThumbnail(user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl());
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Account Created", Value = $"<t:{user.CreatedAt.ToUnixTimeSeconds()}:R>", IsInline = true }
        ];

        if (guildUser?.JoinedAt.HasValue == true)
        {
            embed.Fields.Add(new EmbedFieldProperties
            {
                Name = "Joined Server",
                Value = $"<t:{guildUser.JoinedAt!.Value.ToUnixTimeSeconds()}:R>",
                IsInline = true
            });
            embed.Fields.Add(new EmbedFieldProperties
            {
                Name = "Roles",
                Value = $"{guildUser.Roles.Count - 1}",
                IsInline = true
            });
        }

        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        SocketUser? user = message.Author;
        if (args.Length > 0)
        {
            var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
            if (ulong.TryParse(userId, out var id))
                user = client.GetUser(id) ?? message.Author;
        }

        var guildUser = (message.Channel as SocketGuildChannel)?.Guild.GetUser(user.Id);
        var embed = Components.Embeds.Info("User Information",
            $"**Username:** {user.Username}\n**ID:** {user.Id}")
            .WithThumbnail(user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl());
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Account Created", Value = $"<t:{user.CreatedAt.ToUnixTimeSeconds()}:R>", IsInline = true }
        ];

        if (guildUser?.JoinedAt.HasValue == true)
        {
            embed.Fields.Add(new EmbedFieldProperties { Name = "Joined Server", Value = $"<t:{guildUser.JoinedAt!.Value.ToUnixTimeSeconds()}:R>", IsInline = true });
            embed.Fields.Add(new EmbedFieldProperties { Name = "Roles", Value = $"{guildUser.Roles.Count - 1}", IsInline = true });
        }

        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
