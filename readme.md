# 🎭 Kaoruko Bot Next

**A modern, feature-rich Discord bot built with TypeScript, Bun, and discord.js**

Kaoruko Bot Next is a comprehensive Discord bot offering advanced moderation tools, a complete ticket support system, entertainment features, and extensive configuration options. Built with modern technologies and best practices for optimal performance and reliability.

## ✨ Key Features

### 🚀 Modern Technology Stack
- **Bun Runtime**: Ultra-fast JavaScript runtime with built-in bundler and package manager
- **TypeScript**: Full type safety and modern JavaScript features
- **discord.js v14**: Latest Discord API implementation
- **MongoDB + Mongoose**: Robust database integration with schema validation
- **Hot Reload**: Development mode with automatic restarts on file changes

### 🎫 Advanced Ticket System
- **Multi-Category Support**: Customizable ticket categories with different settings
- **Interactive Panels**: Beautiful embed panels with category buttons
- **Automated Workflows**: Auto-assignment, claiming, and escalation
- **Transcript Generation**: Complete conversation history preservation
- **Permission Management**: Role-based access control
- **Auto-moderation**: Configurable auto-close and cleanup policies

### ⚙️ Comprehensive Configuration
- **Web Dashboard**: Built-in dashboard for easy management (coming soon)
- **Database-driven Settings**: Per-guild configuration with export/import
- **Command-based Setup**: Complete configuration through Discord commands
- **Auto-moderation**: Spam detection, invite filtering, profanity filter
- **Role Management**: Flexible permission system with multiple role types

### 🛠️ Dual Command System
- **Slash Commands**: Modern Discord interactions with autocomplete
- **Prefix Commands**: Traditional command support for flexibility
- **Hybrid Support**: Commands can work with both interaction types

## 📦 Installation & Setup

