using Discord;
using Discord.WebSocket;
using KaorukoBot.Components;
using KaorukoBot.Services;

namespace KaorukoBot.Interactions;

public static class CustomCommandInteractions
{
    public static async Task HandleApprovalAsync(
        SocketMessageComponent interaction,
        CustomCommandService commandService,
        LoggingService logger)
    {
        var customId = interaction.Data.CustomId;

        if (customId.StartsWith("cc_approve_", StringComparison.Ordinal))
        {
            var commandId = customId["cc_approve_".Length..];
            await interaction.RespondAsync(
                embeds: [Embeds.Success("Approved", $"Command `{commandId}` has been approved.").ToDiscordEmbed()],
                ephemeral: true);
        }
        else if (customId.StartsWith("cc_reject_", StringComparison.Ordinal))
        {
            var commandId = customId["cc_reject_".Length..];
            await interaction.RespondAsync(
                embeds: [Embeds.Warning("Rejected", $"Command `{commandId}` has been rejected.").ToDiscordEmbed()],
                ephemeral: true);
        }
    }

    public static ModalBuilder CreateCodeCommandModal()
    {
        var modal = new ModalBuilder()
            .WithCustomId("cc_code_submit")
            .WithTitle("Submit Code Command");

        modal.AddTextInput("cc_code_name", "Command Name", TextInputStyle.Short, null, 1, 32, true);

        modal.AddTextInput("cc_code_content", "JavaScript Code", TextInputStyle.Paragraph, "console.log('Hello World!')", 1, 4000, true);

        return modal;
    }
}
