import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import TicketConfig, {
  ITicketCategoryConfig,
  ITicketConfig as ITicketConfigType,
} from "../../models/TicketConfig";

export const command: ICommand = {
  name: "ticketcategory",
  description: "Manage ticket categories for the server's ticketing system",
  category: "admin",
  slashCommand: true,
  prefixCommand: false,
  ownerOnly: false,
  permissions: [PermissionFlagsBits.ManageGuild],

  data: new SlashCommandBuilder()
    .setName("ticketcategory")
    .setDescription(
      "Manage ticket categories for the server's ticketing system",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new ticket category")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the new category")
            .setMaxLength(50)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Description for the new category")
            .setMaxLength(200)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Emoji for the category (e.g., ❓)")
            .setMaxLength(10)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Hex color code for the category (e.g., #5865F2)")
            .setMaxLength(7)
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove an existing ticket category")
        .addStringOption((option) =>
          option
            .setName("category-id")
            .setDescription("ID of the category to remove")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit an existing ticket category")
        .addStringOption((option) =>
          option
            .setName("category-id")
            .setDescription("ID of the category to edit")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New name for the category")
            .setMaxLength(50)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("New description for the category")
            .setMaxLength(200)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("New emoji for the category")
            .setMaxLength(10)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("New hex color code for the category")
            .setMaxLength(7)
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all configured ticket categories"),
    ),

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Command Error",
            "This command can only be used in a guild.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    let ticketConfig = await TicketConfig.findByGuild(interaction.guild.id);

    if (!ticketConfig) {
      ticketConfig = await TicketConfig.createDefault(interaction.guild.id);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        await handleAddCategory(interaction, ticketConfig);
        break;
      case "remove":
        await handleRemoveCategory(interaction, ticketConfig);
        break;
      case "edit":
        await handleEditCategory(interaction, ticketConfig);
        break;
      case "list":
        await handleListCategories(interaction, ticketConfig);
        break;
      default:
        await interaction.editReply({
          embeds: [
            Embeds.error("Invalid Subcommand", "Please select a valid action."),
          ],
        });
        break;
    }
  },
};

async function handleAddCategory(
  interaction: ChatInputCommandInteraction,
  config: ITicketConfigType,
): Promise<void> {
  const name = interaction.options.getString("name", true);
  const description = interaction.options.getString("description", true);
  const emoji = interaction.options.getString("emoji");
  const color = interaction.options.getString("color");

  const categoryId = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Exists",
          `A category with ID \`${categoryId}\` already exists.`,
        ),
      ],
    });
    return;
  }

  const categoryData: ITicketCategoryConfig = {
    name: name,
    description: description,
    emoji: emoji || undefined,
    color: color || "#5865F2",
    autoAssignRoles: [],
    requiredRoles: [],
  };

  config.categories.set(categoryId, categoryData);
  await config.save();

  const embed = new EmbedBuilder()
    .setTitle("✅ Category Added")
    .setDescription(`Category **${name}** has been added successfully!`)
    .addFields(
      { name: "Category ID", value: categoryId, inline: true },
      { name: "Name", value: name, inline: true },
      { name: "Emoji", value: emoji || "None", inline: true },
      {
        name: "Description",
        value: description,
        inline: false,
      },
      { name: "Color", value: color || "#5865F2", inline: true },
    )
    .setColor("#00FF00")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  Logger.info(
    `Ticket category '${name}' (ID: ${categoryId}) added by ${interaction.user.tag} in guild ${interaction.guild!.id}`,
  );
}

async function handleRemoveCategory(
  interaction: ChatInputCommandInteraction,
  config: ITicketConfigType,
): Promise<void> {
  const categoryId = interaction.options.getString("category-id", true);

  if (!config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Not Found",
          `The category with ID \`${categoryId}\` does not exist.`,
        ),
      ],
    });
    return;
  }

  const categoryData = config.categories.get(categoryId);
  config.categories.delete(categoryId);

  // If the removed category was the default, set a new default if other categories exist
  if (config.defaultCategory === categoryId && config.categories.size > 0) {
    config.defaultCategory = Array.from(config.categories.keys())[0];
  } else if (config.categories.size === 0) {
    config.defaultCategory = "none"; // Or handle as appropriate for no categories
  }

  await config.save();

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Category Removed")
    .setDescription(
      `Category **${categoryData?.name || categoryId}** has been removed successfully!`,
    )
    .addFields(
      { name: "Removed Category ID", value: categoryId, inline: true },
      {
        name: "Remaining Categories",
        value: config.categories.size.toString(),
        inline: true,
      },
    )
    .setColor("#FF6B35")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  Logger.info(
    `Ticket category '${categoryId}' removed by ${interaction.user.tag} in guild ${interaction.guild!.id}`,
  );
}

