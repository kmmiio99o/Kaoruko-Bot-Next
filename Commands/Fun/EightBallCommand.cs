using Discord;
using Discord.WebSocket;
using KaorukoBot.Commands;
using KaorukoBot.Commands.Base;
using KaorukoBot.Components;
using KaorukoBot.Models;
using KaorukoBot.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KaorukoBot.Commands.Fun;

public class EightBallCommand : BotCommand
{
    private static readonly string[] Responses =
    [
        "It is certain.", "It is decidedly so.", "Without a doubt.",
        "Yes definitely.", "You may rely on it.", "As I see it, yes.",
        "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
        "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
        "Cannot predict now.", "Concentrate and ask again.",
        "Don't count on it.", "My reply is no.", "My sources say no.",
        "Outlook not so good.", "Very doubtful."
    ];

    public override string Name => "8ball";
    public override string Description => "Ask the magic 8-ball a question";
    public override CommandCategory Category => CommandCategory.Fun;
    public override GuildPermission? RequiredPermission => null;

    public override SlashCommandBuilder BuildSlashCommand()
    {
        return new SlashCommandBuilder()
            .WithName("8ball")
            .WithDescription("Ask the magic 8-ball a question")
            .AddOption(new SlashCommandOptionBuilder()
                .WithName("question")
                .WithDescription("Your question")
                .WithType(ApplicationCommandOptionType.String)
                .WithRequired(true));
    }

    public override async Task HandleSlashAsync(SocketSlashCommand command, ContextModel context, IServiceProvider services)
    {
        var question = command.Data.Options.First().Value as string ?? "";
        var answer = Responses[Random.Shared.Next(Responses.Length)];
        var embed = Embeds.Info("🎱 8-Ball",
            $"**Question:** {question}\n\n**Answer:** {answer}");
        await command.RespondAsync(embeds: [embed.ToDiscordEmbed()]);
    }

    public override async Task HandlePrefixAsync(SocketUserMessage message, string[] args, SocketGuild? guild, IServiceProvider services)
    {
        if (args.Length == 0)
        {
            await message.ReplyAsync(
                embeds: [Embeds.Error("Usage", "Usage: `.8ball <question>`").ToDiscordEmbed()]);
            return;
        }

        var question = string.Join(" ", args);
        var answer = Responses[Random.Shared.Next(Responses.Length)];
        var embed = Embeds.Info("🎱 8-Ball",
            $"**Question:** {question}\n\n**Answer:** {answer}");
        await message.ReplyAsync(embeds: [embed.ToDiscordEmbed()]);
    }
}
