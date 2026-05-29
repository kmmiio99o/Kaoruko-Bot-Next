# Implementation Guide: Multi-Language Script Engine & Memory Monitoring

## Overview

This guide explains how to integrate and use the newly added multi-language custom command system and memory monitoring features in Kaoruko Bot Next.

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [File Structure](#file-structure)
4. [Integration Steps](#integration-steps)
5. [Usage Examples](#usage-examples)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### What Was Added

```
Services/
├── ScriptEngine/                     # Multi-language execution
│   ├── ScriptLanguage.cs             # Enum of supported languages
│   ├── ScriptContext.cs              # Execution context
│   ├── ExecutionResult.cs            # Result wrapper
│   ├── ScriptEngineBase.cs           # Abstract base class
│   └── Implementations/              # 5 language engines
│       ├── CSharpScriptEngine.cs
│       ├── JavaScriptScriptEngine.cs
│       ├── TypeScriptScriptEngine.cs
│       ├── PythonScriptEngine.cs
│       └── KotlinScriptEngine.cs
└── HealthMonitoring/                 # Memory leak detection
    ├── MemoryMonitor.cs              # Memory tracking
    └── BotHealthService.cs           # Health orchestration
```

### Key Files Modified

1. **Commands/Base/BotCommand.cs**
   - Added `AdditionalRequiredPermissions[]` property
   - Added `CommandCategories[]` property
   - Added `IsHidden` property
   - Added `RateLimitCooldownSeconds` property
   - Added `CanExecuteAsync()` method

2. **Commands/CommandRegistry.cs**
   - Enhanced with permission checking
   - Added category filtering
   - Added hidden command support

3. **Models/CustomCommand.cs**
   - Added `ScriptLanguage?` property
   - Added `ExecutionTimeoutMs` property
   - Added `ExecutorRoleIds[]` property
   - Added `ExecutorUserIds[]` property
   - Added `ModuleAddons[]` property
   - Added `Aliases[]` property

---

## System Architecture

### Script Execution Flow

```
User Command
    ↓
CommandRegistry (permission check)
    ↓
CustomCommandService (fetch script)
    ↓
ScriptEngineFactory (select appropriate engine)
    ↓
ScriptEngine[Language] (compile & execute)
    ↓
ExecutionResult (success/error)
    ↓
Response sent to Discord
```

### Memory Monitoring Flow

```
BotHealthService (background task)
    ↓
Every 5 seconds:
├── MemoryMonitor.TakeSnapshot()
├── Check against thresholds
├── Detect growth patterns
└── Trigger events if needed
    ├── OnMemoryWarning (> 500MB)
    ├── OnMemoryCritical (> 800MB → graceful restart)
    └── OnHealthCheck (status report)
```

---

## File Structure

### Script Engine Architecture

#### 1. ScriptLanguage.cs
```csharp
public enum ScriptLanguage
{
    CSharp,
    JavaScript,
    TypeScript,
    Python,
    Kotlin
}
```

#### 2. ScriptContext.cs
Provides execution context to scripts:
- User info (ID, name, avatar)
- Guild info (ID, name, member count)
- Channel info
- Message content and arguments
- Response callback function

#### 3. ExecutionResult.cs
Wraps script execution results:
```csharp
public class ExecutionResult
{
    public bool Success { get; set; }
    public string Output { get; set; }  // max 4KB
    public string? ErrorMessage { get; set; }
    public int ExecutionTimeMs { get; set; }
    public bool TimedOut { get; set; }
    public ScriptLanguage Language { get; set; }
}
```

#### 4. ScriptEngineBase.cs
Abstract base for all engines:
```csharp
public abstract class ScriptEngineBase
{
    public abstract ScriptLanguage SupportedLanguage { get; }
    public abstract Task<ExecutionResult> ExecuteAsync(
        string script, 
        ScriptContext context, 
        int timeoutMs = 5000);
    public abstract Task<bool> ValidateAsync(string script);
}
```

#### 5. Language Implementations

Each implements `ScriptEngineBase`:

- **CSharpScriptEngine**: Uses Roslyn for C# compilation
- **JavaScriptScriptEngine**: Uses Jint or Node.js subprocess
- **TypeScriptScriptEngine**: Uses ts-node subprocess
- **PythonScriptEngine**: Uses Python subprocess
- **KotlinScriptEngine**: Uses Kotlin subprocess

### Health Monitoring Architecture

#### 1. MemoryMonitor.cs
```csharp
public class MemoryMonitor
{
    // Records memory snapshots
    private ConcurrentQueue<MemorySnapshot> _history;
    
    public async Task CheckAsync();
    public MemoryStatus GetCurrentStatus();
    public List<MemoryTrend> GetTrends(int samples);
}
```

#### 2. BotHealthService.cs
```csharp
public class BotHealthService
{
    public event Action<long>? OnMemoryWarning;
    public event Action<long>? OnMemoryCritical;
    
    public async Task StartMonitoringAsync();
    public async Task<HealthStatus> GetHealthStatusAsync();
}
```

---

## Integration Steps

### Step 1: Add NuGet Dependencies

```bash
dotnet add package Microsoft.CodeAnalysis.CSharp  # For C# engine
dotnet add package Jint                            # For JavaScript
# Python, TypeScript, Kotlin use subprocess (no NuGet needed)
```

### Step 2: Register Services in DI Container

In `Program.cs` or extension method:

```csharp
services.AddSingleton<MemoryMonitor>();
services.AddSingleton<BotHealthService>();
services.AddSingleton<ScriptEngineFactory>();
services.AddSingleton<CSharpScriptEngine>();
services.AddSingleton<JavaScriptScriptEngine>();
services.AddSingleton<TypeScriptScriptEngine>();
services.AddSingleton<PythonScriptEngine>();
services.AddSingleton<KotlinScriptEngine>();
```

### Step 3: Initialize Health Monitoring in Bot Startup

```csharp
var healthService = _services.GetRequiredService<BotHealthService>();
await healthService.StartMonitoringAsync();
```

### Step 4: Hook Up Permission Checking in CommandRegistry

```csharp
public async Task HandlePrefixAsync(string commandName, SocketUserMessage message, 
    string[] args, SocketGuild? guild, IServiceProvider services)
{
    var cmd = GetCommand(commandName);
    if (cmd == null) return;
    
    // Check permissions
    if (!await cmd.CanExecuteAsync(message.Author, guild, services))
    {
        await message.ReplyAsync("You don't have permission to use this command.");
        return;
    }
    
    // Execute
    await cmd.HandlePrefixAsync(message, args, guild, services);
}
```

### Step 5: Integrate Custom Script Execution

In `CustomCommandService`:

```csharp
public async Task<ExecutionResult> ExecuteScriptAsync(
    CustomCommand cmd, ScriptContext context, IServiceProvider services)
{
    if (cmd.ScriptLanguage == null)
        throw new InvalidOperationException("Script language not set");
    
    var factory = services.GetRequiredService<ScriptEngineFactory>();
    var engine = factory.GetEngine(cmd.ScriptLanguage.Value);
    
    var timeout = cmd.ExecutionTimeoutMs ?? 5000;
    return await engine.ExecuteAsync(cmd.ScriptContent, context, timeout);
}
```

---

## Usage Examples

### Example 1: Creating a Custom JavaScript Command

```bash
# Create the command
.customcommand create --name "greet" --language javascript

# Set permissions to Admin role only
.customcommand setpermission --name "greet" --roles "Admin"
```

User provides script:
```javascript
const { user, guild } = context;
return {
    success: true,
    output: `Hello ${user.name}! Welcome to ${guild.name}!`
};
```

### Example 2: Custom C# Command with Complex Logic

```csharp
var context = (ScriptContext)scriptContext;
var args = context.Arguments;

if (args.Length == 0)
    return new { success = false, error = "Please provide arguments" };

var result = args
    .Select((arg, idx) => $"{idx + 1}. {arg}")
    .ToList();

return new { 
    success = true, 
    output = string.Join("\n", result) 
};
```

### Example 3: Monitoring Memory in Your Service

```csharp
public class MyService
{
    private readonly BotHealthService _health;
    
    public MyService(BotHealthService health)
    {
        _health = health;
        _health.OnMemoryWarning += (usage) => 
            Console.WriteLine($"⚠️  Memory warning: {usage}MB");
        _health.OnMemoryCritical += (usage) => 
            Console.WriteLine($"🔴 Critical memory! Restarting...");
    }
}
```

---

## Troubleshooting

### Script Engine Not Found

**Error**: `Could not find script engine for language X`

**Solution**:
1. Verify the language enum value matches
2. Ensure the engine is registered in DI container
3. Check that required runtime is installed (Python, Node.js, etc.)

### Permission Check Failing

**Error**: `User doesn't have permission to execute X`

**Solution**:
1. Check role IDs match exactly
2. Verify user has the required role in Discord
3. Check CustomCommand permissions configuration

### Memory Monitor Not Triggering

**Error**: Memory alerts not firing despite high usage

**Solution**:
1. Verify BotHealthService.StartMonitoringAsync() was called
2. Check thresholds in configuration
3. Verify event handlers are subscribed correctly
4. Check logs for health check errors

### Timeout on Script Execution

**Error**: Script execution times out frequently

**Solution**:
1. Optimize script logic (reduce complexity)
2. Increase timeout in CustomCommand.ExecutionTimeoutMs
3. Use faster language (C# or JavaScript instead of Python)
4. Pre-compute expensive operations

---

## Completed: Language Engines

All 5 script engine implementations are now complete:

| Engine | Approach | Status |
|---|---|---|
| **C#** | Roslyn `CSharpScript` with SHA256 caching | ✅ Done |
| **JavaScript** | Jint 4.x embedded interpreter | ✅ Done |
| **TypeScript** | `ts-node` subprocess with temp files | ✅ Done |
| **Python** | `python3` subprocess with env var context | ✅ Done |
| **Kotlin** | `kotlin` CLI subprocess with `.kts` files | ✅ Done |

### Future Enhancements (Consider)

- **Cooldown tracking** — per-user rate limiting in `BotCommand.cs`
- **Command-specific logging** — per-command log levels/channels
- **Usage analytics** — track execution counts, popular commands
- **Graceful restart** — auto-restart on critical memory threshold
- **Health check reporting** — send health status to Discord channel
- **External monitoring** — integrate with Prometheus/Grafana

---

## Configuration

Add to `appsettings.json`:

```json
{
  "ScriptEngine": {
    "DefaultTimeoutMs": 5000,
    "MaxOutputBytes": 4096,
    "CacheSizeLimit": 104857600,
    "EnableCaching": true
  },
  "HealthMonitoring": {
    "CheckIntervalSeconds": 5,
    "MemoryWarningThresholdMb": 500,
    "MemoryCriticalThresholdMb": 800,
    "HistorySize": 100
  }
}
```

---

## API Reference

### ScriptEngineFactory

```csharp
public interface IScriptEngineFactory
{
    ScriptEngineBase GetEngine(ScriptLanguage language);
    IEnumerable<ScriptLanguage> GetSupportedLanguages();
}
```

### MemoryMonitor

```csharp
public class MemoryMonitor
{
    public Task CheckAsync();
    public MemoryStatus GetCurrentStatus();
    public List<MemoryTrend> GetTrends(int sampleCount);
    public void ClearHistory();
}
```

### BotHealthService

```csharp
public class BotHealthService
{
    public event Action<long>? OnMemoryWarning;
    public event Action<long>? OnMemoryCritical;
    public event Func<HealthCheckArgs, Task>? OnHealthCheck;
    
    public async Task StartMonitoringAsync();
    public async Task StopMonitoringAsync();
    public async Task<HealthStatus> GetHealthStatusAsync();
}
```

---

## Performance Considerations

### Memory Overhead Per Script Execution

- Context: ~500 bytes
- Output (4KB max): 4,096 bytes
- Engine overhead: Language-dependent
  - C#: ~1-5MB (compiled assembly)
  - JavaScript: ~200KB (Jint instance)
  - Python: ~5-10MB (subprocess)
  - TypeScript: ~10MB (ts-node)
  - Kotlin: ~50MB (JVM)

### Optimization Tips

1. **Reuse engines**: Don't create new instances per execution
2. **Cache compiled scripts**: Use ScriptEngineBase.PrecompileAsync()
3. **Limit output**: Keep under 1KB when possible
4. **Choose language wisely**: JavaScript/C# for performance
5. **Monitor health**: Adjust thresholds based on your bot's typical usage

---

## Support

For issues or questions:
- Check [CUSTOM_COMMANDS_GUIDE.md](./CUSTOM_COMMANDS_GUIDE.md)
- Review [SCRIPTING_GUIDE.md](./SCRIPTING_GUIDE.md)
- Open [GitHub Issues](https://github.com/kmmiio99o/Kaoruko-Bot-Next/issues)
- Join [Discord Support Server](https://discord.gg/cYZPfXcBGB)
