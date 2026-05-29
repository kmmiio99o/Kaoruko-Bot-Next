using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Serilog;

namespace KaorukoBot.Services.ScriptEngine.Implementations;

public class PythonScriptEngine : ScriptEngineBase
{
    private const string PythonCommand = "python3";

    public override ScriptLanguage SupportedLanguage => ScriptLanguage.Python;

    public PythonScriptEngine(ILogger? logger = null) : base(logger) { }

    public override async Task<ExecutionResult> ExecuteAsync(
        string script,
        ScriptContext context,
        long timeoutMs = DefaultTimeoutMs)
    {
        _logger.Debug("Executing Python with timeout {TimeoutMs}ms", timeoutMs);

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
import os, json, sys

_context = json.loads(os.environ.get('SCRIPT_CONTEXT', '{{}}'))
user = _context.get('user', {{}})
guild = _context.get('guild')
channel = _context.get('channel')
member = _context.get('member')
message = _context.get('message', '')
args = _context.get('args', [])

_output = []
def respond(msg):
    _output.append(str(msg))

{script}

if _output:
    print('\n'.join(_output))
";

            tempFile = Path.Combine(Path.GetTempPath(), $"py_script_{Guid.NewGuid()}.py");
            await File.WriteAllTextAsync(tempFile, wrappedScript, cts.Token);

            var psi = new ProcessStartInfo
            {
                FileName = PythonCommand,
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
                    error, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.Python, process.ExitCode);
            }

            var result = string.IsNullOrEmpty(output) ? error : output;
            result = TruncateOutput(result);

            return ExecutionResult.CreateSuccess(result, sw.ElapsedMilliseconds, memoryUsed, ScriptLanguage.Python);
        }
        catch (OperationCanceledException)
        {
            _logger.Warning("Python execution timed out after {TimeoutMs}ms", timeoutMs);
            return ExecutionResult.CreateTimeout(timeoutMs, ScriptLanguage.Python);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Python execution failed");
            return ExecutionResult.CreateFailure(ex.Message, 0, 0, ScriptLanguage.Python);
        }
        finally
        {
            if (!string.IsNullOrEmpty(tempFile))
            {
                try { File.Delete(tempFile); }
                catch { _logger.Warning("Failed to clean up temp Python file {Path}", tempFile); }
            }
        }
    }

    public override async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(string script)
    {
        var tempFile = string.Empty;

        try
        {
            tempFile = Path.Combine(Path.GetTempPath(), $"py_check_{Guid.NewGuid()}.py");
            await File.WriteAllTextAsync(tempFile, script);

            var psi = new ProcessStartInfo
            {
                FileName = PythonCommand,
                Arguments = $"-m py_compile \"{tempFile}\"",
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
