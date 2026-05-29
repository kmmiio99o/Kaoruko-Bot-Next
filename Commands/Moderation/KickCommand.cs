using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Moderation;

public class KickCommand : BotCommand
{
    public override string Name => "kick";
    public override string Description => "Kick a user from the server";
    public override CommandCategory Category => CommandCategory.Moderation;
    public override GuildPermission? RequiredPermission => GuildPermission.KickMembers;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName(Name)
            .WithDescription(Description)
            .WithDefaultMemberPermissions(GuildPermission.KickMembers)
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to kick")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("reason")
                .WithDescription("Reason for the kick")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        if (context.GuildUser?.GuildPermissions.Has(GuildPermission.KickMembers) != true)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Kick Members** permission to use this command.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var user = command.Data.Options.First(o => o.Name == "user").Value as SocketUser;
        var reason = command.Data.Options.FirstOrDefault(o => o.Name == "reason")?.Value as string ?? "No reason provided";

        if (user == null) return;

        if (user.Id == command.User.Id)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Invalid Action", "You cannot kick yourself.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var client = services.GetRequiredService<DiscordSocketClient>();
        var guildUser = context.Guild.GetUser(user.Id);
        var botUser = context.Guild?.GetUser(client.CurrentUser.Id);
        if (guildUser == null || (botUser != null && botUser.Hierarchy <= guildUser.Hierarchy))
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Cannot Kick",
                    "I cannot kick this user.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        await guildUser.KickAsync(reason);
        var embed = Embeds.Success("User Kicked",
            $"**{user.Username}** has been kicked.\n**Reason:** {reason}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (guild == null) return;

        if (!((message.Author as SocketGuildUser)?.GuildPermissions.Has(GuildPermission.KickMembers) ?? false))
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Kick Members** permission to use this command.").ToDiscordEmbed()]);
            return;
        }

        if (args.Length == 0)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Invalid Usage", "Usage: `.kick <user> [reason]`").ToDiscordEmbed()]);
            return;
        }

        var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        var reason = args.Length > 1 ? string.Join(" ", args[1..]) : "No reason provided";

        if (ulong.TryParse(userId, out var id))
        {
            var client = services.GetRequiredService<DiscordSocketClient>();
            var guildUser = guild.GetUser(id);
            var botUser = guild.GetUser(client.CurrentUser.Id);
            if (guildUser != null && botUser != null && botUser.Hierarchy > guildUser.Hierarchy)
            {
                await guildUser.KickAsync(reason);
                var embed = Embeds.Success("User Kicked",
                    $"**{guildUser.Username}** has been kicked.\n**Reason:** {reason}");
                await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
            }
        }
    }
}
