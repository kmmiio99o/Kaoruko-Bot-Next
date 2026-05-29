using System.Globalization;
using System.Text.RegularExpressions;
using KaorukoBot.Models;

namespace KaorukoBot.Services;

public partial class CustomCommandService
{
    private readonly DatabaseService _database;

    public CustomCommandService(DatabaseService database)
    {
        _database = database;
    }

    public async Task<List<CustomCommand>> GetCommandsAsync(string guildId)
    {
        return await _database.GetCustomCommandsAsync(guildId);
    }

    public async Task<List<CustomCommand>> GetAllCommandsAsync()
    {
        return await _database.GetAllCustomCommandsAsync();
    }

    public async Task<CustomCommand?> GetCommandByNameAsync(string guildId, string name)
    {
        var commands = await _database.GetCustomCommandsAsync(guildId);
        return commands.FirstOrDefault(c =>
            c.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && c.IsEnabled);
    }

    public async Task<bool> CreateCommandAsync(CustomCommand command)
    {
        var existing = await GetCommandByNameAsync(command.GuildId, command.Name);
        if (existing != null)
            return false;

        await _database.SaveCustomCommandAsync(command);
        return true;
    }

    public async Task<bool> UpdateCommandAsync(string guildId, string commandId, CustomCommand updated)
    {
        var commands = await _database.GetCustomCommandsAsync(guildId);
        var existing = commands.FirstOrDefault(c => c.Id == commandId);
        if (existing == null)
            return false;

        await _database.SaveCustomCommandAsync(updated);
        return true;
    }

    public async Task<bool> DeleteCommandAsync(string guildId, string commandId)
    {
        await _database.DeleteCustomCommandAsync(guildId, commandId);
        return true;
    }

    public async Task<CustomCommand?> MatchMessageAsync(string guildId, string messageContent)
    {
        var commands = await _database.GetCustomCommandsAsync(guildId);
        return commands.FirstOrDefault(c =>
        {
            if (!c.IsEnabled) return false;

            return c.Trigger switch
            {
                TriggerType.Exact => messageContent.Equals(c.TriggerValue ?? c.Name, StringComparison.OrdinalIgnoreCase),
                TriggerType.Contains => messageContent.Contains(c.TriggerValue ?? c.Name, StringComparison.OrdinalIgnoreCase),
                TriggerType.StartsWith => messageContent.StartsWith(c.TriggerValue ?? c.Name, StringComparison.OrdinalIgnoreCase),
                TriggerType.Regex => System.Text.RegularExpressions.Regex.IsMatch(messageContent, c.TriggerValue ?? c.Name),
                _ => false
            };
        });
    }

    [GeneratedRegex(@"\{choice\[([^\]]+)\]\}")]
    private static partial Regex ChoiceRegex();

    public static string ProcessVariables(string content, Dictionary<string, string> variables)
    {
        var result = content;
        foreach (var (key, value) in variables)
        {
            result = result.Replace($"{{{key}}}", value);
        }

        // Process random choices: {choice[a|b|c]}
        result = ChoiceRegex().Replace(result,
            match =>
            {
                var options = match.Groups[1].Value.Split('|');
                return options[Random.Shared.Next(options.Length)];
            });

        return result;
    }
}
