using Discord;

namespace KaorukoBot.Components;

public static class ComponentBuilder
{
    public static ButtonComponent BuildButton(
        string customId,
        string label,
        ButtonStyle style = ButtonStyle.Primary,
        Emoji? emoji = null,
        bool isDisabled = false)
    {
        var button = new ButtonBuilder()
            .WithCustomId(customId)
            .WithLabel(label)
            .WithStyle(style)
            .WithDisabled(isDisabled);

        if (emoji != null)
            button.WithEmote(emoji);

        return button.Build();
    }

    public static ButtonComponent BuildLinkButton(string url, string label, Emoji? emoji = null)
    {
        var button = new ButtonBuilder()
            .WithUrl(url)
            .WithLabel(label)
            .WithStyle(ButtonStyle.Link);

        if (emoji != null)
            button.WithEmote(emoji);

        return button.Build();
    }

    public static SelectMenuBuilder BuildSelectMenu(
        string customId,
        List<SelectMenuOptionBuilder> options,
        string? placeholder = null,
        int minValues = 1,
        int maxValues = 1)
    {
        var menu = new SelectMenuBuilder()
            .WithCustomId(customId)
            .WithMinValues(minValues)
            .WithMaxValues(maxValues);

        if (!string.IsNullOrEmpty(placeholder))
            menu.WithPlaceholder(placeholder);

        foreach (var option in options)
        {
            menu.AddOption(option.Label, option.Value, option.Description, option.Emote);
        }

        return menu;
    }

    public static Modal BuildModal(
        string customId,
        string title,
        List<TextInputBuilder> inputs)
    {
        var modal = new ModalBuilder()
            .WithCustomId(customId)
            .WithTitle(title);

        foreach (var input in inputs)
        {
            modal.AddTextInput(input.CustomId, input.CustomId, input.Style, input.Placeholder, input.MinLength, input.MaxLength, input.Required);
        }

        return modal.Build();
    }

    public static ActionRowBuilder BuildActionRow(params IMessageComponentBuilder[] components)
    {
        var row = new ActionRowBuilder();
        foreach (var component in components)
        {
            row.AddComponent(component);
        }
        return row;
    }

    public static ActionRowBuilder BuildActionRowFromMenu(SelectMenuBuilder menu)
    {
        return new ActionRowBuilder().AddComponent(menu);
    }
}
