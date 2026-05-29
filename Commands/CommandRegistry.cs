using System.Collections.Concurrent;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Models;
using Serilog;

namespace KaorukoBot.Commands;

public class CommandRegistry
{
    private readonly ConcurrentDictionary<string, BotCommand> _commands = new();
    private readonly List<(CommandCategory Category, string Name, string Description)> _helpIndex = [];
    private readonly ILogger _logger;

    public CommandRegistry(ILogger? logger = null)
    {
        _logger = logger ?? Log.ForContext(GetType());
    }

    public void Register(BotCommand command)
    {
        _commands[command.Name.ToLowerInvariant()] = command;
        if (!command.IsHidden)
        {
            _helpIndex.Add((command.Category, command.Name, command.Description));
        }
    }

    public BotCommand? GetCommand(string name) =>
        _commands.TryGetValue(name.ToLowerInvariant(), out var cmd) ? cmd : null;

    /// <summary>
    /// Gets help index excluding hidden commands.
    /// </summary>
    public IReadOnlyList<(CommandCategory Category, string Name, string Description)> HelpIndex => _helpIndex;

    /// <summary>
    /// Gets all commands optionally filtered by category.
    /// </summary>
    public IEnumerable<BotCommand> GetCommandsByCategory(CommandCategory? category = null)
    {
        return category.HasValue
            ? _commands.Values.Where(c => c.BelongsToCategory(category.Value))
            : _commands.Values;
    }

    /// <summary>
    /// Gets all commands that are not hidden.
    /// </summary>
    public IEnumerable<BotCommand> GetVisibleCommands()
    {
        return _commands.Values.Where(c => !c.IsHidden);
    }

    public async Task RegisterSlashCommandsAsync(DiscordSocketClient client)
    {
        var builders = _commands.Values
            .Where(c => !c.IsHidden) // Don't register hidden commands as slash commands
            .Select(c => c.BuildSlashCommand())
            .ToList();
        await client.BulkOverwriteGlobalApplicationCommandsAsync(builders.Select(b => b.Build()).ToArray());
        _logger.Information("Registered {CommandCount} slash commands", builders.Count);
    }

    /// <summary>
    /// Handles slash command execution with permission checking.
    /// </summary>
    public async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var cmd = GetCommand(command.Data.Name);
        if (cmd == null)
        {
            _logger.Warning("Slash command not found: {CommandName}", command.Data.Name);
            return;
        }

        // Check permissions
        var (hasPermission, missingPermission) = cmd.CheckPermissions(context.GuildUser);
        if (!hasPermission)
        {
            _logger.Warning("User {User} lacks permission {Permission} for command {Command}",
                context.User.Id, missingPermission, cmd.Name);
            await command.RespondAsync(
                $"❌ You don't have the required permission: `{missingPermission}`",
                ephemeral: true);
            return;
        }

        try
        {
            await cmd.HandleSlashAsync(command, context, services);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error executing slash command {Command}", cmd.Name);
            try
            {
                await command.RespondAsync(
                    "❌ An error occurred while executing this command.",
                    ephemeral: true);
            }
            catch
            {
                // Command response already sent or expired
            }
        }
    }

    /// <summary>
    /// Handles prefix command execution with permission checking.
    /// </summary>
    public async Task HandlePrefixAsync(string commandName, SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        var cmd = GetCommand(commandName);
        if (cmd == null)
            return;

        // Check permissions for guild commands
        if (guild != null && message.Author is SocketGuildUser guildUser)
        {
            var (hasPermission, missingPermission) = cmd.CheckPermissions(guildUser);
            if (!hasPermission)
            {
                _logger.Warning("User {User} lacks permission {Permission} for command {Command}",
                    message.Author.Id, missingPermission, cmd.Name);
                await message.Channel.SendMessageAsync(
                    $"❌ You don't have the required permission: `{missingPermission}`");
                return;
            }
        }

        try
        {
            await cmd.HandlePrefixAsync(message, args, guild, services);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error executing prefix command {Command}", cmd.Name);
            try
            {
                await message.Channel.SendMessageAsync(
                    "❌ An error occurred while executing this command.");
            }
            catch
            {
                // Channel may be inaccessible
            }
        }
    }
}
