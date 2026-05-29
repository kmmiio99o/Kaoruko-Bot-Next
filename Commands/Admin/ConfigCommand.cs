using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Admin;

public class ConfigCommand : BotCommand
{
    public override string Name => "config";
    public override string Description => "Configure bot settings";
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
                .AddChoice("view", "view")
                .AddChoice("prefix", "prefix")
                .AddChoice("log_channel", "log_channel"))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("value")
                .WithDescription("Value for the action")
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
        var value = command.Data.Options.FirstOrDefault(o => o.Name == "value")?.Value as string;

        var settingsService = services.GetRequiredService<GuildSettingsService>();
        var settings = await settingsService.GetOrCreateSettingsAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));

        switch (action)
        {
            case "view":
                var embed = Embeds.Info("Server Configuration",
                    $"**Prefix:** `{settings.Prefix}`\n**Log Channel:** {settings.LogChannelId ?? "Not set"}\n**AutoMod:** {(settings.AutoModEnabled ? "Enabled" : "Disabled")}");
                await command.RespondAsync(embeds: [embed.ToDiscordEmbed()], ephemeral: true);
                break;

            case "prefix":
                if (string.IsNullOrEmpty(value))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Value",
                        "Please provide a new prefix.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                settings.Prefix = value;
                await settingsService.UpdateSettingsAsync(
                    context.Guild.Id.ToString(CultureInfo.InvariantCulture), settings);
                await command.RespondAsync(embeds: [Embeds.Success("Prefix Updated",
                    $"Bot prefix has been changed to `{value}`").ToDiscordEmbed()], ephemeral: true);
                break;

            default:
                await command.RespondAsync(embeds: [Embeds.Error("Unknown Action",
                    $"Unknown config action: {action}").ToDiscordEmbed()], ephemeral: true);
                break;
        }
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
