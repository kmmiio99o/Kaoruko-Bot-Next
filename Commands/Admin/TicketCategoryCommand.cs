using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Admin;

public class TicketCategoryCommand : BotCommand
{
    public override string Name => "ticketcategory";
    public override string Description => "Manage ticket categories";
    public override CommandCategory Category => CommandCategory.Admin;
    public override GuildPermission? RequiredPermission => GuildPermission.Administrator;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName(Name)
            .WithDescription(Description)
            .WithDefaultMemberPermissions(GuildPermission.Administrator)
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("action")
                .WithDescription("Action to perform")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true)
                .AddChoice("add", "add")
                .AddChoice("remove", "remove")
                .AddChoice("list", "list"))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("name")
                .WithDescription("Category name")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        if (context.Guild == null) return;
        if (context.GuildUser?.GuildPermissions.Administrator != true)
        {
            await command.RespondAsync(embeds: [Embeds.Error("Permission Denied",
                "You need Administrator permission.").ToDiscordEmbed()], ephemeral: true);
            return;
        }

        var action = command.Data.Options.First(o => o.Name == "action").Value as string ?? "";
        var name = command.Data.Options.FirstOrDefault(o => o.Name == "name")?.Value as string;
        var configService = services.GetRequiredService<TicketConfigService>();

        switch (action)
        {
            case "add":
                if (string.IsNullOrEmpty(name))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Name",
                        "Please provide a category name.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var category = new TicketCategory
                {
                    Id = name.ToLowerInvariant().Replace(' ', '_'),
                    Name = name,
                    Description = $"{name} support"
                };
                await configService.AddCategoryAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture), category);
                await command.RespondAsync(embeds: [Embeds.Success("Category Added",
                    $"Ticket category `{name}` has been added.").ToDiscordEmbed()], ephemeral: true);
                break;

            case "remove":
                if (string.IsNullOrEmpty(name))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Name",
                        "Please provide a category name.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                await configService.RemoveCategoryAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture), name.ToLowerInvariant().Replace(' ', '_'));
                await command.RespondAsync(embeds: [Embeds.Success("Category Removed",
                    $"Ticket category `{name}` has been removed.").ToDiscordEmbed()], ephemeral: true);
                break;

            case "list":
                var config = await configService.GetOrCreateConfigAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));
                if (config.Categories.Count == 0)
                {
                    await command.RespondAsync(embeds: [Embeds.Info("Ticket Categories",
                        "No categories configured.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var list = string.Join("\n", config.Categories.Select(c => $"`{c.Name}` — {c.Description ?? "No description"}"));
                await command.RespondAsync(embeds: [Embeds.Info("Ticket Categories",
                    list).ToDiscordEmbed()], ephemeral: true);
                break;
        }
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
