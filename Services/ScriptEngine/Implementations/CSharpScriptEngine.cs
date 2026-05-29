using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;
using Serilog;

namespace KaorukoBot.Services.ScriptEngine.Implementations;

public class CSharpScriptEngine : ScriptEngineBase
{
    private readonly ConcurrentDictionary<string, Script<object>> _compiledCache = new();
    private const long MaxCacheSizeBytes = 100L * 1024 * 1024;
    private long _cacheSizeBytes;

    public override ScriptLanguage SupportedLanguage => ScriptLanguage.CSharp;

    public CSharpScriptEngine(ILogger? logger = null) : base(logger) { }

    public override async Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs)
    {
        _logger.Debug("Executing C# script with timeout {TimeoutMs}ms", timeoutMs);

        try
        {
            var cts = new CancellationTokenSource((int)timeoutMs);
            var startMemory = GC.GetTotalMemory(false);
            var sw = System.Diagnostics.Stopwatch.StartNew();

            var scriptHash = ComputeHash(script);
            var compiled = _compiledCache.GetOrAdd(scriptHash, _ =>
            {
                var options = ScriptOptions.Default
                .WithImports("System", "System.Linq", "System.Collections.Generic", "System.Threading.Tasks")
                .WithReferences(typeof(ScriptGlobals).Assembly)
                .WithOptimizationLevel(Microsoft.CodeAnalysis.OptimizationLevel.Release);

            return CSharpScript.Create(script, options, typeof(ScriptGlobals));
        });

        var globals = new ScriptGlobals
        {
            User = context.User,
            Guild = context.Guild,
            Channel = context.Channel,
            Member = context.Author,
            Message = context.MessageContent,
            Args = context.Arguments,
            Respond = context.ResponseCallback ?? (_ => Task.CompletedTask)
        };

            var consoleCapture = new System.IO.StringWriter();
            var originalOut = Console.Out;
            Console.SetOut(consoleCapture);

            try
            {
                var state = await compiled.RunAsync(globals, cts.Token);
                var returnValue = state.ReturnValue?.ToString() ?? string.Empty;
                var consoleOut = consoleCapture.ToString();

                var output = string.IsNullOrEmpty(consoleOut) ? returnValue : consoleOut + returnValue;
                output = TruncateOutput(output);

                sw.Stop();
                var endMemory = GC.GetTotalMemory(false);
                var memoryUsed = Math.Max(0, endMemory - startMemory);

                return ExecutionResult.CreateSuccess(output, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.CSharp);
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
        catch (CompilationErrorException ex)
        {
            _logger.Error(ex, "C# script compilation failed");
            var errors = string.Join("\n", ex.Diagnostics);
            return ExecutionResult.CreateFailure(errors, 0, 0, ScriptLanguage.CSharp);
        }
        catch (OperationCanceledException)
        {
            _logger.Warning("C# script execution timed out after {TimeoutMs}ms", timeoutMs);
            return ExecutionResult.CreateTimeout(timeoutMs, ScriptLanguage.CSharp);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "C# script execution failed");
            return ExecutionResult.CreateFailure(ex.Message, 0, 0, ScriptLanguage.CSharp);
        }
    }

    public override async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script)
    {
        try
        {
            var options = ScriptOptions.Default
                .WithImports("System", "System.Linq", "System.Collections.Generic", "System.Threading.Tasks")
                .WithReferences(typeof(ScriptGlobals).Assembly);

            var compiled = CSharpScript.Create(script, options, typeof(ScriptGlobals));
            var diagnostics = compiled.Compile();

            var errors = diagnostics.Where(d => d.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Error).ToList();
            if (errors.Count > 0)
            {
                var message = string.Join("\n", errors.Select(e => e.GetMessage()));
                return await Task.FromResult((false, message));
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    public override async Task<bool> PrecompileAsync(string scriptId, string script)
    {
        _logger.Debug("Precompiling C# script {ScriptId}", scriptId);

        try
        {
            if (_cacheSizeBytes >= MaxCacheSizeBytes)
            {
                _logger.Warning("C# script cache full ({Size}MB), clearing", _cacheSizeBytes / (1024 * 1024));
                await ClearCacheAsync();
            }

            var hash = ComputeHash(script);
            if (_compiledCache.ContainsKey(hash))
                return true;

            var options = ScriptOptions.Default
                .WithImports("System", "System.Linq", "System.Collections.Generic", "System.Threading.Tasks")
                .WithReferences(typeof(ScriptGlobals).Assembly);

            var compiled = CSharpScript.Create(script, options, typeof(ScriptGlobals));
            compiled.Compile();

            _compiledCache[hash] = compiled;
            _cacheSizeBytes += Encoding.UTF8.GetByteCount(script);

            return true;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to precompile C# script {ScriptId}", scriptId);
            return false;
        }
    }

    public override async Task ClearCacheAsync()
    {
        _logger.Information("Clearing C# script cache ({EntryCount} entries)", _compiledCache.Count);
        _compiledCache.Clear();
        _cacheSizeBytes = 0;
        await Task.CompletedTask;
    }

    public override async Task<Dictionary<string, object>> GetCacheStatsAsync()
    {
        return await Task.FromResult(new Dictionary<string, object>
        {
            { "Engine", "CSharp" },
            { "CachedScripts", _compiledCache.Count },
            { "CacheSizeBytes", _cacheSizeBytes },
            { "MaxCacheSizeBytes", MaxCacheSizeBytes },
            { "Supported", true },
            { "Features", s_features }
        });
    }

    private static readonly string[] s_features = ["Compilation caching", "Full type safety", "Intellisense compatible"];

    private static string ComputeHash(string script)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(script));
        return Convert.ToHexStringLower(bytes);
    }
}

public class ScriptGlobals
{
    public UserInfo? User { get; set; }
    public GuildInfo? Guild { get; set; }
    public ChannelInfo? Channel { get; set; }
    public GuildMemberInfo? Member { get; set; }
    public string Message { get; set; } = string.Empty;
    public string[] Args { get; set; } = [];
    public Func<string, Task>? Respond { get; set; }
}
