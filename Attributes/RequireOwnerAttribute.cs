using Discord;
using Discord.WebSocket;

namespace KaorukoBot.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireOwnerAttribute : Attribute
{
    public static bool Check(SocketUser user, ulong ownerId)
    {
        return user.Id == ownerId;
    }
}
