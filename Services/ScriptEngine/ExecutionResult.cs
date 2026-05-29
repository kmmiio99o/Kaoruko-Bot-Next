namespace KaorukoBot.Services.ScriptEngine;

/// <summary>
/// Represents the result of script execution with detailed information about output, errors, and performance metrics.
/// </summary>
public class ExecutionResult
{
    /// <summary>
    /// Indicates whether the script executed successfully without runtime errors.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The output produced by the script execution. Can be console output, return values, or logged data.
    /// </summary>
    public string Output { get; set; } = string.Empty;

    /// <summary>
    /// Error message if execution failed. Contains details about syntax, runtime, or timeout errors.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Execution time in milliseconds.
    /// </summary>
    public long ExecutionTimeMs { get; set; }

    /// <summary>
    /// Memory used during execution in bytes. May be approximate depending on the script engine.
    /// </summary>
    public long MemoryUsedBytes { get; set; }

    /// <summary>
    /// Whether the script execution exceeded the timeout limit.
    /// </summary>
    public bool TimedOut { get; set; }

    /// <summary>
    /// The script language that was executed.
    /// </summary>
    public ScriptLanguage Language { get; set; }

    /// <summary>
    /// Exit code or status code from the execution (language-dependent).
    /// </summary>
    public int? ExitCode { get; set; }

    /// <summary>
    /// Creates a successful execution result.
    /// </summary>
    public static ExecutionResult CreateSuccess(string output, long executionTimeMs, long memoryUsedBytes, ScriptLanguage language)
    {
        return new ExecutionResult
        {
            Success = true,
            Output = output,
            ExecutionTimeMs = executionTimeMs,
            MemoryUsedBytes = memoryUsedBytes,
            Language = language,
            TimedOut = false
        };
    }

    /// <summary>
    /// Creates a failed execution result.
    /// </summary>
    public static ExecutionResult CreateFailure(string errorMessage, long executionTimeMs, long memoryUsedBytes, ScriptLanguage language, int? exitCode = null)
    {
        return new ExecutionResult
        {
            Success = false,
            ErrorMessage = errorMessage,
            ExecutionTimeMs = executionTimeMs,
            MemoryUsedBytes = memoryUsedBytes,
            Language = language,
            ExitCode = exitCode,
            TimedOut = false
        };
    }

    /// <summary>
    /// Creates a timeout execution result.
    /// </summary>
    public static ExecutionResult CreateTimeout(long timeoutMs, ScriptLanguage language)
    {
        return new ExecutionResult
        {
            Success = false,
            ErrorMessage = $"Script execution exceeded timeout of {timeoutMs}ms",
            ExecutionTimeMs = timeoutMs,
            Language = language,
            TimedOut = true
        };
    }
}
