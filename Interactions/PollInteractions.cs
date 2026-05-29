using System.Globalization;
using Discord.WebSocket;
using KaorukoBot.Services;

namespace KaorukoBot.Interactions;

public static class PollInteractions
{
    public static async Task HandleVoteAsync(
        SocketMessageComponent interaction,
        PollService pollService,
        LoggingService logger)
    {
        var customId = interaction.Data.CustomId;
        if (!customId.StartsWith("poll_vote_", StringComparison.Ordinal)) return;

        var optionIndex = int.Parse(customId["poll_vote_".Length..], CultureInfo.InvariantCulture);
        var messageId = interaction.Message.Id.ToString(CultureInfo.InvariantCulture);

        var success = await pollService.HandleVoteAsync(messageId, interaction.User.Id, optionIndex);

        if (success)
        {
            await interaction.RespondAsync(
                text: "Your vote has been recorded!",
                ephemeral: true);
        }
        else
        {
            await interaction.RespondAsync(
                text: "This poll has ended or is no longer active.",
                ephemeral: true);
        }
    }
}
