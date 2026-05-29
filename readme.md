<div align="center">
  <img src="https://cdn.kmmiio99o.dev/kaoruko/logo.png" alt="Kaoruko Bot" width="120" />
  <br/>
  <h1>Kaoruko Bot Next</h1>
</div>

> A modular Discord bot built with C# and .NET 10.0 using Discord.Net

[![GitHub Repository](https://img.shields.io/badge/GitHub-kmmiio99o%2FKaoruko--Bot--Next-181717?style=for-the-badge&logo=github)](https://github.com/kmmiio99o/Kaoruko-Bot-Next)
[![.NET Version](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![Discord.Net](https://img.shields.io/badge/Discord.Net-3.19.1-5865F2?style=for-the-badge&logo=discord)](https://discordnet.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A comprehensive Discord bot offering moderation tools, ticket support system, entertainment features, and extensive configuration options. Built with modern C# practices and designed to be easily extended with new commands and features.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Command Categories](#command-categories)
- [Custom Commands & Script Engine](#custom-commands--script-engine)
- [Memory Monitoring & Health Checks](#memory-monitoring--health-checks)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Kaoruko Bot Next is a self-hosted Discord bot written in C# using the Discord.Net library and .NET 10.0 framework. It connects to Discord via a bot token, loads modular commands, and provides services for tickets, custom commands, polls, and guild management through a lightweight SQLite database.

**Technology Stack**

| Technology | Purpose |
|------------|---------|
| C# 13.0 | Language |
| .NET 10.0 | Framework |
| Discord.Net 3.19.1 | Discord API |
| SQLite + EF Core | Database |
| Serilog | Structured logging |
| Dependency Injection | Service management |

---

## Key Features

### Core Capabilities
- Modular command architecture supporting easy extension
- Dual prefix and slash command support
- Guild-specific configuration stored in SQLite database
- Comprehensive logging with Serilog

### Command System
- Admin commands for bot configuration
- Moderation tools (ban, kick, timeout, warn)
- Information commands (user info, server info, avatar)
- Fun entertainment commands (8ball, polls)
- Ticket system for support workflows
- Utility commands for common tasks

### Services
- **Ticket Service**: Full-featured ticket management with categories and workflows
- **Poll Service**: Interactive polls with reactions and result tracking
- **Custom Command Service**: Create and manage custom text commands per server
- **Guild Settings Service**: Per-server configuration persistence
- **Logging Service**: Structured logging with console and optional webhooks
- **Script Engine**: Multi-language custom command execution (C#, TypeScript, Python, JavaScript, Kotlin)
- **Memory Monitor**: Automatic detection and response to memory leaks
- **Bot Health Service**: Comprehensive health monitoring and alerts

### Features
- Auto status updates on configurable intervals
- Random trigger responses
- Event-based handlers for guild events
- Health monitoring and startup validation
- **Multi-language custom commands** with sandboxed execution
- **Memory leak detection** with automatic graceful restarts
- **Role and permission-based command access**
- **Guild-specific and category-based command filtering**

---

## Quick Start

### Prerequisites
- .NET 10.0 SDK or later
- Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/kmmiio99o/Kaoruko-Bot-Next.git
   cd Kaoruko-Bot-Next
   ```

2. **Restore Dependencies**
   ```bash
   dotnet restore
   ```

3. **Configure Your Bot**
   Copy `appsettings.example.json` to `appsettings.json` and fill in required values:
   ```json
   {
     "Discord": {
       "Token": "your_bot_token_here",
       "Prefix": ".",
       "OwnerId": "your_user_id",
       "ClientId": "your_client_id"
     },
     "Database": {
       "Path": "kaoruko.db"
     }
   }
   ```

4. **Build and Run**
   ```bash
   dotnet build
   dotnet run
   ```

---

## Configuration

Configuration is managed through `appsettings.json` and environment-specific overrides via `appsettings.Development.json`.

### Configuration Options

| Setting | Description |
|:--------|:------------|
| `Discord:Token` | Bot token for Discord authentication **(never commit this)** |
| `Discord:Prefix` | Command prefix (default: `.`) |
| `Discord:OwnerId` | Your Discord user ID for owner commands |
| `Discord:ClientId` | Bot application ID from Developer Portal |
| `Database:Path` | SQLite database file path (default: `kaoruko.db`) |

### Token Loading

The bot loads configuration from:
1. `appsettings.json` (default settings)
2. `appsettings.{ASPNETCORE_ENVIRONMENT}.json` (environment overrides)
3. Environment variables (highest priority)

---

## Architecture

Multi-layered architecture with modular commands, services, data layer, and sandboxed script execution.  
See [**SCRIPTING_GUIDE.md**](./SCRIPTING_GUIDE.md) for detailed architecture diagrams and design patterns.

### Project Structure

```
Kaoruko-Bot-Next/
├── Core/
│   ├── Bot.cs                    # Main bot class and initialization
│   ├── BotStartup.cs             # Startup sequence
│   ├── BotEvents.cs              # Discord event handlers
│   ├── BotHealth.cs              # Health monitoring
│   └── BotTimers.cs              # Timer-based operations
├── Commands/
│   ├── Base/                     # Base command classes
│   ├── Admin/                    # Administration commands
│   ├── Moderation/               # Moderation commands
│   ├── Tickets/                  # Ticket system commands
│   ├── Info/                     # Information commands
│   ├── Fun/                      # Entertainment commands
│   ├── Utility/                  # Utility commands
│   └── CommandRegistry.cs        # Command discovery and registration
├── Services/
│   ├── DatabaseService.cs        # Database operations
│   ├── LoggingService.cs         # Serilog configuration
│   ├── TicketService.cs          # Ticket management logic
│   ├── TicketConfigService.cs    # Ticket configuration
│   ├── PollService.cs            # Poll management
│   ├── CustomCommandService.cs   # Custom command handling
│   └── GuildSettingsService.cs   # Guild configuration
├── Data/
│   └── AppDbContext.cs           # EF Core database context
├── Models/                       # Data models and DTOs
├── Extensions/                   # Extension methods
├── Components/                   # Reusable UI components
├── Interactions/                 # Discord interactions
├── Attributes/                   # Custom attributes
├── Resources/                    # Static resources
├── Builders/                     # Object builders
├── Program.cs                    # Entry point
├── KaorukoBot.csproj            # Project file
└── appsettings.json             # Configuration
```

### Core Components

| Component | Responsibility |
|:----------|:---------------|
| `Bot.cs` | Central orchestrator, client lifecycle, event wiring |
| `CommandRegistry.cs` | Discovers and dispatches commands |
| `DatabaseService.cs` | SQLite operations via EF Core |
| `TicketService.cs` | Ticket creation, management, and workflows |
| `PollService.cs` | Poll creation and reaction handling |
| `LoggingService.cs` | Structured logging with Serilog |
| `GuildSettingsService.cs` | Per-guild configuration persistence |

### Startup Flow

```
Program.cs
├── Load Configuration (appsettings.json + environment)
├── Setup Database (EnsureCreated)
├── Configure Logging (Serilog)
├── Build Dependency Injection Container
└── Initialize Bot
    ├── Create Discord Client
    ├── Register Command Handlers
    ├── Setup Event Listeners
    ├── Initialize Services
    └── Connect to Discord Gateway
```

---

## Command Categories

### Admin Commands
Manage bot configuration and settings for your server.
- Bot configuration and prefix management
- Settings backup and restore

### Moderation Commands
Tools for community management and user enforcement.
- `/ban` - Permanently remove users
- `/kick` - Remove users from server
- `/timeout` - Restrict user interactions
- `/warn` - Issue warnings to users

### Ticket Commands
Create and manage support tickets.
- `/ticket create` - Open a new support ticket
- `/ticket claim` - Assign ticket to yourself
- `/ticket close` - Resolve and close a ticket
- Ticket category management

### Information Commands
Retrieve useful information about users and servers.
- `/userinfo` - Display user profile information
- `/serverinfo` - Show server statistics
- `/avatar` - Get high-resolution user avatar
- `/ping` - Check bot latency

### Fun Commands
Entertainment and interactive features.
- `/8ball` - Magic 8-ball responses
- `/poll` - Create interactive polls
- `/customcommand` - Create custom text commands

### Utility Commands
General purpose utility tools.
- Configuration queries
- Status checks
- Help and documentation

---

## Custom Commands & Script Engine

Create custom commands using multiple programming languages. Scripts run in sandboxed environments with built-in timeout, memory limits, and permission controls.

### Supported Languages

| Language | Engine | Best For | Setup |
|----------|--------|----------|-------|
| JavaScript | Jint (embedded) | Quick scripts, no deps | Built-in |
| C# | Roslyn (embedded) | Complex logic, type safety | Built-in |
| TypeScript | ts-node subprocess | Type-safe scripts | Node.js required |
| Python | python3 subprocess | Data processing, math | Python 3.x required |
| Kotlin | kotlin subprocess | Modern syntax, functional | JVM required |

### Quick Examples

```javascript
// JavaScript — globals injected directly
respond("Hello " + user.name + "!");
if (args.length > 0) respond("You said: " + args[0]);
```

```csharp
// C# — strongly-typed globals
respond($"Hello {user.Name}!");
var sum = args.Select(int.Parse).Sum();
respond($"Sum: {sum}");
```

### How It Works

Each script receives the same set of global variables:

| Variable | Description |
|---|---|
| `user` | Executor info (id, name, discriminator, avatarUrl) |
| `guild` | Server info (id, name, memberCount) |
| `channel` | Channel info (id, name, topic) |
| `member` | Member info (nickname, joinedAt, roles) |
| `message` | Raw message text |
| `args` | Parsed arguments array |
| `respond(text)` | Send a response to the channel |

### Features

- **Sandboxed**: Timeout (5s default), output limit (4KB), recursion guard
- **Cached**: C# scripts compiled and cached by hash (100MB cap)
- **Controlled**: Role/user whitelists, channel restrictions, permission checks
- **Extensible**: Module addon system for composing functionality

### Full Documentation

See [**CUSTOM_COMMANDS_GUIDE.md**](./CUSTOM_COMMANDS_GUIDE.md) for setup, permissions, and management.  
See [**SCRIPTING_GUIDE.md**](./SCRIPTING_GUIDE.md) for architecture details and language tutorials.

---

## Memory Monitoring & Health Checks

The bot includes sophisticated memory monitoring to detect and respond to memory leaks automatically.

### Features

- **Real-time Memory Tracking**: Monitors memory usage every 5 seconds
- **Growth Pattern Detection**: Identifies memory leak patterns
- **Threshold Alerts**: 
  - Warning: 500MB (logs warning)
  - Critical: 800MB (logs critical alert)
- **Automatic Graceful Restart**: Initiates safe restart if critical threshold reached
- **Event System**: Integrates with monitoring/alerting systems
- **Low Overhead**: Health checks take only 1-2ms per cycle

### Configuration

Add to `appsettings.json`:

```json
{
  "HealthMonitoring": {
    "CheckIntervalSeconds": 5,
    "MemoryWarningThresholdMb": 500,
    "MemoryCriticalThresholdMb": 800,
    "HistorySize": 100
  }
}
```

### How It Works

```
BotHealthService
├── MemoryMonitor (runs every 5 seconds)
│   ├── Takes memory snapshot
│   ├── Maintains history (last 100 snapshots)
│   ├── Calculates growth trends
│   └── Triggers alerts if thresholds exceeded
└── Event System
    ├── OnMemoryWarning (logs warning)
    ├── OnMemoryCritical (logs alert + prepares restart)
    └── OnHealthCheck (status report)
```

### Usage in Code

```csharp
// Inject health service
public MyService(BotHealthService healthService)
{
    _healthService = healthService;
}

// Get current health status
var status = await _healthService.GetHealthStatusAsync();
Console.WriteLine($"Memory: {status.MemoryUsageMb}MB");

// Subscribe to alerts
_healthService.OnMemoryWarning += (usage) => 
    Console.WriteLine($"Warning: {usage}MB");

_healthService.OnMemoryCritical += (usage) => 
    Console.WriteLine($"Critical: {usage}MB - Restarting...");
```

## Development

### Building the Project
```bash
dotnet build
```

### Running in Development
```bash
dotnet run
```

The bot reads from `appsettings.Development.json` when `ASPNETCORE_ENVIRONMENT=Development`.

### Adding a New Command

1. Create a new class in the appropriate `Commands/` subfolder
2. Inherit from the base command class
3. Implement required methods for command handling
4. The `CommandRegistry` will auto-discover and register it

### Adding a New Service

1. Create a service class in the `Services/` folder
2. Register it in the dependency injection container in `Program.cs`
3. Inject it where needed via constructor dependency injection

### Database Migrations

The database is initialized automatically on startup via EF Core:
```csharp
initContext.Database.EnsureCreated();
```

To modify the schema, update the `AppDbContext` class and the database will be updated on next startup.

---

## Contributing

### Guidelines
- Follow C# naming conventions and code style
- Use dependency injection for service dependencies
- Write descriptive commit messages
- Update documentation when adding features
- Test commands in a development server before submitting PR

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/description`)
3. Make changes and test thoroughly
4. Commit with clear messages (`git commit -m "feat: description"`)
5. Push to your branch
6. Open a Pull Request describing the changes

### Security
- Never commit bot tokens or sensitive credentials
- Use `.gitignore` to exclude `appsettings.json` and database files
- Always use environment variables for production secrets

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Need Help?**
- Discord Support Server: [https://discord.gg/cYZPfXcBGB](https://discord.gg/cYZPfXcBGB)
- Issue Tracker: [GitHub Issues](https://github.com/kmmiio99o/Kaoruko-Bot-Next/issues)
