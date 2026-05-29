using KaorukoBot.Models;

namespace KaorukoBot.Services;

public class GuildSettingsService
{
    private readonly DatabaseService _database;

    public GuildSettingsService(DatabaseService database)
    {
        _database = database;
    }

    public async Task<GuildSettings> GetOrCreateSettingsAsync(string guildId)
    {
        var settings = await _database.GetGuildSettingsAsync(guildId);
        if (settings != null)
            return settings;

        settings = new GuildSettings
        {
            GuildId = guildId,
            Prefix = "."
        };

        await _database.SaveGuildSettingsAsync(guildId, settings);
        return settings;
    }

    public async Task UpdateSettingsAsync(string guildId, GuildSettings settings)
    {
        await _database.SaveGuildSettingsAsync(guildId, settings);
    }

    public async Task<string> GetPrefixAsync(string guildId)
    {
        var settings = await GetOrCreateSettingsAsync(guildId);
        return settings.Prefix;
    }
}
