using Discord;

namespace KaorukoBot.Components;

public class EmbedProperties
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Color Color { get; set; } = new(0x5865F2);
    public string? Url { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? AuthorName { get; set; }
    public string? AuthorIconUrl { get; set; }
    public string? AuthorUrl { get; set; }
    public string? FooterText { get; set; }
    public string? FooterIconUrl { get; set; }
    public DateTimeOffset? Timestamp { get; set; }
    public List<EmbedFieldProperties> Fields { get; set; } = [];

    public EmbedProperties WithThumbnail(string? url) { ThumbnailUrl = url; return this; }
    public EmbedProperties WithImage(string? url) { ImageUrl = url; return this; }
    public EmbedProperties WithFooter(string? text, string? iconUrl = null) { FooterText = text; FooterIconUrl = iconUrl; return this; }
    public EmbedProperties WithAuthor(string? name, string? iconUrl = null, string? url = null) { AuthorName = name; AuthorIconUrl = iconUrl; AuthorUrl = url; return this; }
    public EmbedProperties WithTimestamp(DateTimeOffset? timestamp) { Timestamp = timestamp; return this; }
    public EmbedProperties WithColor(Color color) { Color = color; return this; }
    public EmbedProperties WithTitle(string? title) { Title = title; return this; }
    public EmbedProperties WithDescription(string? description) { Description = description; return this; }
    public EmbedProperties WithUrl(string? url) { Url = url; return this; }

    public Embed ToDiscordEmbed()
    {
        var embed = new EmbedBuilder()
            .WithTitle(Title ?? "")
            .WithDescription(Description ?? "")
            .WithColor(Color)
            .WithTimestamp(Timestamp ?? DateTimeOffset.UtcNow)
            .WithFooter(FooterText ?? "Kaoruko Bot", FooterIconUrl);

        if (!string.IsNullOrEmpty(Url))
            embed.WithUrl(Url);

        if (!string.IsNullOrEmpty(ThumbnailUrl))
            embed.WithThumbnailUrl(ThumbnailUrl);

        if (!string.IsNullOrEmpty(ImageUrl))
            embed.WithImageUrl(ImageUrl);

        if (!string.IsNullOrEmpty(AuthorName))
            embed.WithAuthor(AuthorName, AuthorIconUrl, AuthorUrl);

        foreach (var field in Fields)
        {
            embed.AddField(field.Name, field.Value, field.IsInline);
        }

        return embed.Build();
    }
}

public class EmbedFieldProperties
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsInline { get; set; }
}
