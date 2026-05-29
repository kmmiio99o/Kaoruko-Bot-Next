using Microsoft.EntityFrameworkCore;
using KaorukoBot.Models;

namespace KaorukoBot.Data;

public class AppDbContext : DbContext
{
    public DbSet<GuildSettings> GuildSettings => Set<GuildSettings>();
    public DbSet<TicketConfig> TicketConfigs => Set<TicketConfig>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<CustomCommand> CustomCommands => Set<CustomCommand>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GuildSettings>(entity =>
        {
            entity.ToTable("GuildSettings");
            entity.Property(e => e.AdminRoles).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.ModRoles).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.AllowedChannels).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.BlockedChannels).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.BlacklistedUsers).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
        });

        modelBuilder.Entity<TicketConfig>(entity =>
        {
            entity.ToTable("TicketConfigs");
            entity.Property(e => e.Categories).HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<TicketCategory>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<TicketCategory>());
            entity.Property(e => e.SupportRoles).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
        });

        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.ToTable("Tickets");
            entity.Property(e => e.Messages).HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<TicketMessage>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<TicketMessage>());
        });

        modelBuilder.Entity<CustomCommand>(entity =>
        {
            entity.ToTable("CustomCommands");
            entity.Property(e => e.AllowedRoles).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.BlockedRoles).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.AllowedChannels).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.BlockedChannels).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.AllowedUsers).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            entity.Property(e => e.BlockedUsers).HasConversion(v => string.Join(',', v), v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
        });
    }
}
