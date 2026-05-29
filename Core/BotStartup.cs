using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Services;
using Microsoft.Extensions.Configuration;
using Serilog;

namespace KaorukoBot;

public partial class Bot
{
    public async Task StartAsync()
    {
        ulong.TryParse(_configuration["Discord:OwnerId"], NumberStyles.None, CultureInfo.InvariantCulture, out _ownerId);
        ulong.TryParse(_configuration["Discord:ClientId"], NumberStyles.None, CultureInfo.InvariantCulture, out _clientId);
        _prefix = _configuration["Prefix"] ?? ".";

        var colors = _configuration.GetSection("Colors").Get<Dictionary<string, string>>();
        if (colors != null)
            Components.Embeds.ConfigureColors(colors);

        var webhookUrl = _configuration["Logging:WebhookUrl"];
        var forwardWarnings = bool.Parse(_configuration["Logging:WebhookWarnings"] ?? "true");
        var forwardErrors = bool.Parse(_configuration["Logging:WebhookErrors"] ?? "true");
        _logger.Configure(webhookUrl, forwardWarnings, forwardErrors);

        var healthPort = _configuration.GetValue<int>("HealthCheck:Port", 1400);
        StartHealthServer(healthPort);

        _client.Ready += OnReadyAsync;
        _client.Log += LoggingService.LogDiscordEventAsync;
        _client.InteractionCreated += OnInteractionCreatedAsync;
        _client.MessageReceived += OnMessageReceivedAsync;
        _client.SlashCommandExecuted += OnSlashCommandExecutedAsync;

        await _logger.InitializeAsync();

        var token = _configuration["Discord:Token"] ?? "";
        if (string.IsNullOrEmpty(token))
        {
            LoggingService.Error("No Discord token provided. Set Discord:Token in appsettings.json");
            return;
        }

        await _client.LoginAsync(TokenType.Bot, token);
        await _client.StartAsync();

        AppDomain.CurrentDomain.ProcessExit += async (s, e) => await OnShutdownAsync();
        Console.CancelKeyPress += async (s, e) =>
        {
            e.Cancel = true;
            await OnShutdownAsync();
        };
    }

    private async Task OnReadyAsync()
    {
        _startTime = DateTime.UtcNow;
        await _commandRegistry.RegisterSlashCommandsAsync(_client);
        LoggingService.Success($"Bot is ready! Logged in as {_client.CurrentUser.Username}");

        var guildCount = _client.Guilds.Count;
        var userCount = _client.Guilds.Sum(g => g.MemberCount);

        LoggingService.Success($"Serving {guildCount} guilds and {userCount} users");

        UpdateStatus();
        _statusTimer = new Timer(_ => UpdateStatus(), null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(15));

        _randomTriggerTimer = new Timer(async _ =>
        {
            foreach (var guild in _client.Guilds)
            {
                await HandleRandomTriggersAsync(guild.Id);
            }
        }, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));

        LoggingService.Success("Bot initialized successfully!");
    }

    private async Task OnShutdownAsync()
    {
        LoggingService.Info("Shutting down bot...");
        _statusTimer?.Dispose();
        _randomTriggerTimer?.Dispose();

        await _client.StopAsync();
        _client.Dispose();

        Log.CloseAndFlush();
    }
}
