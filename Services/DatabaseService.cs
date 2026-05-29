using Microsoft.EntityFrameworkCore;
using KaorukoBot.Data;
using KaorukoBot.Models;

namespace KaorukoBot.Services;

public class DatabaseService
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;

    public DatabaseService(IDbContextFactory<AppDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    private AppDbContext CreateContext() => _contextFactory.CreateDbContext();

    // Guild Settings
    public async Task<GuildSettings?> GetGuildSettingsAsync(string guildId)
    {
        await using var db = CreateContext();
        return await db.GuildSettings.FindAsync(guildId);
    }

    public async Task SaveGuildSettingsAsync(string guildId, GuildSettings settings)
    {
        await using var db = CreateContext();
        var existing = await db.GuildSettings.FindAsync(guildId);
        if (existing != null)
            db.GuildSettings.Entry(existing).CurrentValues.SetValues(settings);
        else
            db.GuildSettings.Add(settings);
        await db.SaveChangesAsync();
    }

    // Ticket Config
    public async Task<TicketConfig?> GetTicketConfigAsync(string guildId)
    {
        await using var db = CreateContext();
        return await db.TicketConfigs.FindAsync(guildId);
    }

    public async Task SaveTicketConfigAsync(string guildId, TicketConfig config)
    {
        await using var db = CreateContext();
        var existing = await db.TicketConfigs.FindAsync(guildId);
        if (existing != null)
            db.TicketConfigs.Entry(existing).CurrentValues.SetValues(config);
        else
            db.TicketConfigs.Add(config);
        await db.SaveChangesAsync();
    }

    // Tickets
    public async Task<List<Ticket>> GetTicketsAsync(string guildId)
    {
        await using var db = CreateContext();
        return await db.Tickets.Where(t => t.GuildId == guildId).ToListAsync();
    }

    public async Task<Ticket?> GetTicketByChannelAsync(string channelId)
    {
        await using var db = CreateContext();
        return await db.Tickets.FirstOrDefaultAsync(t => t.ChannelId == channelId);
    }

    public async Task SaveTicketAsync(Ticket ticket)
    {
        await using var db = CreateContext();
        var existing = await db.Tickets.FindAsync(ticket.TicketId);
        if (existing != null)
            db.Tickets.Entry(existing).CurrentValues.SetValues(ticket);
        else
            db.Tickets.Add(ticket);
        await db.SaveChangesAsync();
    }

    // Custom Commands
    public async Task<List<CustomCommand>> GetCustomCommandsAsync(string guildId)
    {
        await using var db = CreateContext();
        return await db.CustomCommands.Where(c => c.GuildId == guildId).ToListAsync();
    }

    public async Task<List<CustomCommand>> GetAllCustomCommandsAsync()
    {
        await using var db = CreateContext();
        return await db.CustomCommands.ToListAsync();
    }

    public async Task SaveCustomCommandAsync(CustomCommand command)
    {
        await using var db = CreateContext();
        var existing = await db.CustomCommands.FindAsync(command.Id);
        if (existing != null)
            db.CustomCommands.Entry(existing).CurrentValues.SetValues(command);
        else
            db.CustomCommands.Add(command);
        await db.SaveChangesAsync();
    }

    public async Task DeleteCustomCommandAsync(string guildId, string commandId)
    {
        await using var db = CreateContext();
        var command = await db.CustomCommands.FindAsync(commandId);
        if (command != null)
            db.CustomCommands.Remove(command);
        await db.SaveChangesAsync();
    }
}