### Prerequisites
- **Bun**: Install from [bun.sh](https://bun.sh)
- **MongoDB**: Database server (local or cloud)
- **Discord Bot**: Create at [Discord Developer Portal](https://discord.com/developers/applications)

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-repo/kaoruko-bot-next.git
   cd kaoruko-bot-next
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Environment Configuration**
   Create a `.env` file:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   OWNER_ID=your_discord_user_id_here
   MONGODB_URI=mongodb://localhost:27017/kaoruko
   PREFIX=!
   WEB_PORT=3000
   WEBHOOK_URL=your_discord_webhook_url_for_logging
   ```

4. **Build and Start**
   ```bash
   # Development mode (with hot reload)
   bun run dev
   
   # Production mode
   bun run build
   bun start
   ```

## 🎛️ Configuration Guide

### Initial Bot Setup

1. **Invite the Bot**
   - Use the Discord Developer Portal to generate an invite link
   - Required permissions: Administrator (for full functionality)

2. **Configure Server Settings**
   ```
   /config general prefix prefix:!
   /config general channels welcome:#welcome goodbye:#goodbye modlog:#mod-logs
   /config general logging commands:true errors:true events:true
   ```

3. **Setup Ticket System**
   ```
   /config tickets quick-setup category:Support Tickets logs:#ticket-logs support-role:@Support Team
   /ticketpanel channel:#support
   ```

### Advanced Configuration

#### Auto-Moderation Setup
```
/config moderation automod enabled:true delete-invites:true delete-spam:true profanity-filter:true max-warnings:3 spam-threshold:5
```

#### Role Management
```
/config moderation roles type:admin action:add role:@Administrators
/config moderation roles type:mod action:add role:@Moderators
```

#### Ticket Categories
```
/ticketconfig category action:add name:"Technical Support" description:"For technical issues" emoji:🔧 color:#FF6B35
/ticketconfig category action:add name:"Billing Support" description:"For payment questions" emoji:💰 color:#4CAF50
```

## 📋 Command Categories

### 🔧 Administration (`/config`)
- **General Settings**: Prefix, channels, logging configuration
- **Moderation Setup**: Auto-moderation, roles, permissions
- **Ticket Configuration**: Complete ticket system management
- **Export/Import**: Backup and restore configurations

### 🎫 Ticket Management
- **`/ticketpanel`**: Create interactive ticket creation panel
- **`/ticketconfig`**: Advanced ticket system configuration
- **`/ticket`**: Individual ticket management commands

### 🛡️ Moderation
- **`/ban`**: Permanently remove users with reason logging
- **`/kick`**: Remove users temporarily with moderation logs
- **`/timeout`**: Restrict user interactions for specified duration
- **`/warn`**: Issue warnings with automated action thresholds

### ℹ️ Information & Utility
- **`/help`**: Interactive help system with command search
- **`/serverinfo`**: Detailed server statistics and information
- **`/userinfo`**: Comprehensive user profile display
- **`/avatar`**: High-resolution avatar retrieval
- **`/ping`**: Bot latency and performance metrics

### 🎪 Entertainment
- **`/8ball`**: Magic 8-ball responses to questions
- **`/poll`**: Interactive polls with multiple options
- **`/endpoll`**: Manually close polls with results

## 🏗️ Project Structure

```
kaoruko-bot-next/
├── src/
│   ├── commands/           # Command implementations
│   │   ├── admin/          # Administrative commands
│   │   ├── tickets/        # Ticket system commands
│   │   ├── info/           # Information commands
│   │   ├── moderation/     # Moderation tools
│   │   ├── utility/        # Utility commands
│   │   └── fun/            # Entertainment commands
│   ├── handlers/           # Core system handlers
│   │   ├── commandHandler.ts
│   │   ├── eventHandler.ts
│   │   └── ticketInteractionHandler.ts
│   ├── services/           # Business logic services
│   │   ├── TicketService.ts
│   │   ├── DatabaseService.ts
│   │   └── WebServer.ts
│   ├── models/             # Database schemas
│   │   ├── GuildSettings.ts
│   │   ├── Ticket.ts
│   │   ├── TicketConfig.ts
│   │   ├── Poll.ts
│   │   └── CustomCommand.ts
│   ├── events/             # Discord event handlers
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript definitions
│   └── config/             # Configuration files
├── scripts/                # Build and development scripts
├── public/                 # Web dashboard assets (future)
├── package.json           # Bun package configuration
├── bunfig.toml           # Bun runtime configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 🎨 Ticket System Features

### 🎯 Categories & Customization
- **Multiple Categories**: General, Technical, Billing, Reports, etc.
- **Custom Styling**: Unique colors, emojis, and descriptions
- **Role Requirements**: Restrict categories to specific roles
- **Auto-assignment**: Automatically assign tickets to team members

### 🔧 Management Features
- **Claiming System**: Staff can claim tickets for ownership
- **User Management**: Add/remove users from ticket conversations
- **Priority Levels**: Low, Normal, High, Urgent priority classification
- **Status Tracking**: Open, In Progress, Waiting, Closed, Archived

### 📊 Analytics & Logging
- **Comprehensive Logs**: All ticket actions logged with timestamps
- **Transcript Generation**: Complete conversation history preservation
- **Performance Metrics**: Response times, resolution rates, user satisfaction
- **Export Capabilities**: Data export for external analysis

### ⚡ Automation Features
- **Auto-close**: Inactive ticket automatic closure
- **Escalation Rules**: Automatic escalation based on time or priority
- **Feedback Collection**: Post-closure satisfaction surveys
- **Smart Notifications**: Context-aware staff notifications

## 🔒 Permission System

### Role Hierarchy
- **Owner**: Full system access and dangerous commands
- **Administrator**: Complete bot configuration and management
- **Moderator**: Moderation commands and ticket management
- **Support**: Ticket system access and basic moderation
- **User**: Standard command access

### Granular Permissions
- **Command-level**: Individual command access control
- **Channel-level**: Restrict bot usage to specific channels
- **Feature-level**: Enable/disable entire feature sets
- **User-level**: Blacklist or whitelist specific users

## 🚀 Development

### Development Mode
```bash
bun run dev
```
Features hot reload, enhanced logging, and development utilities.

### Building for Production
```bash
bun run build
```
Creates optimized JavaScript build in `dist/` directory.

### Testing
```bash
bun test
```
Runs the test suite with Bun's built-in test runner.

### Code Quality
```bash
bun run lint        # Check code style
bun run lint:fix    # Auto-fix issues
bun run format      # Format code with Biome
```

## 📚 API Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ | - | Discord bot token |
| `CLIENT_ID` | ✅ | - | Discord application ID |
| `OWNER_ID` | ✅ | - | Bot owner Discord user ID |
| `MONGODB_URI` | ✅ | - | MongoDB connection string |
| `PREFIX` | ❌ | `.` | Default command prefix |
| `WEB_PORT` | ❌ | `3000` | Web dashboard port |
| `WEBHOOK_URL` | ❌ | - | Discord webhook for error logging |
| `NODE_ENV` | ❌ | `development` | Environment mode |

### Configuration Export Format
```json
{
  "guildSettings": {
    "prefix": "!",
    "logCommands": true,
    "autoModeration": {
      "enabled": true,
      "deleteInvites": true,
      "spamThreshold": 5
    }
  },
  "ticketConfig": {
    "enabled": true,
    "maxTicketsPerUser": 3,
    "categories": {
      "general": {
        "name": "General Support",
        "emoji": "❓",
        "color": "#5865F2"
      }
    }
  }
}
```

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow TypeScript best practices
2. **Commit Messages**: Use conventional commit format
3. **Testing**: Include tests for new features
4. **Documentation**: Update README and code comments

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run quality checks (`bun run lint && bun test`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to commands**
- Verify the bot token in `.env`
- Check bot permissions in Discord server
- Ensure MongoDB connection is working

**Ticket system not working**
- Run `/config tickets status` to check configuration
- Verify category channel exists and bot has permissions
- Check support role assignments

**Build failures**
- Ensure Bun is installed and up to date
- Clear cache: `rm -rf node_modules bun.lockb && bun install`
- Check TypeScript configuration

### Debug Mode
Set `NODE_ENV=development` for enhanced logging and debugging information.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Discord.js Team**: Excellent Discord API library
- **Bun Team**: Revolutionary JavaScript runtime
- **MongoDB Team**: Robust database solutions
- **TypeScript Team**: Enhanced JavaScript development
- **Open Source Community**: Inspiration and contributions

---

**Need Help?** 
- 📖 [Documentation](https://docs.example.com) (coming soon)
- 💬 [Discord Support Server](https://discord.gg/example) (coming soon)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 📧 [Contact Us](mailto:support@example.com)

> **⚠️ Note**: This bot requires proper Discord permissions to function correctly. Always test in a development server before production deployment.