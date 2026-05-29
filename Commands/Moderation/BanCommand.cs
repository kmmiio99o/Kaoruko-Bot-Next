using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Moderation;

public class BanCommand : BotCommand
{
    public override string Name => "ban";
    public override string Description => "Ban a user from the server";
    public override CommandCategory Category => CommandCategory.Moderation;
    public override GuildPermission? RequiredPermission => GuildPermission.BanMembers;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName(Name)
            .WithDescription(Description)
            .WithDefaultMemberPermissions(GuildPermission.BanMembers)
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("user")
                .WithDescription("User to ban")
                .WithType(ApplicationCommandOptionType.User)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("reason")
                .WithDescription("Reason for the ban")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("delete_days")
                .WithDescription("Delete messages from the last X days (0-7)")
                .WithType(ApplicationCommandOptionType.Integer)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        if (context.GuildUser?.GuildPermissions.Has(GuildPermission.BanMembers) != true)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Ban Members** permission to use this command.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var user = command.Data.Options.First(o => o.Name == "user").Value as SocketUser;
        var reason = command.Data.Options.FirstOrDefault(o => o.Name == "reason")?.Value as string ?? "No reason provided";
        var deleteDays = command.Data.Options.FirstOrDefault(o => o.Name == "delete_days")?.Value as int? ?? 0;

        if (user == null)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Invalid User", "Please specify a valid user.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        if (user.Id == command.User.Id)
        {
            await command.RespondAsync(
                embeds: [Embeds.Error("Invalid Action", "You cannot ban yourself.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var guildUser = context.Guild.GetUser(user.Id);
        if (guildUser != null)
        {
            var client = services.GetRequiredService<DiscordSocketClient>();
            var botUser = context.Guild?.GetUser(client.CurrentUser.Id);
            if (botUser == null || botUser.Hierarchy <= guildUser.Hierarchy)
            {
                await command.RespondAsync(
                    embeds: [Embeds.Error("Cannot Ban",
                        "I cannot ban this user; they may have a higher role than me.").ToDiscordEmbed()],
                    ephemeral: true);
                return;
            }
        }

        await context.Guild!.AddBanAsync(user.Id, deleteDays, reason);
        var embed = Embeds.Success("User Banned",
            $"**{user.Username}** has been banned.\n**Reason:** {reason}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (guild == null) return;

        if (!((message.Author as SocketGuildUser)?.GuildPermissions.Has(GuildPermission.BanMembers) ?? false))
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Permission Denied",
                    "You need the **Ban Members** permission to use this command.").ToDiscordEmbed()]);
            return;
        }

        if (args.Length == 0)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Invalid Usage", "Usage: `.ban <user> [reason]`").ToDiscordEmbed()]);
            return;
        }

        var userId = args[0].Replace("<@", "").Replace("!", "").Replace(">", "");
        var reason = args.Length > 1 ? string.Join(" ", args[1..]) : "No reason provided";

        if (ulong.TryParse(userId, out var id))
        {
            try
            {
                await guild.AddBanAsync(id, 0, reason);
                var embed = Embeds.Success("User Banned",
                    $"**{id}** has been banned.\n**Reason:** {reason}");
                await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
            }
            catch (Exception ex)
            {
                await message.ReplyAsync(
                    embeds: [Embeds.Error("Ban Failed", $"Failed to ban: {ex.Message}").ToDiscordEmbed()]);
            }
        }
    }
}
