using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands;

public abstract class BotCommand
{
    public abstract string Name { get; }
    public abstract string Description { get; }
    public abstract CommandCategory Category { get; }
    public abstract GuildPermission? RequiredPermission { get; }

    /// <summary>
    /// Additional guild permissions required for execution. Optional.
    /// Checked in addition to RequiredPermission.
    /// </summary>
    public virtual GuildPermission[] AdditionalRequiredPermissions { get; } = Array.Empty<GuildPermission>();

    /// <summary>
    /// Command categories this command belongs to. Supports multiple categories for filtering.
    /// </summary>
    public virtual CommandCategory[] CommandCategories { get; } = Array.Empty<CommandCategory>();

    /// <summary>
    /// Whether this command should be hidden from help and listings. Useful for internal/debug commands.
    /// </summary>
    public virtual bool IsHidden { get; } = false;

    /// <summary>
    /// Rate limit cooldown in seconds. If set to 0, no rate limiting is applied.
    /// </summary>
    public virtual int RateLimitCooldownSeconds { get; } = 0;

    public abstract SlashCommandBuilder BuildSlashCommand();

    public abstract Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services);
    public abstract Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services);

    /// <summary>
    /// Checks if the user has required permissions to execute this command.
    /// </summary>
    /// <param name="guildUser">The guild user attempting to execute the command.</param>
    /// <returns>Tuple of (hasPermission, missingPermission). If hasPermission is true, missingPermission is null.</returns>
    public virtual (bool HasPermission, GuildPermission? MissingPermission) CheckPermissions(SocketGuildUser? guildUser)
    {
        if (guildUser == null)
            return (false, null);

        // Check primary required permission
        if (RequiredPermission.HasValue && !guildUser.GuildPermissions.Has(RequiredPermission.Value))
        {
            return (false, RequiredPermission.Value);
        }

        // Check additional required permissions
        foreach (var permission in AdditionalRequiredPermissions)
        {
            if (!guildUser.GuildPermissions.Has(permission))
            {
                return (false, permission);
            }
        }

        return (true, null);
    }

    /// <summary>
    /// Checks if command belongs to specified category.
    /// </summary>
    public virtual bool BelongsToCategory(CommandCategory category)
    {
        return Category == category || CommandCategories.Contains(category);
    }
}
