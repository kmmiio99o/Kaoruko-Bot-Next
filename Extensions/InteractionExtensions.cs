using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Models;

namespace KaorukoBot.Extensions;

public static class InteractionExtensions
{
    public static ContextModel ToContextModel(this SocketInteraction interaction)
    {
        return new ContextModel
        {
            User = interaction.User,
            Guild = (interaction.Channel as SocketGuildChannel)?.Guild,
            Channel = interaction.Channel as SocketTextChannel,
            GuildUser = interaction.User as SocketGuildUser,
            IsSlashCommand = interaction is SocketSlashCommand,
            InteractionId = interaction.Id.ToString(CultureInfo.InvariantCulture)
        };
    }

    public static bool HasPermission(this SocketGuildUser user, GuildPermission permission)
    {
        return user.GuildPermissions.Has(permission);
    }

    public static bool IsOwner(this SocketUser user, ulong ownerId)
    {
        return user.Id == ownerId;
    }
}
