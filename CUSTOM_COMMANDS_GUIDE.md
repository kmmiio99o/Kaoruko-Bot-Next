# Custom Commands & Script Engine Guide

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Script Languages](#supported-languages)
- [Examples by Language](#examples-by-language)
- [Execution Context](#execution-context)
- [Permission & Security](#permissions--security)
- [Advanced Features](#advanced-features)
- [Performance & Optimization](#performance--optimization)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Custom Commands system allows server administrators to create sophisticated commands using multiple programming languages. Each script runs in a sandboxed environment with:

- **5-second execution timeout** (configurable per command)
- **Memory limits** (4KB output truncation)
- **Role-based access control** (who can execute)
- **Multi-language support** (C#, TypeScript, Python, JavaScript, Kotlin)

### Why Multiple Languages?

Different tasks suit different languages:
- **C#** - Complex logic, type safety, access to bot internals
- **TypeScript** - Quick scripts with type checking
- **JavaScript** - Lightweight, no dependencies
- **Python** - Data processing, math operations
- **Kotlin** - Modern syntax, functional programming

---

## Getting Started

### Creating Your First Custom Command

```bash
# Using prefix command
.customcommand create --name "greet" --language javascript --timeout 3000

# Then provide your script:
console.log(`Hello ${user.name}! Welcome to ${guild.name}`);
return { success: true, output: "Greeting sent" };
```

### Basic Command Structure

Every script receives a **context** object with information about the execution:

```javascript
// JavaScript example
const { user, guild, channel, args, respond } = context;

// Your command logic here
await respond(`Hello ${user.name}`);

// Return result
return { success: true, message: "Done" };
```

---

## Supported Languages

### Language Comparison

| Language | Best For | Dependencies | Memory | Speed | Notes |
|----------|----------|--------------|--------|-------|-------|
| C# | Complex logic | .NET SDK | Medium | Fast | Full type safety, access to internals |
| TypeScript | Typed scripts | ts-node | Low | Medium | Compiles to JavaScript, type checking |
| JavaScript | Quick scripts | Jint or Node | Low | Fast | No setup needed, interpreter-based |
| Python | Data processing | Python 3.x | Medium | Medium | Good for math/stats, subprocess-based |
| Kotlin | Modern syntax | JVM | Medium | Fast | Runs on JVM, modern features |

### Environment Setup

**JavaScript** - Built-in, no setup needed
```bash
# No installation required
```

**TypeScript** - Requires Node.js
```bash
npm install -g ts-node typescript
```

**Python** - Requires Python 3.x
```bash
# Windows
python --version

# Linux/Mac
python3 --version
```

**C#** - Built-in with bot (requires Roslyn)
```xml
<!-- Already in KaorukoBot.csproj -->
<PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="4.7.0" />
```

**Kotlin** - Requires JVM
```bash
# Install Kotlin
sdk install kotlin  # or brew install kotlin
```

---

## Examples by Language

### JavaScript Examples

#### Example 1: Simple Greeting
```javascript
const { user, guild } = context;
const greeting = `Welcome ${user.name} to ${guild.name}!`;
return {
    success: true,
    output: greeting
};
```

#### Example 2: User Info Command
```javascript
const { user, guildMember, args } = context;

const info = {
    username: user.name,
    id: user.id,
    joined: guildMember.joinedAt,
    roles: guildMember.roles,
    status: "Online"
};

const response = Object.entries(info)
    .map(([key, value]) => `**${key}**: ${value}`)
    .join('\n');

return { success: true, output: response };
```

#### Example 3: Math Command
```javascript
const { args } = context;
const numbers = args.map(Number);

if (numbers.some(isNaN)) {
    return { success: false, error: "Invalid numbers provided" };
}

const sum = numbers.reduce((a, b) => a + b, 0);
const avg = sum / numbers.length;

return {
    success: true,
    output: `Sum: ${sum}, Average: ${avg}`
};
```

#### Example 4: Random Choice
```javascript
const { args } = context;

if (args.length < 2) {
    return { 
        success: false, 
        error: "Provide at least 2 options" 
    };
}

const choice = args[Math.floor(Math.random() * args.length)];
return { success: true, output: `I choose: **${choice}**` };
```

---

### TypeScript Examples

#### Example 1: Type-Safe User Lookup
```typescript
interface UserData {
    id: string;
    name: string;
    joinedAt: Date;
}

const { user, args }: { user: UserData; args: string[] } = context;

const userData: UserData = {
    id: user.id,
    name: user.name,
    joinedAt: new Date(user.joinedAt)
};

const message = `User: ${userData.name} (${userData.id})`;
return { success: true, output: message };
```

#### Example 2: Data Processing
```typescript
interface CommandArgs {
    values: number[];
    operation: 'sum' | 'avg' | 'max' | 'min';
}

const { args } = context;
const values: number[] = args.slice(0, -1).map(Number);
const operation = args[args.length - 1] as CommandArgs['operation'];

const calculate = {
    sum: (v: number[]) => v.reduce((a, b) => a + b, 0),
    avg: (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length,
    max: (v: number[]) => Math.max(...v),
    min: (v: number[]) => Math.min(...v)
};

const result = calculate[operation](values);
return { success: true, output: `${operation}: ${result}` };
```

---

### Python Examples

#### Example 1: Simple Statistics
```python
import statistics
from typing import List

args = context['args']
numbers = [float(x) for x in args]

if not numbers:
    return {'success': False, 'error': 'No numbers provided'}

stats = {
    'mean': statistics.mean(numbers),
    'median': statistics.median(numbers),
    'stdev': statistics.stdev(numbers) if len(numbers) > 1 else 0
}

output = '\n'.join(f"**{k}**: {v:.2f}" for k, v in stats.items())
return {'success': True, 'output': output}
```

#### Example 2: Text Processing
```python
import re
from collections import Counter

message = context['messageContent']

# Remove common words
stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'is'}
words = re.findall(r'\w+', message.lower())
filtered = [w for w in words if w not in stopwords]

# Count occurrences
counter = Counter(filtered)
top_5 = counter.most_common(5)

output = "Top words:\n" + "\n".join(f"{w}: {c}" for w, c in top_5)
return {'success': True, 'output': output}
```

#### Example 3: Random Weighted Choice
```python
import random

user = context['user']
choices_str = context['args']

# Parse weighted choices: "apple:30 banana:20 orange:50"
choices = {}
for choice in choices_str:
    if ':' in choice:
        name, weight = choice.split(':')
        choices[name] = int(weight)
    else:
        choices[choice] = 1

selected = random.choices(list(choices.keys()), weights=list(choices.values()), k=1)[0]
return {'success': True, 'output': f"{user['name']} selected: **{selected}**"}
```

---

### C# Examples

#### Example 1: Advanced String Manipulation
```csharp
var context = (ScriptContext)scriptContext;
var args = context.Arguments;

var result = string.Join(
    " | ",
    args.Select((arg, idx) => $"{idx + 1}. {arg.ToUpper()}")
);

return new { success = true, output = result };
```

#### Example 2: Guild Statistics
```csharp
var context = (ScriptContext)scriptContext;
var guild = context.GuildInfo;
var member = context.GuildMemberInfo;

var stats = $@"
**Guild**: {guild.Name}
**Members**: {guild.MemberCount}
**Roles**: {guild.RolesCount}
**Your Roles**: {string.Join(", ", member.Roles)}
**Joined**: {member.JoinedAt}
";

return new { success = true, output = stats };
```

---

### Kotlin Examples

#### Example 1: Functional Data Processing
```kotlin
val args = context["args"] as List<String>
val numbers = args.mapNotNull { it.toIntOrNull() }

if (numbers.isEmpty()) {
    return mapOf("success" to false, "error" to "No valid numbers")
}

val result = mapOf(
    "sum" to numbers.sum(),
    "average" to numbers.average(),
    "max" to numbers.maxOrNull(),
    "min" to numbers.minOrNull()
)

val output = result.entries.joinToString("\n") { (k, v) -> "**$k**: $v" }
return mapOf("success" to true, "output" to output)
```

---

## Execution Context

Every script receives a `context` object with the following structure:

### Context Properties

```typescript
interface ScriptContext {
    // User Information
    user: {
        id: string;
        name: string;
        discriminator: string;
        avatarUrl: string;
    };
    
    // Guild Information
    guild: {
        id: string;
        name: string;
        memberCount: number;
        rolesCount: number;
        ownerId: string;
    };
    
    // Channel Information
    channel: {
        id: string;
        name: string;
        topic: string | null;
    };
    
    // Guild Member Information
    guildMember: {
        nickname: string | null;
        joinedAt: string;  // ISO 8601 format
        roles: string[];
    };
    
    // Command Data
    messageContent: string;    // The original message
    arguments: string[];       // Parsed command arguments
    
    // Response Callback
    respond: (message: string) => Promise<void>;
}
```

### Using Context in Scripts

**JavaScript:**
```javascript
const { user, guild, args, respond } = context;
console.log(`User: ${user.name}, Guild: ${guild.name}`);
```

**Python:**
```python
user = context['user']
guild = context['guild']
print(f"User: {user['name']}, Guild: {guild['name']}")
```

**C#:**
```csharp
var context = (ScriptContext)scriptContext;
Console.WriteLine($"User: {context.UserInfo.Name}");
```

---

## Permissions & Security

### Role-Based Access Control

Commands can be restricted to specific roles:

```bash
# Only allow "Moderator" and "Admin" roles to use this command
.customcommand setpermission --name "warn" --roles "Moderator,Admin"
```

### User Whitelisting

Restrict command to specific users:

```bash
# Only specified users can use this
.customcommand setpermission --name "private" --users "123456789,987654321"
```

### Security Features

1. **Output Truncation**: Scripts can't return more than 4KB of data
2. **Timeout Protection**: Scripts automatically stop after 5 seconds
3. **No File System Access**: Scripts cannot access the disk
4. **No Network Access**: Scripts cannot make external requests
5. **Subprocess Isolation**: Languages run in isolated processes

### Best Practices

**DO:**
- ✅ Validate all user input
- ✅ Handle errors gracefully
- ✅ Use reasonable timeouts
- ✅ Return structured responses

**DON'T:**
- ❌ Store sensitive data in scripts
- ❌ Use infinite loops
- ❌ Make assumptions about input format
- ❌ Hardcode Discord IDs

---

## Advanced Features

### Command Aliases

Create multiple names for the same command:

```bash
.customcommand addalias --name "userinfo" --alias "who,whois,profile"
```

Now users can call: `.userinfo`, `.who`, `.whois`, or `.profile`

### Module Addons

Add functionality to existing commands without modifying them:

```javascript
// addon_logging.js - Logs when commands are used
addEventListener('commandExecuted', (event) => {
    console.log(`Command: ${event.commandName} by ${event.user.name}`);
});
```

### Response Templates

Define reusable response formats:

```bash
.customcommand template add --name "usercard" --content "
**User**: {user.name}
**ID**: {user.id}
**Guild**: {guild.name}
**Joined**: {guildMember.joinedAt}
"
```

Then use in scripts:
```javascript
return { 
    success: true, 
    template: "usercard"
};
```

---

## Performance & Optimization

### Memory Usage

Each script execution consumes:
- **Base**: ~500 bytes (context)
- **Output**: Up to 4KB
- **Total per execution**: ~5-10KB

For comparison:
- 1,000 concurrent commands: ~10MB
- 10,000 concurrent commands: ~100MB

### Execution Speed

| Language | Simple Math | String Processing | Complex Logic |
|----------|-------------|-------------------|----------------|
| JavaScript | 10ms | 15ms | 50ms |
| TypeScript | 50ms | 60ms | 150ms |
| Python | 80ms | 100ms | 200ms |
| C# | 5ms | 10ms | 30ms |
| Kotlin | 100ms | 120ms | 250ms |

### Optimization Tips

1. **Prefer JavaScript** for simple operations (fastest, lowest memory)
2. **Use TypeScript** when you need type safety
3. **Use C#** for complex logic (fastest, full power)
4. **Cache expensive computations** across invocations
5. **Limit output** to essentials (keep under 1KB)

### Caching

Scripts are automatically cached after first execution:

```csharp
// Roslyn compiles C# scripts once, then reuses
// ts-node caches transpilation results
// Python bytecode is cached
```

Clear cache if needed:
```bash
.customcommand clearcache
```

---

## Troubleshooting

### Script Times Out

**Problem**: Script takes too long and is killed

**Solution**:
- Reduce complexity
- Use faster language (JavaScript instead of Python)
- Pre-process data outside script

**Example Fix:**
```javascript
// SLOW - processes all members
const result = guild.members.filter(m => m.active);

// FAST - receives pre-filtered args
const result = args.filter(id => id);
```

### Output is Truncated

**Problem**: Script returns too much data (>4KB)

**Solution**:
- Summarize results
- Return only important fields
- Paginate if needed

**Example Fix:**
```javascript
// WRONG - returns everything
const members = guild.members.map(m => ({...m}));

// RIGHT - returns summary
const count = guild.members.length;
return { success: true, output: `Total members: ${count}` };
```

### Permission Denied

**Problem**: User can't execute command

**Solution**:
- Check role assignments
- Verify user whitelist
- Ask server admin to grant permissions

```bash
# Check permissions
.customcommand checkpermission --name "mycommand" --user @username
```

### Script Has Errors

**Problem**: Script crashes with error

**Solution**:
- Check for typos
- Verify context variables exist
- Add error handling

**Example Fix:**
```javascript
// WRONG - crashes if args is empty
const first = args[0].toUpperCase();

// RIGHT - handles missing args
const first = (args[0] || 'default').toUpperCase();
```

### Language Runtime Missing

**Problem**: `Python not found` or similar error

**Solution**:
- Install the required runtime
- Configure path in bot settings

```bash
# Install Python
python -m pip install --upgrade pip

# Verify installation
python --version
```

---

## FAQ

**Q: Can I access the database from a script?**
A: Not directly, but you can request data from the bot via the respond callback.

**Q: How often does the bot check for memory leaks?**
A: Every 5 seconds by default, adjustable in settings.

**Q: Can I modify other users?**
A: No, scripts only have read access to guild data.

**Q: What happens if my script has an infinite loop?**
A: It's automatically stopped after 5 seconds (timeout).

**Q: Can scripts be shared between servers?**
A: Yes, use the `export` feature to share command definitions.

**Q: How many custom commands can I create?**
A: Unlimited, limited only by database storage.

---

## Support & Resources

- **Issues**: [GitHub Issues](https://github.com/kmmiio99o/Kaoruko-Bot-Next/issues)
- **Discord**: [Support Server](https://discord.gg/cYZPfXcBGB)
- **Documentation**: [Scripting Guide](./SCRIPTING_GUIDE.md)
