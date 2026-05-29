using KaorukoBot.Models;

namespace KaorukoBot.Services;

public class TicketConfigService
{
    private readonly DatabaseService _database;

    public TicketConfigService(DatabaseService database)
    {
        _database = database;
    }

    public async Task<TicketConfig?> GetConfigAsync(string guildId)
    {
        return await _database.GetTicketConfigAsync(guildId);
    }

    public async Task<TicketConfig> GetOrCreateConfigAsync(string guildId)
    {
        var config = await _database.GetTicketConfigAsync(guildId);
        if (config != null)
            return config;

        config = new TicketConfig
        {
            GuildId = guildId,
            IsEnabled = true,
            Categories =
            [
                new TicketCategory
                {
                    Id = "general",
                    Name = "General Support",
                    Description = "General support inquiries"
                }
            ]
        };

        await _database.SaveTicketConfigAsync(guildId, config);
        return config;
    }

    public async Task SaveConfigAsync(string guildId, TicketConfig config)
    {
        await _database.SaveTicketConfigAsync(guildId, config);
    }

    public async Task AddCategoryAsync(string guildId, TicketCategory category)
    {
        var config = await GetOrCreateConfigAsync(guildId);
        config.Categories.Add(category);
        await _database.SaveTicketConfigAsync(guildId, config);
    }

    public async Task RemoveCategoryAsync(string guildId, string categoryId)
    {
        var config = await GetOrCreateConfigAsync(guildId);
        config.Categories.RemoveAll(c => c.Id == categoryId);
        await _database.SaveTicketConfigAsync(guildId, config);
    }
}
