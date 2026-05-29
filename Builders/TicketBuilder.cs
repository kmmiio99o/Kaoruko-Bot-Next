using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Resources;

namespace KaorukoBot.Builders;

public static class TicketBuilder
{
    public static List<Overwrite> BuildPermissionOverwrites(
        SocketGuild guild,
        SocketUser author,
        TicketConfig config,
        TicketCategory? category)
    {
        var overwrites = new List<Overwrite>
        {
            new(guild.EveryoneRole.Id, PermissionTarget.Role,
                new OverwritePermissions(viewChannel: PermValue.Deny)),
            new(author.Id, PermissionTarget.User,
                new OverwritePermissions(
                    viewChannel: PermValue.Allow,
                    sendMessages: PermValue.Allow,
                    readMessageHistory: PermValue.Allow,
                    attachFiles: PermValue.Allow,
                    embedLinks: PermValue.Allow))
        };

        foreach (var roleId in config.SupportRoles)
        {
            if (ulong.TryParse(roleId, out var id) && guild.Roles.Any(r => r.Id == id))
            {
                overwrites.Add(new Overwrite(id, PermissionTarget.Role,
                    new OverwritePermissions(
                        viewChannel: PermValue.Allow,
                        sendMessages: PermValue.Allow,
                        readMessageHistory: PermValue.Allow)));
            }
        }

        if (category != null)
        {
            foreach (var roleId in category.SupportRoles)
            {
                if (ulong.TryParse(roleId, out var id) && guild.Roles.Any(r => r.Id == id))
                {
                    overwrites.Add(new Overwrite(id, PermissionTarget.Role,
                        new OverwritePermissions(
                            viewChannel: PermValue.Allow,
                            sendMessages: PermValue.Allow,
                            readMessageHistory: PermValue.Allow)));
                }
            }
        }

        return overwrites;
    }

    public static (EmbedProperties embed, ActionRowBuilder row) BuildTicketWelcomeEmbed(
        Ticket ticket,
        TicketCategory? category)
    {
        var embed = Embeds.Info("Ticket Created",
            $"**Subject:** {ticket.Subject}\n**Description:** {ticket.Description}\n**Category:** {category?.Name ?? "General"}");
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Ticket ID", Value = ticket.TicketId, IsInline = true },
            new EmbedFieldProperties { Name = "Status", Value = "Open", IsInline = true }
        ];

        var closeButton = new ButtonBuilder()
            .WithCustomId($"{InteractionConstants.Ticket.Close}{ticket.TicketId}")
            .WithLabel("Close Ticket")
            .WithStyle(ButtonStyle.Danger)
            .WithEmote(new Emoji("🔒"));

        var row = new ActionRowBuilder().AddComponent(closeButton);

        return (embed, row);
    }

    public static EmbedProperties BuildTicketPanelEmbed(string guildName, List<TicketCategory> categories)
    {
        var embed = Embeds.Info("🎫 Create a Ticket",
            "Select a category below to create a ticket. Our support team will assist you as soon as possible.");
        embed.Fields = categories.Select(c => new EmbedFieldProperties
        {
            Name = c.Name,
            Value = c.Description ?? "No description",
            IsInline = true
        }).ToList();

        return embed;
    }
}
