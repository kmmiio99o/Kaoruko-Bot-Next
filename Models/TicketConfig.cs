using System.ComponentModel.DataAnnotations;

namespace KaorukoBot.Models;

public class TicketCategory
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> SupportRoles { get; set; } = [];
    public string? ChannelParentId { get; set; }
}

public class TicketConfig
{
    [Key]
    public string GuildId { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string? PanelChannelId { get; set; }
    public string? PanelMessageId { get; set; }
    public List<TicketCategory> Categories { get; set; } = [];
    public List<string> SupportRoles { get; set; } = [];
    public string? TranscriptChannelId { get; set; }
    public string? TicketChannelParentId { get; set; }
    public int MaxTicketsPerUser { get; set; } = 3;
    public bool DmOnClose { get; set; } = true;
    public bool DmOnTranscript { get; set; }
}
