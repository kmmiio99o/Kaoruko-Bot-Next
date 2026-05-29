using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class ServerInfoCommand : BotCommand
{
    public override string Name => "serverinfo";
    public override string Description => "Get information about the server";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("serverinfo")
            .WithDescription("Get information about the server");
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        var guild = context.Guild;
        var owner = guild.Owner;
        var channels = guild.Channels.Count;
        var roles = guild.Roles.Count - 1;

        var verificationLevels = new Dictionary<VerificationLevel, string>
        {
            { VerificationLevel.None, "None" },
            { VerificationLevel.Low, "Low" },
            { VerificationLevel.Medium, "Medium" },
            { VerificationLevel.High, "High" },
            { VerificationLevel.Extreme, "Very High" }
        };

        var embed = Components.Embeds.Info("Server Information",
            $"**Name:** {guild.Name}\n**ID:** {guild.Id}")
            .WithThumbnail(guild.IconUrl ?? "");
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Owner", Value = $"{owner.Username}", IsInline = true },
            new EmbedFieldProperties { Name = "Members", Value = $"{guild.MemberCount:N0}", IsInline = true },
            new EmbedFieldProperties { Name = "Channels", Value = $"{channels}", IsInline = true },
            new EmbedFieldProperties { Name = "Roles", Value = $"{roles}", IsInline = true },
            new EmbedFieldProperties { Name = "Created", Value = $"<t:{guild.CreatedAt.ToUnixTimeSeconds()}:R>", IsInline = true },
            new EmbedFieldProperties { Name = "Verification Level", Value = verificationLevels.GetValueOrDefault(guild.VerificationLevel, "Unknown"), IsInline = true }
        ];

        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        guild = (message.Channel as SocketGuildChannel)?.Guild;
        if (guild == null) return;

        var owner = guild.Owner;
        var channels = guild.Channels.Count;
        var roles = guild.Roles.Count - 1;

        var verificationLevels = new Dictionary<VerificationLevel, string>
        {
            { VerificationLevel.None, "None" },
            { VerificationLevel.Low, "Low" },
            { VerificationLevel.Medium, "Medium" },
            { VerificationLevel.High, "High" },
            { VerificationLevel.Extreme, "Very High" }
        };

        var embed = Components.Embeds.Info("Server Information",
            $"**Name:** {guild.Name}\n**ID:** {guild.Id}")
            .WithThumbnail(guild.IconUrl ?? "");
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Owner", Value = $"{owner.Username}", IsInline = true },
            new EmbedFieldProperties { Name = "Members", Value = $"{guild.MemberCount:N0}", IsInline = true },
            new EmbedFieldProperties { Name = "Channels", Value = $"{channels}", IsInline = true },
            new EmbedFieldProperties { Name = "Roles", Value = $"{roles}", IsInline = true },
            new EmbedFieldProperties { Name = "Created", Value = $"<t:{guild.CreatedAt.ToUnixTimeSeconds()}:R>", IsInline = true },
            new EmbedFieldProperties { Name = "Verification Level", Value = verificationLevels.GetValueOrDefault(guild.VerificationLevel, "Unknown"), IsInline = true }
        ];

        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
