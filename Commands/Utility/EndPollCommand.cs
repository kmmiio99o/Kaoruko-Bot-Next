using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Utility;

public class EndPollCommand : BotCommand
{
    public override string Name => "endpoll";
    public override string Description => "End an active poll and show results";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("endpoll")
            .WithDescription("End an active poll and show results")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("poll_id")
                .WithDescription("The message ID of the poll to end")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var pollService = services.GetRequiredService<PollService>();
        var pollId = command.Data.Options.First().Value as string ?? "";

        if (!pollService.PollExists(pollId))
        {
            await command.RespondAsync(
                embeds: [Components.Embeds.Error("Poll Not Found",
                    $"No active poll found with ID: `{pollId}`").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var poll = pollService.GetPoll(pollId);
        var canEnd = poll?.CreatedBy == command.User.Id.ToString(CultureInfo.InvariantCulture) ||
                     (command.User as SocketGuildUser)?.GuildPermissions.Has(GuildPermission.ManageMessages) == true;

        if (!canEnd)
        {
            await command.RespondAsync(
                embeds: [Components.Embeds.Error("Insufficient Permissions",
                    "You can only end polls you created or need the Manage Messages permission.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        await command.DeferAsync();
        var success = await pollService.EndPollAsync(pollId);

        if (success)
        {
            var embed = Components.Embeds.Success("✅ Poll Ended",
                $"Poll `{pollId}` has been ended and results have been displayed.");
            await command.ModifyOriginalResponseAsync(props =>
            {
                props.Embeds = new[] { embed.ToDiscordEmbed() };
            });
        }
        else
        {
            var embed = Components.Embeds.Error("Failed to End Poll",
                $"Could not end poll `{pollId}`.");
            await command.ModifyOriginalResponseAsync(props =>
            {
                props.Embeds = new[] { embed.ToDiscordEmbed() };
            });
        }
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
