using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Resources;
using KaorukoBot.Services;

namespace KaorukoBot.Interactions;

public static class TicketInteractions
{
    public static async Task HandleAsync(
        SocketMessageComponent interaction,
        TicketService ticketService,
        DatabaseService database,
        LoggingService logger)
    {
        var guild = ((SocketGuildChannel)interaction.Channel).Guild;
        var customId = interaction.Data.CustomId;

        if (customId.StartsWith(InteractionConstants.Ticket.Close, StringComparison.Ordinal))
        {
            var ticketId = customId[InteractionConstants.Ticket.Close.Length..];
            await ticketService.CloseTicketAsync(ticketId, guild, interaction.User);
            await interaction.RespondAsync(
                embeds: [Embeds.Success("Ticket Closed", "The ticket has been closed.").ToDiscordEmbed()],
                ephemeral: true);
        }
        else if (customId.StartsWith(InteractionConstants.Ticket.Delete, StringComparison.Ordinal))
        {
            var ticketId = customId[InteractionConstants.Ticket.Delete.Length..];
            await ticketService.DeleteTicketAsync(ticketId, guild);
            await interaction.RespondAsync(
                embeds: [Embeds.Success("Ticket Deleted", "The ticket has been deleted.").ToDiscordEmbed()],
                ephemeral: true);
        }
        else if (customId == InteractionConstants.Ticket.Create)
        {
            var config = await database.GetTicketConfigAsync(guild.Id.ToString(CultureInfo.InvariantCulture));
            if (config == null || config.Categories.Count == 0)
            {
                await interaction.RespondAsync(
                    embeds: [Embeds.Error("Not Configured",
                        "Ticket system is not configured. Contact an administrator.").ToDiscordEmbed()],
                    ephemeral: true);
                return;
            }

            if (config.Categories.Count == 1)
            {
                var modal = CreateTicketModal(config.Categories[0].Id);
                await interaction.RespondWithModalAsync(modal);
            }
            else
            {
                var selectMenu = new SelectMenuBuilder()
                    .WithCustomId(InteractionConstants.Ticket.CategorySelect)
                    .WithPlaceholder("Select a category")
                    .WithMinValues(1)
                    .WithMaxValues(1);

                foreach (var category in config.Categories)
                {
                    selectMenu.AddOption(category.Name, category.Id, category.Description);
                }

                await interaction.RespondAsync(
                    text: "Please select a ticket category:",
                    components: new Discord.ComponentBuilder().AddRow(new ActionRowBuilder().WithSelectMenu(selectMenu)).Build(),
                    ephemeral: true);
            }
        }
    }

    public static async Task HandleCategorySelectAsync(
        SocketMessageComponent interaction,
        TicketService ticketService,
        DatabaseService database,
        LoggingService logger)
    {
        var categoryId = interaction.Data.Values.First();
        var modal = CreateTicketModal(categoryId);
        await interaction.RespondWithModalAsync(modal);
    }

    public static async Task HandleModalSubmitAsync(
        SocketModal interaction,
        TicketService ticketService,
        LoggingService logger)
    {
        var categoryId = interaction.Data.CustomId[InteractionConstants.Ticket.ModalPrefix.Length..];
        var subject = interaction.Data.Components.First(c => c.CustomId == "ticket_subject").Value;
        var description = interaction.Data.Components.First(c => c.CustomId == "ticket_description").Value;

        await interaction.DeferAsync(ephemeral: true);

        var guild = ((SocketGuildChannel)interaction.Channel).Guild;
        var result = await ticketService.CreateTicketAsync(
            guild,
            interaction.User,
            categoryId,
            subject ?? "No subject",
            description ?? "No description");

        if (result.Success && result.ChannelId.HasValue)
        {
            await interaction.FollowupAsync(
                embeds: [Embeds.Success("Ticket Created",
                    $"Your ticket has been created: <#{result.ChannelId.Value}>").ToDiscordEmbed()],
                ephemeral: true);
        }
        else
        {
            await interaction.FollowupAsync(
                embeds: [Embeds.Error("Error",
                    result.Error ?? "Could not create your ticket.").ToDiscordEmbed()],
                ephemeral: true);
        }
    }

    private static Modal CreateTicketModal(string categoryId)
    {
        var modal = new ModalBuilder()
            .WithCustomId($"{InteractionConstants.Ticket.ModalPrefix}{categoryId}")
            .WithTitle("Create Ticket");

        modal.AddTextInput("ticket_subject", "Subject", TextInputStyle.Short, "Brief description of your issue", 1, 100, true);

        modal.AddTextInput("ticket_description", "Description", TextInputStyle.Paragraph, "Please provide details about your issue", 1, 1000, true);

        return modal.Build();
    }
}
