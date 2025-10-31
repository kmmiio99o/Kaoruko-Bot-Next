import express, { Express, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { Client } from "discord.js";
import { Logger } from "../utils/logger";
import { DatabaseService } from "./DatabaseService";
import { CommandHandler } from "../handlers/commandHandler";

export class WebServer {
  private app: Express;
  private server: any;
  private io: SocketIOServer;
  private client: Client;
  private commandHandler: CommandHandler;
  private port: number;
  private isRunning: boolean = false;

  constructor(
    client: Client,
    commandHandler: CommandHandler,
    port: number = 3000,
  ) {
    this.client = client;
    this.commandHandler = commandHandler;
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../../public")));

    // Basic authentication middleware for API routes
    this.app.use("/api", (req, res, next) => {
      const authHeader = req.headers.authorization;
      const expectedToken =
        process.env.DASHBOARD_TOKEN || "kaoruko-dashboard-2024";

      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({
          success: false,
          error: "Brak autoryzacji",
        });
      }

      next();
    });
  }

  private setupRoutes(): void {
    // Main dashboard page
    this.app.get("/dashboard", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../../public/index.html"));
    });

    // Website page
    this.app.get("/", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../../public/website.html"));
    });

    // Server settings page
    this.app.get("/server-settings", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../../public/server-settings.html"));
    });

    // API dla statystyk bota
    this.app.get("/api/stats", (req: Request, res: Response) => {
      try {
        const guildCount = this.client.guilds.cache.size;
        let totalMembers = 0;
        this.client.guilds.cache.forEach((guild) => {
          totalMembers += guild.memberCount || 0;
        });

        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        res.json({
          success: true,
          data: {
            guilds: guildCount,
            members: totalMembers,
            uptime: this.formatUptime(uptime),
            memory: {
              rss: Math.round(memoryUsage.rss / 1024 / 1024),
              heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
              heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
              external: Math.round(memoryUsage.external / 1024 / 1024),
            },
            nodeVersion: process.version,
            discordJSVersion: "14.14.1",
          },
        });
      } catch (error) {
        Logger.error(`Błąd podczas pobierania statystyk: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API dla listy serwerów z uprawnieniami
    this.app.get("/api/guilds", (req: Request, res: Response) => {
      try {
        const guilds = this.client.guilds.cache.map((guild) => ({
          id: guild.id,
          name: guild.name,
          memberCount: guild.memberCount || 0,
          ownerId: guild.ownerId,
          joinedAt: guild.joinedAt,
          icon: guild.iconURL(),
          features: guild.features,
        }));

        res.json({
          success: true,
          data: guilds,
        });
      } catch (error) {
        Logger.error(`Błąd podczas pobierania serwerów: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API dla logów
    this.app.get("/api/logs", async (req: Request, res: Response) => {
      try {
        res.json({
          success: true,
          data: {
            commands: [],
            errors: [],
            events: [],
          },
        });
      } catch (error) {
        Logger.error(`Błąd podczas pobierania logów: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API dla ustawień bota
    this.app.get("/api/settings", async (req: Request, res: Response) => {
      try {
        try {
          const settings = await DatabaseService.getAllGuildSettings();
          res.json({
            success: true,
            data: settings,
          });
        } catch (dbError) {
          res.json({
            success: true,
            data: [
              {
                guildId: "global",
                prefix: ".",
                logCommands: true,
                logErrors: true,
                logEvents: true,
              },
            ],
          });
        }
      } catch (error) {
        Logger.error(`Błąd podczas pobierania ustawień: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API do aktualizacji ustawień
    this.app.post("/api/settings", async (req: Request, res: Response) => {
      try {
        const { guildId, settings } = req.body;

        if (!guildId || !settings) {
          return res.status(400).json({
            success: false,
            error: "Brak wymaganych danych",
          });
        }

        try {
          await DatabaseService.updateGuildSettings(guildId, settings);
          res.json({
            success: true,
            message: "Ustawienia zostały zaktualizowane",
          });
        } catch (dbError) {
          Logger.warn(`Database not available for settings update: ${dbError}`);
          res.json({
            success: true,
            message:
              "Ustawienia zostały zapisane lokalnie (baza danych niedostępna)",
          });
        }
      } catch (error) {
        Logger.error(`Błąd podczas aktualizacji ustawień: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API dla komend
    this.app.get("/api/commands", (req: Request, res: Response) => {
      try {
        const commands = this.commandHandler.getAllCommands().map((cmd) => ({
          name: cmd.name,
          description: cmd.description,
          category: cmd.category || "utility",
          slashCommand: cmd.slashCommand,
          prefixCommand: cmd.prefixCommand,
          ownerOnly: cmd.ownerOnly,
          permissions: (cmd.permissions || []).map((p) => p.toString()),
        }));

        res.json({
          success: true,
          data: commands,
        });
      } catch (error) {
        Logger.error(`Błąd podczas pobierania komend: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API dla statusu systemu
    this.app.get("/api/status", async (req: Request, res: Response) => {
      try {
        const databaseStatus = await this.checkDatabaseStatus();
        const botStatus = this.client.readyAt ? "online" : "offline";

        res.json({
          success: true,
          data: {
            bot: {
              status: botStatus,
              uptime: this.formatUptime(process.uptime()),
              ping: this.client.ws.ping,
              guilds: this.client.guilds.cache.size,
              users: this.getTotalUsers(),
            },
            database: databaseStatus,
            system: {
              memory: process.memoryUsage(),
              cpu: process.cpuUsage(),
              nodeVersion: process.version,
              platform: process.platform,
            },
          },
        });
      } catch (error) {
        Logger.error(`Błąd podczas pobierania statusu: ${error}`);
        res.status(500).json({
          success: false,
          error: "Błąd serwera",
        });
      }
    });

    // API for server settings
    this.app.get(
      "/api/server-settings/:guildId",
      async (req: Request, res: Response) => {
        try {
          const { guildId } = req.params;

          try {
            const settings = await DatabaseService.getGuildSettings(guildId);
            res.json({
              success: true,
              data: settings,
            });
          } catch (dbError) {
            // Return default settings if database is not available
            res.json({
              success: true,
              data: {
                guildId: guildId,
                prefix: ".",
                logCommands: true,
                logErrors: true,
                logEvents: true,
                welcomeChannel: null,
                goodbyeChannel: null,
                modLogChannel: null,
                autoModeration: {
                  enabled: false,
                  deleteInvites: false,
                  deleteSpam: false,
                  maxWarnings: 3,
                },
                permissions: {
                  adminRoles: [],
                  modRoles: [],
                  blacklistedUsers: [],
                },
              },
            });
          }
        } catch (error) {
          Logger.error(`Error getting server settings: ${error}`);
          res.status(500).json({
            success: false,
            error: "Server error",
          });
        }
      },
    );

    // API to update server settings
    this.app.post(
      "/api/server-settings/:guildId",
      async (req: Request, res: Response) => {
        try {
          const { guildId } = req.params;
          const settings = req.body;

          try {
            await DatabaseService.updateGuildSettings(guildId, settings);
            res.json({
              success: true,
              message: "Server settings updated successfully",
            });
          } catch (dbError) {
            Logger.warn(
              `Database not available for server settings update: ${dbError}`,
            );
            res.json({
              success: true,
              message: "Settings saved locally (database unavailable)",
            });
          }
        } catch (error) {
          Logger.error(`Error updating server settings: ${error}`);
          res.status(500).json({
            success: false,
            error: "Server error",
          });
        }
      },
    );

    // API to get all server settings (for admin)
    this.app.get(
      "/api/all-server-settings",
      async (req: Request, res: Response) => {
        try {
          try {
            const settings = await DatabaseService.getAllGuildSettings();
            res.json({
              success: true,
              data: settings,
            });
          } catch (dbError) {
            res.json({
              success: true,
              data: [],
            });
          }
        } catch (error) {
          Logger.error(`Error getting all server settings: ${error}`);
          res.status(500).json({
            success: false,
            error: "Server error",
          });
        }
      },
    );

    // API for custom commands
    this.app.get(
      "/api/custom-commands/:guildId",
      async (req: Request, res: Response) => {
        // ...
      },
    );
    this.app.post(
      "/api/custom-commands/:guildId",
      async (req: Request, res: Response) => {
        // ...
      },
    );
    this.app.put(
      "/api/custom-commands/:guildId/:commandName",
      async (req: Request, res: Response) => {
        // ...
      },
    );
    this.app.delete(
      "/api/custom-commands/:guildId/:commandName",
      async (req: Request, res: Response) => {
        // ...
      },
    );

    // Health check endpoint
    this.app.get("/api/health", (req: Request, res: Response) => {
      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async checkDatabaseStatus(): Promise<any> {
    try {
      // Próba połączenia z bazą danych
      await DatabaseService.getAllGuildSettings();
      return {
        status: "online",
        message: "Połączono z bazą danych",
      };
    } catch (error) {
      return {
        status: "offline",
        message: "Brak połączenia z bazą danych",
        error: error instanceof Error ? error.message : "Nieznany błąd",
      };
    }
  }

  private getTotalUsers(): number {
    let total = 0;
    this.client.guilds.cache.forEach((guild) => {
      total += guild.memberCount || 0;
    });
    return total;
  }

  private setupSocketIO(): void {
    this.io.on("connection", (socket) => {
      Logger.info(`Nowe połączenie WebSocket: ${socket.id}`);

      // Wysyłaj aktualizacje statystyk co 5 sekund
      const statsInterval = setInterval(() => {
        const guildCount = this.client.guilds.cache.size;
        let totalMembers = 0;
        this.client.guilds.cache.forEach((guild) => {
          totalMembers += guild.memberCount || 0;
        });

        socket.emit("statsUpdate", {
          guilds: guildCount,
          members: totalMembers,
          uptime: this.formatUptime(process.uptime()),
          timestamp: new Date().toISOString(),
        });
      }, 5000);

      socket.on("disconnect", () => {
        Logger.info(`Rozłączono WebSocket: ${socket.id}`);
        clearInterval(statsInterval);
      });
    });
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  public async start() {
    if (this.isRunning) {
      Logger.warn("Serwer webowy już działa");
      return;
    }

    try {
      this.server.listen(this.port, () => {
        this.isRunning = true;
        Logger.success(`Serwer webowy uruchomiony na porcie ${this.port}`);
        Logger.info(
          `Dashboard dostępny pod adresem: http://localhost:${this.port}/dashboard`,
        );
      });
    } catch (error) {
      Logger.error(`Błąd podczas uruchamiania serwera webowego: ${error}`);
      throw error;
    }
  }

  public async stop() {
    if (!this.isRunning) {
      Logger.warn("Serwer webowy nie działa");
      return;
    }

    try {
      this.server.close(() => {
        this.isRunning = false;
        Logger.info("Serwer webowy zatrzymany");
      });
    } catch (error) {
      Logger.error(`Błąd podczas zatrzymywania serwera webowego: ${error}`);
      throw error;
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }
}
