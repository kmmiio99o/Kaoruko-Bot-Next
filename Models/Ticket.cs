using System.ComponentModel.DataAnnotations;

namespace KaorukoBot.Models;

public enum TicketStatus
{
    Open,
    InProgress,
    Waiting,
    Closed,
    Archived
}

public class Ticket
{
    [Key]
    public string TicketId { get; set; } = string.Empty;
    public string GuildId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public string? AssignedTo { get; set; }
    public string? ClosedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<TicketMessage> Messages { get; set; } = [];
}

public class TicketMessage
{
    public string MessageId { get; set; } = string.Empty;
    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public List<string> AttachmentUrls { get; set; } = [];
}
