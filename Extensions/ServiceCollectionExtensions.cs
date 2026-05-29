using KaorukoBot.Data;
using KaorukoBot.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddBotServices(this IServiceCollection services, string dbConnectionString)
    {
        services.AddDbContextFactory<AppDbContext>(options => options.UseSqlite(dbConnectionString));
        services.AddSingleton<LoggingService>();
        services.AddSingleton<DatabaseService>();
        services.AddSingleton<GuildSettingsService>();
        services.AddSingleton<TicketService>();
        services.AddSingleton<TicketConfigService>();
        services.AddSingleton<CustomCommandService>();
        services.AddSingleton<PollService>();

        return services;
    }
}
