using Discord;
using Discord.WebSocket;

namespace KaorukoBot.Models;

public class ContextModel
{
    public SocketUser User { get; init; } = null!;
    public SocketGuild? Guild { get; init; }
    public SocketTextChannel? Channel { get; init; }
    public SocketGuildUser? GuildUser { get; init; }
    public bool IsSlashCommand { get; init; }
    public string? InteractionId { get; init; }
    public IMessage? ReferencedMessage { get; init; }
}
