using System.ComponentModel.DataAnnotations;
using KaorukoBot.Services.ScriptEngine;

namespace KaorukoBot.Models;

public enum CommandType
{
    Response,
    Embed,
    Code,
    Image,
    RandomImage,
    Welcome,
    Goodbye,
    AutoResponder
}

public enum TriggerType
{
    Exact,
    Contains,
    StartsWith,
    Regex,
    Slash,
    Event,
    Random
}

/// <summary>
/// Represents a custom command that can be created and configured by guild members.
/// Supports multiple execution types including scripting in various languages.
/// </summary>
public class CustomCommand
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    
    public string GuildId { get; set; } = string.Empty;
    
    public string Name { get; set; } = string.Empty;
    
    public CommandType Type { get; set; } = CommandType.Response;
    
    /// <summary>
    /// Main content or script for the command.
    /// Interpretation depends on CommandType and ScriptLanguage.
    /// </summary>
    public string Content { get; set; } = string.Empty;
    
    public TriggerType Trigger { get; set; } = TriggerType.Exact;
    
    public string? TriggerValue { get; set; }
    
    public int Cooldown { get; set; }
    
    public bool IsEnabled { get; set; } = true;
    
    public List<string> AllowedRoles { get; set; } = [];
    
    public List<string> BlockedRoles { get; set; } = [];
    
    public List<string> AllowedChannels { get; set; } = [];
    
    public List<string> BlockedChannels { get; set; } = [];
    
    public List<string> AllowedUsers { get; set; } = [];
    
    public List<string> BlockedUsers { get; set; } = [];
    
    public double? RandomChance { get; set; }
    
    public string? RandomChannelId { get; set; }
    
    /// <summary>
    /// Programming language for script execution.
    /// Only applicable when Type is Code.
    /// </summary>
    public ScriptLanguage? ScriptLanguage { get; set; }
    
    /// <summary>
    /// Maximum execution time in milliseconds for scripts.
    /// Default is 5000ms (5 seconds).
    /// </summary>
    public long ExecutionTimeoutMs { get; set; } = 5000;
    
    /// <summary>
    /// Roles allowed to execute this command.
    /// If empty, all roles can execute (subject to other restrictions).
    /// </summary>
    public List<string> ExecutorRoleIds { get; set; } = [];
    
    /// <summary>
    /// Users allowed to execute this command.
    /// If empty, all users can execute (subject to other restrictions).
    /// </summary>
    public List<string> ExecutorUserIds { get; set; } = [];
    
    /// <summary>
    /// Additional code snippets or modules that extend/modify existing commands.
    /// Allows composition of functionality.
    /// </summary>
    public List<CommandAddon> ModuleAddons { get; set; } = [];
    
    /// <summary>
    /// Alternative names that trigger this command.
    /// </summary>
    public List<string> Aliases { get; set; } = [];
    
    /// <summary>
    /// Tags for organizing and filtering custom commands.
    /// </summary>
    public List<string> Tags { get; set; } = [];
    
    public string? CreatedBy { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public string? LastEditor { get; set; }
    
    public DateTime? LastEditedAt { get; set; }

    /// <summary>
    /// Checks if a user has permission to execute this command.
    /// </summary>
    public bool CanExecute(string userId, List<string> userRoleIds)
    {
        // Check executor whitelist
        if (ExecutorUserIds.Count > 0 && !ExecutorUserIds.Contains(userId))
        {
            return false;
        }

        if (ExecutorRoleIds.Count > 0 && !userRoleIds.Any(r => ExecutorRoleIds.Contains(r)))
        {
            return false;
        }

        // Check allowed roles
        if (AllowedRoles.Count > 0 && !userRoleIds.Any(r => AllowedRoles.Contains(r)))
        {
            return false;
        }

        // Check blocked roles
        if (BlockedRoles.Any(r => userRoleIds.Contains(r)))
        {
            return false;
        }

        // Check allowed users
        if (AllowedUsers.Count > 0 && !AllowedUsers.Contains(userId))
        {
            return false;
        }

        // Check blocked users
        if (BlockedUsers.Contains(userId))
        {
            return false;
        }

        return true;
    }

    /// <summary>
    /// Checks if a channel is allowed for command execution.
    /// </summary>
    public bool CanExecuteInChannel(string channelId)
    {
        // Check allowed channels
        if (AllowedChannels.Count > 0 && !AllowedChannels.Contains(channelId))
        {
            return false;
        }

        // Check blocked channels
        if (BlockedChannels.Contains(channelId))
        {
            return false;
        }

        return true;
    }
}

/// <summary>
/// Addon module for extending or modifying command behavior.
/// </summary>
public class CommandAddon
{
    /// <summary>
    /// Unique identifier for the addon.
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    
    /// <summary>
    /// Name/description of the addon.
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// The addon code/module content.
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Programming language of the addon code.
    /// </summary>
    public ScriptLanguage Language { get; set; } = ScriptLanguage.CSharp;
    
    /// <summary>
    /// Whether this addon is enabled.
    /// </summary>
    public bool IsEnabled { get; set; } = true;
    
    /// <summary>
    /// Execution order (lower values execute first).
    /// </summary>
    public int ExecutionOrder { get; set; } = 0;
}