async function handleEditCategory(
  interaction: ChatInputCommandInteraction,
  config: ITicketConfigType,
): Promise<void> {
  const categoryId = interaction.options.getString("category-id", true);
  const name = interaction.options.getString("name");
  const description = interaction.options.getString("description");
  const emoji = interaction.options.getString("emoji");
  const color = interaction.options.getString("color");

  if (!config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Not Found",
          `The category with ID \`${categoryId}\` does not exist.`,
        ),
      ],
    });
    return;
  }

  const categoryData = config.categories.get(categoryId)!; // Use ! because we checked .has()
  let updated = false;
  const changes: string[] = [];

  if (name && name !== categoryData.name) {
    categoryData.name = name;
    updated = true;
    changes.push(`Name: \`${name}\``);
  }

  if (description && description !== categoryData.description) {
    categoryData.description = description;
    updated = true;
    changes.push(`Description: \`${description}\``);
  }

  if (emoji && emoji !== categoryData.emoji) {
    categoryData.emoji = emoji;
    updated = true;
    changes.push(`Emoji: ${emoji}`);
  }

  if (color && color !== categoryData.color) {
    // Basic hex validation
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Invalid Color",
            "Please provide a valid hex color code (e.g., #RRGGBB).",
          ),
        ],
      });
      return;
    }
    categoryData.color = color;
    updated = true;
    changes.push(`Color: \`${color}\``);
  }

  if (!updated) {
    await interaction.editReply({
      embeds: [Embeds.error("No Changes", "No valid changes were provided.")],
    });
    return;
  }

  config.categories.set(categoryId, categoryData);
  await config.save();

  const embed = new EmbedBuilder()
    .setTitle("✏️ Category Updated")
    .setDescription(
      `Category **${categoryData.name}** (\`${categoryId}\`) has been updated successfully!`,
    )
    .addFields({
      name: "Changes Made",
      value: changes.join("\n"),
      inline: false,
    })
    .setColor("#FFA500")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  Logger.info(
    `Ticket category '${categoryId}' edited by ${interaction.user.tag} in guild ${interaction.guild!.id}. Changes: ${changes.join(", ")}`,
  );
}

async function handleListCategories(
  interaction: ChatInputCommandInteraction,
  config: ITicketConfigType,
): Promise<void> {
  if (config.categories.size === 0) {
    await interaction.editReply({
      embeds: [
        Embeds.info(
          "No Categories",
          "No ticket categories have been configured yet. Use `/ticketcategory add` to add one.",
        ),
      ],
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket Categories")
    .setDescription(
      `Here are all the configured ticket categories (${config.categories.size} total):`,
    )
    .setColor("#5865F2")
    .setTimestamp();

  for (const [categoryId, categoryData] of config.categories) {
    const isDefault =
      config.defaultCategory === categoryId ? " ⭐ (Default)" : "";
    embed.addFields({
      name: `${categoryData.emoji || "❓"} ${categoryData.name}${isDefault}`,
      value:
        `**ID:** \`${categoryId}\`\n` +
        `**Description:** ${categoryData.description || "No description provided"}\n` +
        `**Color:** \`${categoryData.color}\`\n` +
        `**Required Roles:** ${categoryData.requiredRoles.map((roleId) => `<@&${roleId}>`).join(", ") || "None"}\n` +
        `**Auto-Assign Roles:** ${categoryData.autoAssignRoles.map((roleId) => `<@&${roleId}>`).join(", ") || "None"}`,
      inline: true,
    });
  }

  embed.setFooter({
    text: "⭐ indicates the default category",
  });

  await interaction.editReply({ embeds: [embed] });
}
