using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Admin;

public class CustomCommandCommand : BotCommand
{
    public override string Name => "customcommand";
    public override string Description => "Manage custom commands";
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
                .AddChoice("create", "create")
                .AddChoice("delete", "delete")
                .AddChoice("list", "list")
                .AddChoice("info", "info"))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("name")
                .WithDescription("Command name")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(false))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("response")
                .WithDescription("Command response content")
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
        var response = command.Data.Options.FirstOrDefault(o => o.Name == "response")?.Value as string;

        var customCommandService = services.GetRequiredService<CustomCommandService>();

        switch (action)
        {
            case "create":
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(response))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Fields",
                        "Please provide a name and response.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var cmd = new CustomCommand
                {
                    GuildId = context.Guild.Id.ToString(CultureInfo.InvariantCulture),
                    Name = name,
                    Type = CommandType.Response,
                    Content = response,
                    Trigger = TriggerType.Exact,
                    CreatedBy = command.User.Id.ToString(CultureInfo.InvariantCulture)
                };
                var created = await customCommandService.CreateCommandAsync(cmd);
                if (created)
                {
                    await command.RespondAsync(embeds: [Embeds.Success("Command Created",
                        $"Custom command `{name}` has been created.").ToDiscordEmbed()], ephemeral: true);
                }
                else
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Already Exists",
                        $"A command named `{name}` already exists.").ToDiscordEmbed()], ephemeral: true);
                }
                break;

            case "delete":
                if (string.IsNullOrEmpty(name))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Name",
                        "Please provide the command name to delete.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var commands = await customCommandService.GetCommandsAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));
                var toDelete = commands.FirstOrDefault(c => c.Name == name);
                if (toDelete != null)
                {
                    await customCommandService.DeleteCommandAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture), toDelete.Id);
                    await command.RespondAsync(embeds: [Embeds.Success("Command Deleted",
                        $"Custom command `{name}` has been deleted.").ToDiscordEmbed()], ephemeral: true);
                }
                else
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Not Found",
                        $"No command named `{name}` found.").ToDiscordEmbed()], ephemeral: true);
                }
                break;

            case "list":
                var allCommands = await customCommandService.GetCommandsAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture));
                if (allCommands.Count == 0)
                {
                    await command.RespondAsync(embeds: [Embeds.Info("Custom Commands",
                        "No custom commands configured.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var list = string.Join("\n", allCommands.Select(c => $"`{c.Name}` — {c.Type} ({c.Trigger})"));
                await command.RespondAsync(embeds: [Embeds.Info("Custom Commands",
                    list).ToDiscordEmbed()], ephemeral: true);
                break;

            case "info":
                if (string.IsNullOrEmpty(name))
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Missing Name",
                        "Please provide a command name.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var cmdInfo = (await customCommandService.GetCommandsAsync(context.Guild.Id.ToString(CultureInfo.InvariantCulture)))
                    .FirstOrDefault(c => c.Name == name);
                if (cmdInfo == null)
                {
                    await command.RespondAsync(embeds: [Embeds.Error("Not Found",
                        $"No command named `{name}` found.").ToDiscordEmbed()], ephemeral: true);
                    return;
                }
                var infoEmbed = Embeds.Info($"Command: {cmdInfo.Name}",
                    $"**Type:** {cmdInfo.Type}\n**Trigger:** {cmdInfo.Trigger}\n**Enabled:** {cmdInfo.IsEnabled}\n**Cooldown:** {cmdInfo.Cooldown}s\n**Created by:** {cmdInfo.CreatedBy}");
                await command.RespondAsync(embeds: [infoEmbed.ToDiscordEmbed()], ephemeral: true);
                break;
        }
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
