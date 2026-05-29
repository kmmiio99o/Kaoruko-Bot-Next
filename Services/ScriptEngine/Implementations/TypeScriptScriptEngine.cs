using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Serilog;

namespace KaorukoBot.Services.ScriptEngine.Implementations;

public class TypeScriptScriptEngine : ScriptEngineBase
{
    private const string TsNodeCommand = "npx";
    private static readonly string[] TsNodeArgs = ["ts-node", "--compiler-options", "{\"module\":\"commonjs\"}"];

    public override ScriptLanguage SupportedLanguage => ScriptLanguage.TypeScript;

    public TypeScriptScriptEngine(ILogger? logger = null) : base(logger) { }

    public override async Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs)
    {
        _logger.Debug("Executing TypeScript with timeout {TimeoutMs}ms", timeoutMs);

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

            var wrappedScript = @"
const __context = JSON.parse(process.env.SCRIPT_CONTEXT || '{}');
const user = __context.user;
const guild = __context.guild;
const channel = __context.channel;
const member = __context.member;
const message = __context.message;
const args = __context.args;
const output: string[] = [];
const respond = (msg: string) => { output.push(msg); };

" + script + @"

if (output.length > 0) console.log(output.join('\n'));
";

            tempFile = Path.Combine(Path.GetTempPath(), $"ts_script_{Guid.NewGuid()}.ts");
            await File.WriteAllTextAsync(tempFile, wrappedScript, cts.Token);

            var psi = new ProcessStartInfo
            {
                FileName = TsNodeCommand,
                Arguments = $"{string.Join(" ", TsNodeArgs)} \"{tempFile}\"",
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
                    error, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.TypeScript, process.ExitCode);
            }

            var result = string.IsNullOrEmpty(output) ? error : output;
            result = TruncateOutput(result);

            return ExecutionResult.CreateSuccess(result, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.TypeScript);
        }
        catch (OperationCanceledException)
        {
            _logger.Warning("TypeScript execution timed out after {TimeoutMs}ms", timeoutMs);
            return ExecutionResult.CreateTimeout(timeoutMs, ScriptLanguage.TypeScript);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "TypeScript execution failed");
            return ExecutionResult.CreateFailure(ex.Message, 0, 0, ScriptLanguage.TypeScript);
        }
        finally
        {
            if (!string.IsNullOrEmpty(tempFile))
            {
                try { File.Delete(tempFile); }
                catch { _logger.Warning("Failed to clean up temp TypeScript file {Path}", tempFile); }
            }
        }
    }

    public override async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script)
    {
        var tempFile = string.Empty;

        try
        {
            tempFile = Path.Combine(Path.GetTempPath(), $"ts_check_{Guid.NewGuid()}.ts");
            await File.WriteAllTextAsync(tempFile, script);

            var psi = new ProcessStartInfo
            {
                FileName = "npx",
                Arguments = $"tsc --noEmit --strict \"{tempFile}\"",
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
