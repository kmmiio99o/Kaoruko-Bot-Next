namespace KaorukoBot.Models;

public class Poll
{
    public string MessageId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string GuildId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public List<string> Options { get; set; } = [];
    public Dictionary<string, int> Votes { get; set; } = []; // userId -> optionIndex
    public bool Anonymous { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
