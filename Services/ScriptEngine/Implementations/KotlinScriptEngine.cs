using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Serilog;

namespace KaorukoBot.Services.ScriptEngine.Implementations;

public class KotlinScriptEngine : ScriptEngineBase
{
    private const string KotlinCommand = "kotlin";

    public override ScriptLanguage SupportedLanguage => ScriptLanguage.Kotlin;

    public KotlinScriptEngine(ILogger? logger = null) : base(logger) { }

    public override async Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs)
    {
        _logger.Debug("Executing Kotlin script with timeout {TimeoutMs}ms", timeoutMs);

        var tempFile = string.Empty;

        try
        {
            var cts = new CancellationTokenSource((int)timeoutMs);
            var startMemory = GC.GetTotalMemory(false);
            var sw = System.Diagnostics.Stopwatch.StartNew();

            var contextJson = JsonSerializer.Serialize(new
            {
                user = context.User,
                guild = context.Guild,
                channel = context.Channel,
                member = context.Author,
                message = context.MessageContent,
                args = context.Arguments
            });

            var wrappedScript = $@"
import kotlinx.serialization.*
import kotlinx.serialization.json.*

val contextJson = System.getenv(""SCRIPT_CONTEXT"") ?: ""{{}}""
// Context is parsed from environment variable
// Variables available: user, guild, channel, member, message, args, respond

val _output = mutableListOf<String>()
fun respond(msg: String) {{ _output.add(msg) }}

{script}

if (_output.isNotEmpty()) println(_output.joinToString(""\n""))
";

            tempFile = Path.Combine(Path.GetTempPath(), $"kt_script_{Guid.NewGuid()}.kts");
            await File.WriteAllTextAsync(tempFile, wrappedScript, cts.Token);

            var psi = new ProcessStartInfo
            {
                FileName = KotlinCommand,
                Arguments = $"\"{tempFile}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            psi.EnvironmentVariables["SCRIPT_CONTEXT"] = contextJson;

            using var process = new Process { StartInfo = psi };
            process.Start();

            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync(cts.Token);

            sw.Stop();
            var endMemory = GC.GetTotalMemory(false);
            var memoryUsed = Math.Max(0, endMemory - startMemory);

            var output = (await outputTask).Trim();
            var error = (await errorTask).Trim();

            if (process.ExitCode != 0 && string.IsNullOrEmpty(output))
            {
                return ExecutionResult.CreateFailure(
                    error, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.Kotlin, process.ExitCode);
            }

            var result = string.IsNullOrEmpty(output) ? error : output;
            result = TruncateOutput(result);

            return ExecutionResult.CreateSuccess(result, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.Kotlin);
        }
        catch (OperationCanceledException)
        {
            _logger.Warning("Kotlin execution timed out after {TimeoutMs}ms", timeoutMs);
            return ExecutionResult.CreateTimeout(timeoutMs, ScriptLanguage.Kotlin);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Kotlin execution failed");
            return ExecutionResult.CreateFailure(ex.Message, 0, 0, ScriptLanguage.Kotlin);
        }
        finally
        {
            if (!string.IsNullOrEmpty(tempFile))
            {
                try { File.Delete(tempFile); }
                catch { _logger.Warning("Failed to clean up temp Kotlin file {Path}", tempFile); }
            }
        }
    }

    public override async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script)
    {
        var tempFile = string.Empty;

        try
        {
            tempFile = Path.Combine(Path.GetTempPath(), $"kt_check_{Guid.NewGuid()}.kts");
            await File.WriteAllTextAsync(tempFile, script);

            var psi = new ProcessStartInfo
            {
                FileName = "kotlinc",
                Arguments = $"-no-stdlib -nowarn \"{tempFile}\"",
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = psi };
            process.Start();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                return (false, error.Trim());
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
        finally
        {
            if (!string.IsNullOrEmpty(tempFile))
            {
                try { File.Delete(tempFile); }
                catch { }
            }
        }
    }
}
