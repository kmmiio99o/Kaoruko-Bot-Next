namespace KaorukoBot.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class CommandCategoryAttribute : Attribute
{
    public string Category { get; }

    public CommandCategoryAttribute(string category)
    {
        Category = category;
    }
}
