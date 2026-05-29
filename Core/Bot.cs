using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Admin;
using KaorukoBot.Commands.Info;
using KaorukoBot.Commands.Fun;
using KaorukoBot.Commands.Moderation;
using KaorukoBot.Commands.Tickets;
using KaorukoBot.Commands.Utility;
using KaorukoBot.Components;
using KaorukoBot.Extensions;
using KaorukoBot.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot;

public partial class Bot : IDisposable
{
    private readonly DiscordSocketClient _client;
    private readonly IServiceProvider _services;
    private readonly IConfiguration _configuration;
    private readonly LoggingService _logger;
    private readonly DatabaseService _database;
    private readonly PollService _pollService;
    private readonly CustomCommandService _customCommandService;
    private readonly TicketService _ticketService;
    private readonly CommandRegistry _commandRegistry;

    private ulong _ownerId;
    private ulong _clientId;
    private string _prefix = ".";
    private DateTime _startTime;
    private Timer? _statusTimer;
    private Timer? _randomTriggerTimer;

    public Bot(IConfiguration configuration)
    {
        _configuration = configuration;

        var socketConfig = new DiscordSocketConfig
        {
            GatewayIntents = GatewayIntents.Guilds |
                             GatewayIntents.GuildMembers |
                             GatewayIntents.GuildMessages |
                             GatewayIntents.MessageContent |
                             GatewayIntents.GuildMessageReactions,
            LogGatewayIntentWarnings = false,
            AlwaysDownloadUsers = true
        };

        _client = new DiscordSocketClient(socketConfig);

        _services = ConfigureServices();
        _commandRegistry = new CommandRegistry();
        _commandRegistry.Register(new ConfigCommand());
        _commandRegistry.Register(new CustomCommandCommand());
        _commandRegistry.Register(new TicketCategoryCommand());
        _commandRegistry.Register(new BanCommand());
        _commandRegistry.Register(new KickCommand());
        _commandRegistry.Register(new TimeoutCommand());
        _commandRegistry.Register(new PingCommand());
        _commandRegistry.Register(new AvatarCommand());
        _commandRegistry.Register(new UserInfoCommand());
        _commandRegistry.Register(new ServerInfoCommand());
        _commandRegistry.Register(new InviteCommand());
        _commandRegistry.Register(new PollCommand());
        _commandRegistry.Register(new EndPollCommand());
        _commandRegistry.Register(new EightBallCommand());
        _commandRegistry.Register(new HugCommand());
        _commandRegistry.Register(new SlapCommand());
        _commandRegistry.Register(new ShipCommand());
        _commandRegistry.Register(new HowGayCommand());
        _commandRegistry.Register(new HelpCommand());
        _commandRegistry.Register(new TicketPanelCommand());
        _logger = _services.GetRequiredService<LoggingService>();
        _database = _services.GetRequiredService<DatabaseService>();
        _pollService = _services.GetRequiredService<PollService>();
        _customCommandService = _services.GetRequiredService<CustomCommandService>();
        _ticketService = _services.GetRequiredService<TicketService>();
    }

    private ServiceProvider ConfigureServices()
    {
        var dbPath = Path.Combine(AppContext.BaseDirectory, _configuration["Database:Path"] ?? "kaoruko.db");
        var dbConnectionString = $"Data Source={dbPath}";
        return new ServiceCollection()
            .AddSingleton(_client)
            .AddSingleton(_configuration)
            .AddBotServices(dbConnectionString)
            .BuildServiceProvider();
    }

    public void Dispose()
    {
        _statusTimer?.Dispose();
        _randomTriggerTimer?.Dispose();
        _client.Dispose();
        GC.SuppressFinalize(this);
    }
}
