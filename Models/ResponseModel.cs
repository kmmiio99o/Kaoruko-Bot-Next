namespace KaorukoBot.Models;

public class ResponseModel
{
    public string? Content { get; set; }
    public Components.EmbedProperties? Embed { get; set; }
    public List<Components.EmbedProperties>? Embeds { get; set; }
    public Discord.MessageComponent? Components { get; set; }
    public bool IsEphemeral { get; set; }
    public bool IsTts { get; set; }
    public Discord.AllowedMentions? AllowedMentions { get; set; }
}
