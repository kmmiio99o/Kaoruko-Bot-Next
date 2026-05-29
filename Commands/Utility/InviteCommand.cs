using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class InviteCommand : BotCommand
{
    public override string Name => "invite";
    public override string Description => "Get the bot's invite link";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("invite")
            .WithDescription("Get the bot's invite link");
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        var clientUser = client.CurrentUser;
        var inviteUrl = $"https://discord.com/api/oauth2/authorize?client_id={clientUser.Id}&permissions=8&scope=bot%20applications.commands";
        var minimalInvite = $"https://discord.com/api/oauth2/authorize?client_id={clientUser.Id}&permissions=2147483647&scope=bot%20applications.commands";

        var embed = Components.Embeds.Info($"🎭 Invite {clientUser.Username}",
            $"Thank you for your interest in adding **{clientUser.Username}** to your server!")
            .WithThumbnail(clientUser.GetAvatarUrl(size: 256) ?? clientUser.GetDefaultAvatarUrl());
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "🔗 Full Permissions (Recommended)", Value = $"[**Click here to invite with all permissions**]({inviteUrl})" },
            new EmbedFieldProperties { Name = "⚡ Standard Permissions", Value = $"[**Click here for standard invite**]({minimalInvite})" },
            new EmbedFieldProperties { Name = "✨ Key Features", Value = "🎫 Advanced ticket system\n🛡️ Moderation tools\n🎪 Fun commands\n⚙️ Comprehensive configuration\n📊 Polls and utilities\n🔧 Custom commands" }
        ];

        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var client = services.GetRequiredService<DiscordSocketClient>();
        var clientUser = client.CurrentUser;
        var inviteUrl = $"https://discord.com/api/oauth2/authorize?client_id={clientUser.Id}&permissions=8&scope=bot%20applications.commands";
        var minimalInvite = $"https://discord.com/api/oauth2/authorize?client_id={clientUser.Id}&permissions=2147483647&scope=bot%20applications.commands";

        var embed = Components.Embeds.Info($"🎭 Invite {clientUser.Username}",
            $"Thank you for your interest in adding **{clientUser.Username}** to your server!")
            .WithThumbnail(clientUser.GetAvatarUrl(size: 256) ?? clientUser.GetDefaultAvatarUrl());
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "🔗 Full Permissions (Recommended)", Value = $"[**Click here to invite with all permissions**]({inviteUrl})" },
            new EmbedFieldProperties { Name = "⚡ Standard Permissions", Value = $"[**Click here for standard invite**]({minimalInvite})" },
            new EmbedFieldProperties { Name = "✨ Key Features", Value = "🎫 Advanced ticket system\n🛡️ Moderation tools\n🎪 Fun commands\n⚙️ Comprehensive configuration\n📊 Polls and utilities\n🔧 Custom commands" }
        ];

        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
