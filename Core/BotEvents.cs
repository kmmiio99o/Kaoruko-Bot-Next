using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using KaorukoBot.Extensions;
using KaorukoBot.Interactions;
using KaorukoBot.Models;
using KaorukoBot.Resources;
using KaorukoBot.Services;

namespace KaorukoBot;

public partial class Bot
{
    private async Task OnInteractionCreatedAsync(SocketInteraction interaction)
    {
        try
        {
            if (interaction is SocketMessageComponent componentInteraction)
            {
                if (componentInteraction.Data.CustomId.StartsWith(InteractionConstants.Ticket.Close, StringComparison.Ordinal) ||
                    componentInteraction.Data.CustomId.StartsWith(InteractionConstants.Ticket.Delete, StringComparison.Ordinal) ||
                    componentInteraction.Data.CustomId.StartsWith(InteractionConstants.Ticket.Create, StringComparison.Ordinal))
                {
                    await TicketInteractions.HandleAsync(componentInteraction, _ticketService, _database, _logger);
                    return;
                }

                if (componentInteraction.Data.CustomId.StartsWith("poll_vote_", StringComparison.Ordinal))
                {
                    await PollInteractions.HandleVoteAsync(componentInteraction, _pollService, _logger);
                    return;
                }
            }

            if (interaction is SocketMessageComponent selectInteraction &&
                selectInteraction.Data.CustomId == InteractionConstants.Ticket.CategorySelect)
            {
                await TicketInteractions.HandleCategorySelectAsync(selectInteraction, _ticketService, _database, _logger);
                return;
            }

            if (interaction is SocketModal modalInteraction &&
                modalInteraction.Data.CustomId.StartsWith(InteractionConstants.Ticket.ModalPrefix, StringComparison.Ordinal))
            {
                await TicketInteractions.HandleModalSubmitAsync(modalInteraction, _ticketService, _logger);
                return;
            }
        }
        catch (Exception ex)
        {
            LoggingService.Error($"Error handling interaction: {ex.Message}");

            if (!interaction.HasResponded)
            {
                await interaction.RespondAsync(
                    embeds: [Components.Embeds.Error("Error", "An unexpected error occurred.").ToDiscordEmbed()],
                    ephemeral: true);
            }
        }
    }

    private async Task OnSlashCommandExecutedAsync(SocketSlashCommand command)
    {
        var context = command.ToContextModel();
        var success = true;
        string? error = null;

        try
        {
            await _commandRegistry.HandleSlashAsync(command, context, _services);
        }
        catch (Exception ex)
        {
            success = false;
            error = ex.Message;
            LoggingService.Error($"Error executing /{command.Data.Name}: {ex}");

            if (!command.HasResponded)
            {
                await command.RespondAsync(
                    embeds: [Components.Embeds.Error("Command Error",
                        "An error occurred while executing this command.").ToDiscordEmbed()],
                    ephemeral: true);
            }
        }

        await LoggingService.LogCommandUsageAsync(
            command.Data.Name,
            command.User.Id,
            command.User.Username,
            context.Guild?.Id,
            context.Guild?.Name,
            command.ChannelId,
            success,
            error);
    }

    private async Task OnMessageReceivedAsync(SocketMessage message)
    {
        if (message.Author.IsBot) return;
        if (message is not SocketUserMessage userMessage) return;
        if (message.Channel is not SocketTextChannel channel) return;

        var guild = channel.Guild;

        var customCommand = await _customCommandService.MatchMessageAsync(
            guild.Id.ToString(CultureInfo.InvariantCulture), message.Content);

        if (customCommand != null)
        {
            var variables = new Dictionary<string, string>
            {
                { "user", message.Author.Mention },
                { "user.id", message.Author.Id.ToString(CultureInfo.InvariantCulture) },
                { "user.name", message.Author.Username },
                { "guild", guild.Name },
                { "channel", message.Channel.Name },
                { "args", message.Content }
            };

            var response = CustomCommandService.ProcessVariables(customCommand.Content, variables);
            await message.Channel.SendMessageAsync(response);
            return;
        }

        var prefix = _prefix;
        if (!message.Content.StartsWith(prefix, StringComparison.Ordinal)) return;

        var args = message.Content[prefix.Length..].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var commandName = args.Length > 0 ? args[0].ToLowerInvariant() : "";
        var commandArgs = args.Length > 1 ? args[1..] : [];

        await HandlePrefixCommandAsync(commandName, commandArgs, userMessage, guild);
    }

    private async Task HandlePrefixCommandAsync(string commandName, string[] args, SocketUserMessage message, SocketGuild guild)
    {
        try
        {
            await _commandRegistry.HandlePrefixAsync(commandName, message, args, guild, _services);
        }
        catch (Exception ex)
        {
            LoggingService.Error($"Error executing prefix command {commandName}: {ex.Message}");
            await message.ReplyAsync(
                embeds: [Components.Embeds.Error("Command Error",
                    "An error occurred while executing this command.").ToDiscordEmbed()]);
        }
    }
}
