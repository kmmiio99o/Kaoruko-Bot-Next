using KaorukoBot;
using KaorukoBot.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"}.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var dbPath = Path.Combine(AppContext.BaseDirectory, configuration["Database:Path"] ?? "kaoruko.db");
var dbConnectionString = $"Data Source={dbPath}";

var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
optionsBuilder.UseSqlite(dbConnectionString);
using var initContext = new AppDbContext(optionsBuilder.Options);
initContext.Database.EnsureCreated();

var bot = new Bot(configuration);
await bot.StartAsync();

await Task.Delay(-1);
