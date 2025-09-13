# Kaoruko Bot

A feature-rich Discord bot built with TypeScript and discord.js, offering comprehensive moderation tools, entertainment features, and utility commands with robust error handling and database integration.

## KEY FEATURES

-   **Dual Command System**: Supports both slash commands and traditional prefix commands
-   **Advanced Event Handling**: Comprehensive event management for Discord interactions
-   **Robust Error Handling**: Webhook logging for unhandled rejections and exceptions
-   **Database Integration**: MongoDB with Mongoose for persistent data storage
-   **Extensible Architecture**: Easy to add new commands and functionality
-   **Owner-Only Utilities**: Secure evaluation and testing commands

## COMMAND CATEGORIES

### ADMINISTRATION
-   `eval` - Execute JavaScript code (Owner restricted)

### ENTERTAINMENT
-   `8ball` - Consult the magic 8-ball for answers to your questions

### INFORMATION
-   `help` - Display help information about available commands

### MODERATION
-   `ban` - Remove a user from the server permanently
-   `kick` - Remove a user from the server
-   `timeout` - Restrict a user's ability to interact temporarily

### UTILITY
-   `avatar` - Retrieve a user's avatar image
-   `endpoll` - Terminate a poll early and display results
-   `invite` - Generate a server invitation link
-   `ping` - Check bot latency and responsiveness
-   `poll` - Create interactive polls with multiple options
-   `serverinfo` - Display detailed server information
-   `testerror` - Command to verify error handling systems (Owner restricted)
-   `userinfo` - Display detailed user information

## INSTALLATION & SETUP

### PREREQUISITES
-   Node.js (v16 or higher)
-   MongoDB database
-   A Discord Developer account

### INSTALLATION STEPS

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/kmmiio99o/kaoruko-rewrite.git
    cd kaoruko-rewrite
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory with the following variables:
    ```env
    TOKEN=your_discord_bot_token_here
    CLIENT_ID=your_bot_client_id_here
    MONGO_URI=your_mongodb_connection_string_here
    OWNER_ID=your_discord_user_id_here
    WEBHOOK_URL=your_discord_webhook_url_here
    ```

### CONFIGURATION DETAILS

-   **`TOKEN`**: Obtain from the [Discord Developer Portal](https://discord.com/developers/applications) under your application's 'Bot' section.
-   **`CLIENT_ID`**: Found in the Discord Developer Portal under 'General Information'.
-   **`MONGO_URI`**: Your MongoDB connection string (e.g., `mongodb://username:password@host:port/database`).
-   **`OWNER_ID`**: Your Discord user ID. Enable Developer Mode in Discord settings, then right-click your profile to copy your ID.
-   **`WEBHOOK_URL`**: A Discord webhook URL for error logging and monitoring.

## USAGE

### PRODUCTION DEPLOYMENT
To build and start the bot for production:
```bash
npm run build
npm run start
```

### DEVELOPMENT MODE
To run the bot in development mode with automatic restarts on file changes:
```bash
npm run dev
```

## DEVELOPMENT

### PROJECT STRUCTURE
```
kaoruko-rewrite/
├── .env                # Environment variables (ignored by git)
├── .github/
│   └── dependabot.yml  # Dependabot configuration
├── scripts/
│   ├── build.js        # Script for building the project
│   └── dev.js          # Script for running in development mode
├── src/
│   ├── commands/       # Command files organized by category
│   │   ├── admin/
│   │   ├── fun/
│   │   ├── info/
│   │   ├── moderation/
│   │   └── utility/
│   ├── config/         # Configuration files for the bot, database, etc.
│   │   ├── config.ts
│   │   ├── database.ts
│   │   └── permissions.ts
│   ├── events/         # Handlers for Discord gateway events
│   │   ├── guildCreate.ts
│   │   ├── interactionCreate.ts
│   │   ├── messageCreate.ts
│   │   └── ready.ts
│   ├── handlers/       # Core handlers for commands, events, and interactions
│   │   ├── commandHandler.ts
│   │   ├── eventHandler.ts
│   │   └── interactionHandler.ts
│   ├── models/         # Mongoose schemas for MongoDB
│   │   ├── GuildSettings.ts
│   │   └── Poll.ts
│   ├── services/       # Services for database connections, etc.
│   │   └── DatabaseService.ts
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/          # Utility functions and helpers
│   │   ├── embeds.ts
│   │   ├── helpers.ts
│   │   ├── logger.ts
│   │   ├── pollManager.ts
│   │   └── webhooklogger.ts
│   └── index.ts        # Main application entry point
├── package-lock.json   # Records the exact version of each dependency
├── package.json        # Project metadata and dependencies
├── readme.md           # This file
└── tsconfig.json       # TypeScript compiler configuration
```

### ADDING NEW COMMANDS

1.  Create a new TypeScript file in the appropriate category under `src/commands/`.
2.  Implement the command logic following the existing command structure.
3.  The command handler will automatically load the new command.
4.  Rebuild and restart the bot to see the changes.

## CONTRIBUTING

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

### ISSUE REPORTING
When reporting issues, please include:
-   A detailed description of the problem.
-   Steps to reproduce the issue.
-   Expected vs. actual behavior.
-   Relevant screenshots or logs.

## LICENSE

This project is licensed under the MIT License - see the `LICENSE` file for details.

## SUPPORT

For support and questions:
-   Open an issue on GitHub.
-   Join our Discord support server (link to be added).

## ACKNOWLEDGMENTS

-   The **discord.js** team for their excellent library.
-   **MongoDB** for providing robust database solutions.
-   The **Discord API community** for their ongoing support.

> **Note**: Ensure proper permissions are configured on your Discord server for moderation commands to function correctly. Always test new features in a development environment before deploying to production.
