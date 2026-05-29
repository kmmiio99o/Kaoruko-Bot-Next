using System.Text.Json;
using Jint;
using Jint.Runtime;
using Serilog;

namespace KaorukoBot.Services.ScriptEngine.Implementations;

public class JavaScriptScriptEngine : ScriptEngineBase
{
    public override ScriptLanguage SupportedLanguage => ScriptLanguage.JavaScript;

    public JavaScriptScriptEngine(ILogger? logger = null) : base(logger) { }

    public override async Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs)
    {
        _logger.Debug("Executing JavaScript with timeout {TimeoutMs}ms", timeoutMs);

        try
        {
            var cts = new CancellationTokenSource((int)timeoutMs);
            var startMemory = GC.GetTotalMemory(false);
            var sw = System.Diagnostics.Stopwatch.StartNew();

            var output = new List<string>();

            var engine = new Engine(options =>
            {
                options.LimitRecursion(64);
                options.MaxStatements(50000);
                options.TimeoutInterval(TimeSpan.FromMilliseconds(timeoutMs));
                options.CancellationToken(cts.Token);
            });

            engine.SetValue("user", context.User);
            engine.SetValue("guild", context.Guild);
            engine.SetValue("channel", context.Channel);
            engine.SetValue("member", context.Author);
            engine.SetValue("message", context.MessageContent);
            engine.SetValue("args", context.Arguments);

            engine.SetValue("respond", new Action<string>(msg =>
            {
                output.Add(msg);
                context.ResponseCallback?.Invoke(msg);
            }));

            engine.Execute(script);

            sw.Stop();
            var endMemory = GC.GetTotalMemory(false);
            var memoryUsed = Math.Max(0, endMemory - startMemory);

            var result = string.Join("\n", output);
            result = TruncateOutput(result);

            return ExecutionResult.CreateSuccess(result, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.JavaScript);
        }
        catch (RecursionDepthOverflowException)
        {
            _logger.Warning("JavaScript script exceeded recursion limit");
            return ExecutionResult.CreateFailure("Script exceeded recursion limit", 0, 0, ScriptLanguage.JavaScript);
        }
        catch (ExecutionCanceledException)
        {
            _logger.Warning("JavaScript script execution timed out after {TimeoutMs}ms", timeoutMs);
            return ExecutionResult.CreateTimeout(timeoutMs, ScriptLanguage.JavaScript);
        }
        catch (JavaScriptException ex)
        {
            _logger.Error(ex, "JavaScript runtime error");
            var line = ex.Location.Start.Line;
            return ExecutionResult.CreateFailure(
                $"Line {line}: {ex.Message}", 0, 0, ScriptLanguage.JavaScript);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "JavaScript execution failed");
            return ExecutionResult.CreateFailure(ex.Message, 0, 0, ScriptLanguage.JavaScript);
        }
    }

    public override async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script)
    {
        try
        {
            var engine = new Engine(options =>
            {
                options.LimitRecursion(8);
                options.MaxStatements(10);
            });

            engine.Execute(script);
            return (true, null);
        }
        catch (JavaScriptException ex)
        {
            var line = ex.Location.Start.Line;
            return (false, $"Line {line}: {ex.Message}");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
