using System.ComponentModel.DataAnnotations;

namespace KaorukoBot.Models;

public class GuildSettings
{
    [Key]
    public string GuildId { get; set; } = string.Empty;
    public string Prefix { get; set; } = ".";
    public List<string> AdminRoles { get; set; } = [];
    public List<string> ModRoles { get; set; } = [];
    public List<string> AllowedChannels { get; set; } = [];
    public List<string> BlockedChannels { get; set; } = [];
    public List<string> BlacklistedUsers { get; set; } = [];
    public string? LogChannelId { get; set; }
    public string? WelcomeChannelId { get; set; }
    public bool AutoModEnabled { get; set; }
}
