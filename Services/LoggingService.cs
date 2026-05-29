using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using Discord;
using Discord.WebSocket;
using Newtonsoft.Json;
using Serilog;
using Serilog.Events;

namespace KaorukoBot.Services;

public class LoggingService
{
    private readonly DiscordSocketClient _client;
    private string? _webhookUrl;
    private bool _forwardWarnings = true;
    private bool _forwardErrors = true;

    public LoggingService(DiscordSocketClient client)
    {
        _client = client;
        ConfigureSerilog();
    }

    private static void ConfigureSerilog()
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss}] [{Level:u3}] {Message:lj}{NewLine}{Exception}",
                restrictedToMinimumLevel: LogEventLevel.Verbose,
                formatProvider: CultureInfo.InvariantCulture)
            .CreateLogger();
    }

    public void Configure(string? webhookUrl, bool forwardWarnings, bool forwardErrors)
    {
        _webhookUrl = webhookUrl;
        _forwardWarnings = forwardWarnings;
        _forwardErrors = forwardErrors;
    }

    public async Task InitializeAsync()
    {
        _client.Log += LogDiscordEventAsync;
    }

    public static Task LogDiscordEventAsync(LogMessage msg)
    {
        var level = msg.Severity switch
        {
            LogSeverity.Critical => LogEventLevel.Fatal,
            LogSeverity.Error => LogEventLevel.Error,
            LogSeverity.Warning => LogEventLevel.Warning,
            LogSeverity.Info => LogEventLevel.Information,
            LogSeverity.Verbose => LogEventLevel.Verbose,
            LogSeverity.Debug => LogEventLevel.Debug,
            _ => LogEventLevel.Information
        };

        Log.Write(level, msg.Exception, "[{Source}] {Message}", msg.Source, msg.Message);
        return Task.CompletedTask;
    }

    public static void Info(string message) => Log.Information(message);
    public static void Warn(string message) => Log.Warning(message);
    public static void Error(string message) => Log.Error(message);
    public static void Success(string message) => Log.Information("[SUCCESS] {Message}", message);
    public static void Debug(string message) => Log.Debug(message);

    public static async Task LogCommandUsageAsync(
        string commandName,
        ulong userId,
        string userTag,
        ulong? guildId,
        string? guildName,
        ulong? channelId,
        bool success,
        string? error = null)
    {
        var status = success ? "SUCCESS" : "FAILED";
        var errorInfo = error != null ? $" | Error: {error}" : "";
        Log.Information("[CMD:{Status}] /{CommandName} by {UserTag} ({UserId}) in G:{GuildId}{ErrorInfo}",
            status, commandName, userTag, userId, guildId?.ToString(CultureInfo.InvariantCulture) ?? "DM", errorInfo);
    }

    public async Task LogErrorToWebhookAsync(string errorType, string message, string? stackTrace,
        ulong? userId, string? commandName)
    {
        if (string.IsNullOrEmpty(_webhookUrl) || !_forwardErrors)
            return;

        try
        {
            var embed = new EmbedBuilder()
                .WithTitle("Bot Error")
                .WithColor(Color.Red)
                .AddField("Type", errorType, true)
                .AddField("Message", message.Length > 1024 ? message[..1024] : message)
                .WithTimestamp(DateTimeOffset.UtcNow);

            if (userId.HasValue)
                embed.AddField("User", userId.Value.ToString(CultureInfo.InvariantCulture), true);

            if (commandName != null)
                embed.AddField("Command", commandName, true);

            if (stackTrace != null)
                embed.AddField("Stack Trace", $"```{stackTrace[..Math.Min(stackTrace.Length, 1000)]}```");

            await SendWebhookAsync(_webhookUrl, "Bot Error Logger", embed.Build());
        }
        catch (Exception ex)
        {
            Log.Warning("Failed to send error webhook: {Ex}", ex.Message);
        }
    }

    public async Task LogWarningToWebhookAsync(string warningType, string message,
        ulong? userId = null, string? commandName = null)
    {
        if (string.IsNullOrEmpty(_webhookUrl) || !_forwardWarnings)
            return;

        try
        {
            var embed = new EmbedBuilder()
                .WithTitle("Bot Warning")
                .WithColor(Color.Orange)
                .AddField("Type", warningType, true)
                .AddField("Message", message.Length > 1024 ? message[..1024] : message)
                .WithTimestamp(DateTimeOffset.UtcNow);

            if (userId.HasValue)
                embed.AddField("User", userId.Value.ToString(CultureInfo.InvariantCulture), true);

            if (commandName != null)
                embed.AddField("Command", commandName, true);

            await SendWebhookAsync(_webhookUrl, "Bot Warning Logger", embed.Build());
        }
        catch (Exception ex)
        {
            Log.Warning("Failed to send warning webhook: {Ex}", ex.Message);
        }
    }

    private static async Task SendWebhookAsync(string webhookUrl, string username, Embed embed)
    {
        using var client = new HttpClient();
        var payload = new
        {
            username,
            embeds = new[]
            {
                new
                {
                    title = embed.Title,
                    description = embed.Description,
                    color = embed.Color?.RawValue,
                    timestamp = embed.Timestamp?.ToString("o"),
                    fields = embed.Fields.Length > 0 ? embed.Fields.Select(f => new
                    {
                        name = f.Name,
                        value = f.Value,
                        inline = f.Inline
                    }).ToArray() : null
                }
            }
        };

        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        var response = await client.PostAsync(webhookUrl, content);
        response.EnsureSuccessStatusCode();
    }
}
