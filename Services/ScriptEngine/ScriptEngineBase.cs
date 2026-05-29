using Serilog;

namespace KaorukoBot.Services.ScriptEngine;

/// <summary>
/// Abstract base class for all script engine implementations.
/// Provides common functionality for script execution with timeout handling, caching, and memory management.
/// Each implementation should optimize for minimal RAM usage through compilation caching and cleanup.
/// </summary>
public abstract class ScriptEngineBase
{
    /// <summary>
    /// Default timeout for script execution in milliseconds.
    /// </summary>
    protected const long DefaultTimeoutMs = 5000; // 5 seconds

    /// <summary>
    /// Maximum output length to capture from script execution (to prevent unbounded memory growth).
    /// </summary>
    protected const int MaxOutputLength = 4096; // 4 KB

    /// <summary>
    /// Logger for diagnostics and warnings.
    /// </summary>
    protected readonly ILogger _logger;

    /// <summary>
    /// Supported script language for this engine.
    /// </summary>
    public abstract ScriptLanguage SupportedLanguage { get; }

    protected ScriptEngineBase(ILogger? logger = null)
    {
        _logger = logger ?? Log.ForContext(GetType());
    }

    /// <summary>
    /// Executes a script with the provided context and timeout handling.
    /// </summary>
    /// <param name="script">The script source code to execute.</param>
    /// <param name="context">Execution context with user, guild, and argument information.</param>
    /// <param name="timeoutMs">Maximum execution time in milliseconds. Default is 5000ms.</param>
    /// <returns>Execution result with output, errors, and performance metrics.</returns>
    public abstract Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs);

    /// <summary>
    /// Validates script syntax before execution.
    /// </summary>
    /// <param name="script">The script source code to validate.</param>
    /// <returns>Tuple of (isValid, errorMessage). If isValid is true, errorMessage is null.</returns>
    public abstract Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script);

    /// <summary>
    /// Precompiles and caches scripts for faster execution on repeated calls.
    /// Implementation is optional but recommended for performance-critical engines like C#.
    /// </summary>
    /// <param name="scriptId">Unique identifier for caching the compiled script.</param>
    /// <param name="script">The script source code to precompile.</param>
    /// <returns>True if successfully cached, false otherwise.</returns>
    public virtual Task<bool> PrecompileAsync(string scriptId, string script)
    {
        _logger.Warning("PrecompileAsync not implemented for {Language}", SupportedLanguage);
        return Task.FromResult(false);
    }

    /// <summary>
    /// Clears compiled script cache to free memory.
    /// Implementation is optional but recommended for engines that cache compilation results.
    /// </summary>
    public virtual Task ClearCacheAsync()
    {
        _logger.Debug("ClearCacheAsync not implemented for {Language}", SupportedLanguage);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Gets current cache statistics for monitoring memory usage.
    /// </summary>
    /// <returns>Dictionary of cache statistics (cache entries count, memory usage, etc.)</returns>
    public virtual Task<Dictionary<string, object>> GetCacheStatsAsync()
    {
        return Task.FromResult(new Dictionary<string, object>
        {
            { "Supported", false },
            { "Message", "Cache statistics not available for this engine" }
        });
    }

    /// <summary>
    /// Truncates output to prevent unbounded memory growth.
    /// </summary>
    protected string TruncateOutput(string output)
    {
        if (output.Length > MaxOutputLength)
        {
            return output.Substring(0, MaxOutputLength - 20) + "\n... [truncated]";
        }
        return output;
    }

    /// <summary>
    /// Gets approximate memory usage of the engine (for health monitoring).
    /// Should be as fast as possible to avoid overhead.
    /// </summary>
    /// <returns>Memory usage in bytes.</returns>
    public virtual long GetApproximateMemoryUsage()
    {
        return GC.GetTotalMemory(false);
    }
}
