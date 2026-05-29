using Discord;
using Discord.WebSocket;
using KaorukoBot.Models;

namespace KaorukoBot.Components;

public static class ResponseBuilder
{
    public static async Task SendResponse(
        this SocketInteraction interaction,
        ResponseModel response)
    {
        var embeds = GetEmbeds(response);

        if (interaction.HasResponded)
        {
            await interaction.ModifyOriginalResponseAsync(props =>
            {
                if (response.Content != null)
                    props.Content = response.Content;
                if (embeds != null)
                    props.Embeds = embeds;
                if (response.Components != null)
                    props.Components = response.Components;
            });
        }
        else
        {
            await interaction.RespondAsync(
                text: response.Content,
                embeds: embeds,
                components: response.Components,
                ephemeral: response.IsEphemeral,
                allowedMentions: response.AllowedMentions);
        }
    }

    public static async Task SendFollowUpResponse(
        this SocketInteraction interaction,
        ResponseModel response)
    {
        var embeds = GetEmbeds(response);

        await interaction.FollowupAsync(
            text: response.Content,
            embeds: embeds,
            components: response.Components,
            ephemeral: response.IsEphemeral,
            allowedMentions: response.AllowedMentions);
    }

    public static async Task SendResponse(
        this ISocketMessageChannel channel,
        ResponseModel response)
    {
        var embeds = GetEmbeds(response);

        await channel.SendMessageAsync(
            text: response.Content,
            embeds: embeds,
            components: response.Components,
            allowedMentions: response.AllowedMentions);
    }

    public static async Task SendResponse(
        this SocketUserMessage userMessage,
        ResponseModel response)
    {
        var embeds = GetEmbeds(response);

        await userMessage.Channel.SendMessageAsync(
            text: response.Content,
            embeds: embeds,
            components: response.Components,
            messageReference: new MessageReference(userMessage.Id),
            allowedMentions: response.AllowedMentions);
    }

    public static async Task EditResponse(
        this SocketInteraction interaction,
        ResponseModel response)
    {
        var embeds = GetEmbeds(response);

        await interaction.ModifyOriginalResponseAsync(props =>
        {
            if (response.Content != null)
                props.Content = response.Content;
            if (embeds != null)
                props.Embeds = embeds;
            if (response.Components != null)
                props.Components = response.Components;
        });
    }

    private static Embed[]? GetEmbeds(ResponseModel response)
    {
        if (response.Embed != null)
            return [response.Embed.ToDiscordEmbed()];

        if (response.Embeds is { Count: > 0 })
            return response.Embeds.Select(e => e.ToDiscordEmbed()).ToArray();

        return null;
    }
}
