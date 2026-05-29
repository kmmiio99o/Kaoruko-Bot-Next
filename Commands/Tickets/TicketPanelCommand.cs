using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Tickets;

public class TicketPanelCommand : BotCommand
{
    public override string Name => "ticketpanel";
    public override string Description => "Create a ticket panel in this channel";
    public override CommandCategory Category => CommandCategory.Tickets;
    public override GuildPermission? RequiredPermission => GuildPermission.Administrator;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("ticketpanel")
            .WithDescription("Create a ticket panel in this channel")
            .WithDefaultMemberPermissions(GuildPermission.Administrator);
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        if (context.GuildUser?.GuildPermissions.Administrator != true)
        {
            await command.RespondAsync(embeds: [Embeds.Error("Permission Denied",
                "You need Administrator permission.").ToDiscordEmbed()], ephemeral: true);
            return;
        }

        var config = await services.GetRequiredService<TicketConfigService>()
            .GetOrCreateConfigAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));

        var selectMenu = new SelectMenuBuilder()
            .WithCustomId("ticket_category_select")
            .WithPlaceholder("Select a category")
            .WithMinValues(1)
            .WithMaxValues(1);

        foreach (var category in config.Categories)
        {
            selectMenu.AddOption(category.Name, category.Id, category.Description);
        }

        var embed = Embeds.Info("🎫 Create a Ticket",
            "Select a category below to create a ticket. Our support team will assist you as soon as possible.");
        embed.Fields = config.Categories.Select(c => new EmbedFieldProperties
        {
            Name = c.Name,
            Value = c.Description ?? "No description",
            IsInline = true
        }).ToList();

        var row = new ActionRowBuilder().WithSelectMenu(selectMenu);
        var comp = new Discord.ComponentBuilder().AddRow(row).Build();
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], components: comp);
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
