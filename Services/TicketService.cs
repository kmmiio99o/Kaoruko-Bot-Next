using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Resources;

namespace KaorukoBot.Services;

public class TicketService
{
    private readonly DatabaseService _database;
    private readonly DiscordSocketClient _client;

    public TicketService(DatabaseService database, DiscordSocketClient client)
    {
        _database = database;
        _client = client;
    }

    public async Task<TicketResult> CreateTicketAsync(
        SocketGuild guild,
        SocketUser author,
        string categoryId,
        string subject,
        string description)
    {
        var config = await _database.GetTicketConfigAsync(guild.Id.ToString(CultureInfo.InvariantCulture));
        if (config == null || !config.IsEnabled)
        {
            return new TicketResult { Success = false, Error = "Ticket system is not configured." };
        }

        var category = config.Categories.FirstOrDefault(c => c.Id == categoryId);
        if (category == null)
        {
            return new TicketResult { Success = false, Error = "Invalid ticket category." };
        }

        var existingTickets = await _database.GetTicketsAsync(guild.Id.ToString(CultureInfo.InvariantCulture));
        var userOpenTickets = existingTickets.Count(t =>
            t.AuthorId == author.Id.ToString(CultureInfo.InvariantCulture) && t.Status != TicketStatus.Closed && t.Status != TicketStatus.Archived);

        if (userOpenTickets >= config.MaxTicketsPerUser)
        {
            return new TicketResult
            {
                Success = false,
                Error = $"You already have the maximum number of open tickets ({config.MaxTicketsPerUser})."
            };
        }

        var ticketId = Guid.NewGuid().ToString("N")[..8];

        var channelName = $"ticket-{author.Username.ToLowerInvariant().Replace(' ', '-')}-{ticketId}";

        var guildUser = guild.GetUser(author.Id);
        var everyoneRole = guild.EveryoneRole;

        var overwrites = new List<Overwrite>
        {
            new(everyoneRole.Id, PermissionTarget.Role, new OverwritePermissions(viewChannel: PermValue.Deny)),
            new(author.Id, PermissionTarget.User, new OverwritePermissions(
                viewChannel: PermValue.Allow,
                sendMessages: PermValue.Allow,
                readMessageHistory: PermValue.Allow,
                attachFiles: PermValue.Allow,
                embedLinks: PermValue.Allow))
        };

        // Add support roles
        foreach (var roleId in config.SupportRoles)
        {
            if (ulong.TryParse(roleId, out var roleIdUlong) && guild.Roles.Any(r => r.Id == roleIdUlong))
            {
                overwrites.Add(new Overwrite(roleIdUlong, PermissionTarget.Role, new OverwritePermissions(
                    viewChannel: PermValue.Allow,
                    sendMessages: PermValue.Allow,
                    readMessageHistory: PermValue.Allow)));
            }
        }

        // Category specific support roles
        foreach (var roleId in category.SupportRoles)
        {
            if (ulong.TryParse(roleId, out var roleIdUlong) && guild.Roles.Any(r => r.Id == roleIdUlong))
            {
                overwrites.Add(new Overwrite(roleIdUlong, PermissionTarget.Role, new OverwritePermissions(
                    viewChannel: PermValue.Allow,
                    sendMessages: PermValue.Allow,
                    readMessageHistory: PermValue.Allow)));
            }
        }

        ulong? parentId = null;
        if (!string.IsNullOrEmpty(config.TicketChannelParentId) &&
            ulong.TryParse(config.TicketChannelParentId, out var catId))
        {
            parentId = catId;
        }
        else if (!string.IsNullOrEmpty(category.ChannelParentId) &&
                 ulong.TryParse(category.ChannelParentId, out var catCategoryId))
        {
            parentId = catCategoryId;
        }

        var channel = await guild.CreateTextChannelAsync(channelName, props =>
        {
            props.CategoryId = parentId;
            props.Topic = $"Ticket #{ticketId} - {subject}";
            props.PermissionOverwrites = overwrites;
        });

        var ticket = new Ticket
        {
            TicketId = ticketId,
            GuildId = guild.Id.ToString(CultureInfo.InvariantCulture),
            ChannelId = channel.Id.ToString(CultureInfo.InvariantCulture),
            AuthorId = author.Id.ToString(CultureInfo.InvariantCulture),
            AuthorName = author.Username,
            CategoryId = categoryId,
            Subject = subject,
            Description = description,
            Status = TicketStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        await _database.SaveTicketAsync(ticket);

        var embed = Components.Embeds.Info("Ticket Created",
            $"**Subject:** {subject}\n**Description:** {description}\n**Category:** {category.Name}");
        embed.Fields =
        [
            new EmbedFieldProperties { Name = "Ticket ID", Value = ticketId, IsInline = true },
            new EmbedFieldProperties { Name = "Status", Value = "Open", IsInline = true }
        ];

        var closeButtonBuilder = new ButtonBuilder()
            .WithCustomId($"{InteractionConstants.Ticket.Close}{ticketId}")
            .WithLabel("Close Ticket")
            .WithStyle(ButtonStyle.Danger)
            .WithEmote(new Emoji("🔒"));
        var row = new ActionRowBuilder().AddComponent(closeButtonBuilder);
        var component = new Discord.ComponentBuilder().AddRow(row).Build();

        await channel.SendMessageAsync(
            $"{author.Mention} Welcome to your ticket! Support staff will be with you shortly.",
            embeds: [embed.ToDiscordEmbed()],
            components: component);

        return new TicketResult { Success = true, ChannelId = channel.Id };
    }

    public async Task CloseTicketAsync(string ticketId, SocketGuild guild, SocketUser closer)
    {
        var tickets = await _database.GetTicketsAsync(guild.Id.ToString(CultureInfo.InvariantCulture));
        var ticket = tickets.FirstOrDefault(t => t.TicketId == ticketId);

        if (ticket == null) return;

        ticket.Status = TicketStatus.Closed;
        ticket.ClosedBy = closer.Id.ToString(CultureInfo.InvariantCulture);
        ticket.ClosedAt = DateTime.UtcNow;
        await _database.SaveTicketAsync(ticket);

        var channel = guild.GetTextChannel(ulong.Parse(ticket.ChannelId, CultureInfo.InvariantCulture));
        if (channel != null)
        {
            await channel.DeleteAsync();
        }
    }

    public static async Task<string> GenerateTranscriptAsync(SocketTextChannel channel, Ticket ticket)
    {
        var messages = await channel.GetMessagesAsync(100).FlattenAsync();
        var transcript = $"Ticket Transcript for ticket-{ticket.TicketId}\n" +
                         $"Created by: {ticket.AuthorName} ({ticket.AuthorId})\n" +
                         $"Date: {DateTime.UtcNow:O}\n" +
                         $"──────────────────────────────────────────────────\n\n";

        foreach (var msg in messages.Reverse())
        {
            transcript += $"[{msg.Timestamp:O}] {msg.Author.Username}: {msg.Content}\n";
            foreach (var attachment in msg.Attachments)
            {
                transcript += $"[Attachment] {attachment.Url}\n";
            }
        }

        return transcript;
    }

    public async Task DeleteTicketAsync(string ticketId, SocketGuild guild)
    {
        var tickets = await _database.GetTicketsAsync(guild.Id.ToString(CultureInfo.InvariantCulture));
        var ticket = tickets.FirstOrDefault(t => t.TicketId == ticketId);
        if (ticket == null) return;

        var channel = guild.GetTextChannel(ulong.Parse(ticket.ChannelId, CultureInfo.InvariantCulture));
        if (channel != null)
        {
            await channel.DeleteAsync();
        }

        // Remove from DB
        await _database.SaveTicketAsync(ticket); // status already set to closed
    }
}

public class TicketResult
{
    public bool Success { get; set; }
    public ulong? ChannelId { get; set; }
    public string? Error { get; set; }
}
