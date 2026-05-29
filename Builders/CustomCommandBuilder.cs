using System.Globalization;
using System.Text.RegularExpressions;
using KaorukoBot.Models;

namespace KaorukoBot.Builders;

public static partial class CustomCommandBuilder
{
    [GeneratedRegex(@"\{choice\[([^\]]+)\]\}")]
    private static partial Regex ChoiceRegex();

    [GeneratedRegex(@"\{random\[(\d+),(\d+)\]\}")]
    private static partial Regex RandomRangeRegex();

    public static string ProcessVariables(string content, Dictionary<string, string> variables)
    {
        var result = content;

        foreach (var (key, value) in variables)
        {
            result = result.Replace($"{{{key}}}", value);
        }

        result = ChoiceRegex().Replace(result,
            match =>
            {
                var options = match.Groups[1].Value.Split('|');
                return options[Random.Shared.Next(options.Length)];
            });

        // Process random numbers: {random[min,max]}
        result = RandomRangeRegex().Replace(result,
            match =>
            {
                var min = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                var max = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
                return Random.Shared.Next(min, max + 1).ToString(CultureInfo.InvariantCulture);
            });

        return result;
    }

    public static bool ValidateCommand(CustomCommand command, out string? error)
    {
        error = null;

        if (string.IsNullOrWhiteSpace(command.Name))
        {
            error = "Command name is required.";
            return false;
        }

        if (command.Name.Length > 32)
        {
            error = "Command name must be 32 characters or less.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(command.Content))
        {
            error = "Command content is required.";
            return false;
        }

        if (command.Content.Length > 4000)
        {
            error = "Command content must be 4000 characters or less.";
            return false;
        }

        if (command.Trigger == TriggerType.Random && command.RandomChance.HasValue)
        {
            if (command.RandomChance < 0 || command.RandomChance > 100)
            {
                error = "Random chance must be between 0 and 100.";
                return false;
            }
        }

        return true;
    }
}
