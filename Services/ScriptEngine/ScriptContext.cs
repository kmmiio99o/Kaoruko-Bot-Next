using Discord;
using Discord.WebSocket;

namespace KaorukoBot.Services.ScriptEngine;

/// <summary>
/// Provides execution context for scripts, including Discord-specific information and parsed arguments.
/// Designed to be lightweight and easily serializable for passing to script engines.
/// </summary>
public class ScriptContext
{
    /// <summary>
    /// User information - the person executing the command.
    /// </summary>
    public UserInfo User { get; set; } = new();

    /// <summary>
    /// Guild information - the server where the command was executed.
    /// </summary>
    public GuildInfo? Guild { get; set; }

    /// <summary>
    /// Channel information where the command was executed.
    /// </summary>
    public ChannelInfo? Channel { get; set; }

    /// <summary>
    /// Message content that triggered the command.
    /// </summary>
    public string MessageContent { get; set; } = string.Empty;

    /// <summary>
    /// Author of the message (guild member information).
    /// </summary>
    public GuildMemberInfo? Author { get; set; }

    /// <summary>
    /// Parsed arguments from the command input.
    /// </summary>
    public string[] Arguments { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Callback delegate for scripts to send responses.
    /// </summary>
    public Func<string, Task>? ResponseCallback { get; set; }

    /// <summary>
    /// Creates a script context from Discord models for minimal memory footprint.
    /// Only serializes necessary information.
    /// </summary>
    public static ScriptContext FromDiscordContext(
        SocketUser user,
        SocketGuild? guild,
        SocketTextChannel? channel,
        SocketGuildUser? guildUser,
        string messageContent,
        string[] arguments,
        Func<string, Task>? responseCallback = null)
    {
        return new ScriptContext
        {
            User = new UserInfo
            {
                Id = user.Id.ToString(),
                Name = user.Username,
                Discriminator = user.Discriminator,
                IsBot = user.IsBot,
                AvatarUrl = user.GetAvatarUrl() ?? string.Empty
            },
            Guild = guild != null ? new GuildInfo
            {
                Id = guild.Id.ToString(),
                Name = guild.Name,
                MemberCount = guild.MemberCount,
                OwnerId = guild.OwnerId.ToString(),
                AvailableRole = guild.Roles.Count
            } : null,
            Channel = channel != null ? new ChannelInfo
            {
                Id = channel.Id.ToString(),
                Name = channel.Name,
                Topic = channel.Topic ?? string.Empty
            } : null,
            MessageContent = messageContent,
            Author = guildUser != null ? new GuildMemberInfo
            {
                UserId = guildUser.Id.ToString(),
                Nickname = guildUser.Nickname ?? string.Empty,
                JoinedAt = guildUser.JoinedAt?.DateTime ?? DateTime.UtcNow,
                RoleIds = guildUser.Roles.Select(r => r.Id.ToString()).ToList()
            } : null,
            Arguments = arguments,
            ResponseCallback = responseCallback
        };
    }
}

/// <summary>
/// Lightweight user information for script execution context.
/// </summary>
public class UserInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Discriminator { get; set; } = string.Empty;
    public bool IsBot { get; set; }
    public string AvatarUrl { get; set; } = string.Empty;
}

/// <summary>
/// Lightweight guild information for script execution context.
/// </summary>
public class GuildInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public int AvailableRole { get; set; }
}

/// <summary>
/// Lightweight channel information for script execution context.
/// </summary>
public class ChannelInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
}

/// <summary>
/// Lightweight guild member information for script execution context.
/// </summary>
public class GuildMemberInfo
{
    public string UserId { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public List<string> RoleIds { get; set; } = new();
}
