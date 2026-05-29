using Discord;

namespace KaorukoBot.Components;

public static class Embeds
{
    private static readonly Dictionary<string, Color> Colors = new()
    {
        { "Success", new Color(0x00FF00) },
        { "Error", new Color(0xFF0000) },
        { "Warning", new Color(0xFFFF00) },
        { "Info", new Color(0x0000FF) },
        { "Primary", new Color(0x5865F2) }
    };

    public static void ConfigureColors(Dictionary<string, string> colorConfig)
    {
        foreach (var (key, value) in colorConfig)
        {
            if (uint.TryParse(value.TrimStart('#'), System.Globalization.NumberStyles.HexNumber, null, out var hex))
            {
                Colors[key] = new Color(hex);
            }
        }
    }

    public static EmbedProperties Create(
        string title,
        string description,
        string colorKey = "Primary")
    {
        var color = Colors.GetValueOrDefault(colorKey, Colors["Primary"]);
        return new EmbedProperties
        {
            Title = title,
            Description = description,
            Color = color,
            FooterText = "Kaoruko Bot",
            Timestamp = DateTimeOffset.UtcNow
        };
    }

    public static EmbedProperties Success(string title, string description)
    {
        return Create(title, description, "Success");
    }

    public static EmbedProperties Error(string title, string description)
    {
        return Create(title, description, "Error");
    }

    public static EmbedProperties Warning(string title, string description)
    {
        return Create(title, description, "Warning");
    }

    public static EmbedProperties Info(string title, string description)
    {
        return Create(title, description, "Info");
    }
}
