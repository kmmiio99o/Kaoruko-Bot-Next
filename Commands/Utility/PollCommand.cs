using System.Globalization;
using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;
using PollModel = KaorukoBot.Models.Poll;

namespace KaorukoBot.Commands.Utility;

public class PollCommand : BotCommand
{
    public override string Name => "poll";
    public override string Description => "Create an interactive poll";
    public override CommandCategory Category => CommandCategory.Utility;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("poll")
            .WithDescription("Create an interactive poll")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("question")
                .WithDescription("The poll question")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("options")
                .WithDescription("Poll options separated by commas (max 5)")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("duration")
                .WithDescription("Poll duration in minutes (default: 60, max: 1440)")
                .WithType(ApplicationCommandOptionType.Integer)
                .WithRequired(false))
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("anonymous")
                .WithDescription("Hide who voted for what")
                .WithType(ApplicationCommandOptionType.Boolean)
                .WithRequired(false));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var pollService = services.GetRequiredService<PollService>();
        var question = command.Data.Options.First(o => o.Name == "question").Value as string ?? "";
        var optionsStr = command.Data.Options.First(o => o.Name == "options").Value as string ?? "";
        var options = optionsStr.Split(',').Select(o => o.Trim()).ToList();

        var duration = command.Data.Options.FirstOrDefault(o => o.Name == "duration")?.Value as int? ?? 60;
        var anonymous = command.Data.Options.FirstOrDefault(o => o.Name == "anonymous")?.Value as bool? ?? false;

        if (options.Count < 2)
        {
            await command.RespondAsync(
                embeds: [Components.Embeds.Error("Not Enough Options", "A poll needs at least 2 options.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        if (options.Count > 5)
        {
            await command.RespondAsync(
                embeds: [Components.Embeds.Error("Too Many Options", "A poll can have a maximum of 5 options.").ToDiscordEmbed()],
                ephemeral: true);
            return;
        }

        var emojis = new[] { "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣" };
        var description = "**React with the buttons below to vote!**\n\n";
        for (var i = 0; i < options.Count; i++)
        {
            description += $"{emojis[i]} {options[i]}\n";
        }

        var embed = new EmbedBuilder()
            .WithTitle("📊 " + question)
            .WithColor(new Color(0x5865F2))
            .WithTimestamp(DateTimeOffset.UtcNow)
            .WithFooter(footer =>
            {
                footer.Text = $"Poll by {command.User.Username} • Duration: {duration} min" +
                              (anonymous ? " • Anonymous" : "");
                footer.IconUrl = command.User.GetAvatarUrl();
            })
            .WithDescription(description);

        var row = new ActionRowBuilder();
        for (var i = 0; i < options.Count; i++)
        {
            var button = new ButtonBuilder()
                .WithCustomId($"poll_vote_{i}")
                .WithLabel(options[i].Length > 80 ? options[i][..80] : options[i])
                .WithStyle(ButtonStyle.Primary)
                .WithEmote(new Emoji(emojis[i]));
            row.AddComponent(button);
        }

        var comp = new Discord.ComponentBuilder().AddRow(row).Build();
        await command.RespondAsync(embeds: [embed.Build()], components: comp);
        var pollMessage = await command.GetOriginalResponseAsync();

        var poll = new PollModel
        {
            MessageId = pollMessage.Id.ToString(CultureInfo.InvariantCulture),
            ChannelId = (command.ChannelId ?? 0).ToString(CultureInfo.InvariantCulture),
            GuildId = context.Guild != null ? context.Guild.Id.ToString(CultureInfo.InvariantCulture) : "",
            Question = question,
            Options = options,
            Anonymous = anonymous,
            DurationMinutes = duration,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = command.User.Id.ToString(CultureInfo.InvariantCulture),
            IsActive = true
        };

        pollService.CreatePoll(poll);
    }

    public override Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        return Task.CompletedTask;
    }
}
