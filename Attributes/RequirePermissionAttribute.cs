using Discord;

namespace KaorukoBot.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute
{
    public GuildPermission Permission { get; }

    public RequirePermissionAttribute(GuildPermission permission)
    {
        Permission = permission;
    }
}
