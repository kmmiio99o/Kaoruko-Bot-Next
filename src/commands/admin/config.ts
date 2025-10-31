import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  Role,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import GuildSettings, {
  IGuildSettings,
  IAutoModeration,
  IPermissions,
} from "../../models/GuildSettings";
import TicketConfig from "../../models/TicketConfig";

export const command: ICommand = {
  name: "config",
  description: "Configure all bot settings for your server",
  slashCommand: true,
  prefixCommand: false,

  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure all bot settings for your server")
    .addSubcommandGroup((group) =>
      group
        .setName("general")
        .setDescription("General bot settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("prefix")
            .setDescription("Set the bot prefix for this server")
            .addStringOption((option) =>
              option
                .setName("prefix")
                .setDescription("New prefix (1-5 characters)")
                .setMaxLength(5)
                .setMinLength(1)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("channels")
            .setDescription("Configure bot channels")
            .addChannelOption((option) =>
              option
                .setName("welcome")
                .setDescription("Welcome channel")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            )
            .addChannelOption((option) =>
              option
                .setName("goodbye")
                .setDescription("Goodbye channel")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            )
            .addChannelOption((option) =>
              option
                .setName("modlog")
                .setDescription("Moderation log channel")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("logging")
            .setDescription("Configure logging settings")
            .addBooleanOption((option) =>
              option
                .setName("commands")
                .setDescription("Log command usage")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("errors")
                .setDescription("Log errors")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("events")
                .setDescription("Log events (joins, leaves, etc.)")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("moderation")
        .setDescription("Moderation and auto-moderation settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("automod")
            .setDescription("Configure auto-moderation")
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Enable auto-moderation")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("delete-invites")
                .setDescription("Delete Discord invites")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("delete-spam")
                .setDescription("Delete spam messages")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("profanity-filter")
                .setDescription("Filter profanity")
                .setRequired(false),
            )
            .addIntegerOption((option) =>
              option
                .setName("max-warnings")
                .setDescription("Maximum warnings before action")
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false),
            )
            .addIntegerOption((option) =>
              option
                .setName("spam-threshold")
                .setDescription(
                  "Messages per 5 seconds before considering spam",
                )
                .setMinValue(3)
                .setMaxValue(20)
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("roles")
            .setDescription("Configure moderation roles")
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("Role type")
                .setRequired(true)
                .addChoices(
                  { name: "Admin Roles", value: "admin" },
                  { name: "Moderator Roles", value: "mod" },
                ),
            )
            .addStringOption((option) =>
              option
                .setName("action")
                .setDescription("Action to perform")
                .setRequired(true)
                .addChoices(
                  { name: "Add", value: "add" },
                  { name: "Remove", value: "remove" },
                  { name: "List", value: "list" },
                  { name: "Clear", value: "clear" },
                ),
            )
            .addRoleOption((option) =>
              option
                .setName("role")
                .setDescription("Role to add or remove")
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("permissions")
            .setDescription("Configure channel permissions")
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("Permission type")
                .setRequired(true)
                .addChoices(
                  { name: "Allowed Channels", value: "allowed" },
                  { name: "Blocked Channels", value: "blocked" },
                  { name: "Blacklisted Users", value: "blacklist" },
                ),
            )
            .addStringOption((option) =>
              option
                .setName("action")
                .setDescription("Action to perform")
                .setRequired(true)
                .addChoices(
                  { name: "Add", value: "add" },
                  { name: "Remove", value: "remove" },
                  { name: "List", value: "list" },
                  { name: "Clear", value: "clear" },
                ),
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Channel to add or remove")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            )
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("User to blacklist or unblacklist")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("tickets")
        .setDescription("Ticket system configuration")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("quick-setup")
            .setDescription("Quick setup for ticket system")
            .addChannelOption((option) =>
              option
                .setName("category")
                .setDescription("Category for ticket channels")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            )
            .addChannelOption((option) =>
              option
                .setName("logs")
                .setDescription("Ticket logs channel")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            )
            .addRoleOption((option) =>
              option
                .setName("support-role")
                .setDescription("Support team role")
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("status")
            .setDescription("View ticket system status"),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("categories")
            .setDescription("Manage ticket categories")
            .addStringOption((option) =>
              option
                .setName("action")
                .setDescription("Action to perform")
                .setRequired(true)
                .addChoices(
                  { name: "Add Category", value: "add" },
                  { name: "Remove Category", value: "remove" },
                  { name: "Edit Category", value: "edit" },
                  { name: "List Categories", value: "list" },
                ),
            )
            .addStringOption((option) =>
              option
                .setName("category-id")
                .setDescription("Category ID (for remove/edit operations)")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Category name")
                .setMaxLength(50)
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("Category description")
                .setMaxLength(200)
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("emoji")
                .setDescription("Category emoji")
                .setMaxLength(10)
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("color")
                .setDescription("Category color (hex code, e.g. #5865F2)")
                .setMaxLength(7)
                .setRequired(false),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View current server configuration")
        .addStringOption((option) =>
          option
            .setName("section")
            .setDescription("Specific section to view")
            .addChoices(
              { name: "All Settings", value: "all" },
              { name: "General", value: "general" },
              { name: "Moderation", value: "moderation" },
              { name: "Tickets", value: "tickets" },
              { name: "Logging", value: "logging" },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Reset configuration to defaults")
        .addStringOption((option) =>
          option
            .setName("section")
            .setDescription("Section to reset")
            .addChoices(
              { name: "All Settings", value: "all" },
              { name: "General", value: "general" },
              { name: "Moderation", value: "moderation" },
              { name: "Tickets", value: "tickets" },
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("export")
        .setDescription("Export configuration as JSON"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("import")
        .setDescription("Import configuration from JSON")
        .addAttachmentOption((option) =>
          option
            .setName("config-file")
            .setDescription("JSON configuration file")
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(interaction?: ChatInputCommandInteraction) {
    if (!interaction || !interaction.guild || !interaction.member) {
      return;
    }

    try {
      await interaction.deferReply({ flags: 64 });

      // Check permissions
      const member = interaction.member as any;
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Insufficient Permissions",
              "You need Administrator permission to configure bot settings.",
            ),
          ],
        });
        return;
      }

      // Get or create guild settings
      let guildSettings = await GuildSettings.findOne({
        guildId: interaction.guild.id,
      });
      if (!guildSettings) {
        guildSettings = new GuildSettings({ guildId: interaction.guild.id });
        await guildSettings.save();
      }

      const subcommandGroup = interaction.options.getSubcommandGroup();
      const subcommand = interaction.options.getSubcommand();

      if (subcommandGroup) {
        switch (subcommandGroup) {
          case "general":
            await handleGeneralConfig(interaction, guildSettings, subcommand);
            break;
          case "moderation":
            await handleModerationConfig(
              interaction,
              guildSettings,
              subcommand,
            );
            break;
          case "tickets":
            await handleTicketsConfig(interaction, subcommand);
            break;
        }
      } else {
        switch (subcommand) {
          case "view":
            await handleView(interaction, guildSettings);
            break;
          case "reset":
            await handleReset(interaction, guildSettings);
            break;
          case "export":
            await handleExport(interaction, guildSettings);
            break;
          case "import":
            await handleImport(interaction, guildSettings);
            break;
        }
      }
    } catch (error) {
      Logger.error("Error in config command:" + ": " + error);

      const errorEmbed = Embeds.error(
        "Configuration Error",
        "An error occurred while managing configuration. Please try again.",
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  },
};

async function handleTicketCategories(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const action = interaction.options.getString("action", true);
  const categoryId = interaction.options.getString("category-id");
  const name = interaction.options.getString("name");
  const description = interaction.options.getString("description");
  const emoji = interaction.options.getString("emoji");
  const color = interaction.options.getString("color");

  let ticketConfig = await TicketConfig.findByGuild(interaction.guild!.id);

  if (!ticketConfig) {
    ticketConfig = await TicketConfig.createDefault(interaction.guild!.id);
  }

  switch (action) {
    case "add":
      await handleAddCategory(
        interaction,
        ticketConfig,
        name,
        description,
        emoji,
        color,
      );
      break;
    case "remove":
      await handleRemoveCategory(interaction, ticketConfig, categoryId);
      break;
    case "list":
      await handleListCategories(interaction, ticketConfig);
      break;
    case "edit":
      await handleEditCategory(
        interaction,
        ticketConfig,
        categoryId,
        name,
        description,
        emoji,
        color,
      );
      break;
    default:
      await interaction.editReply({
        embeds: [
          Embeds.error("Invalid Action", "Please select a valid action."),
        ],
      });
  }
}

async function handleAddCategory(
  interaction: ChatInputCommandInteraction,
  config: any,
  name: string | null,
  description: string | null,
  emoji: string | null,
  color: string | null,
): Promise<void> {
  if (!name) {
    await interaction.editReply({
      embeds: [
        Embeds.error("Missing Name", "Please provide a name for the category."),
      ],
    });
    return;
  }

  const categoryId = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Exists",
          "A category with this name already exists.",
        ),
      ],
    });
    return;
  }

  const categoryData = {
    name: name,
    description: description || "No description provided",
    emoji: emoji || "🎫",
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
      { name: "Emoji", value: emoji || "🎫", inline: true },
      {
        name: "Description",
        value: description || "No description provided",
        inline: false,
      },
    )
    .setColor("#00FF00")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveCategory(
  interaction: ChatInputCommandInteraction,
  config: any,
  categoryId: string | null,
): Promise<void> {
  if (!categoryId) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Missing Category ID",
          "Please provide the category ID to remove.",
        ),
      ],
    });
    return;
  }

  if (!config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Not Found",
          "The specified category does not exist.",
        ),
      ],
    });
    return;
  }

  const categoryData = config.categories.get(categoryId);
  config.categories.delete(categoryId);

  if (config.defaultCategory === categoryId && config.categories.size > 0) {
    config.defaultCategory = Array.from(config.categories.keys())[0];
  }

  await config.save();

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Category Removed")
    .setDescription(
      `Category **${categoryData.name}** has been removed successfully!`,
    )
    .addFields(
      { name: "Removed Category", value: categoryId, inline: true },
      {
        name: "Remaining Categories",
        value: config.categories.size.toString(),
        inline: true,
      },
    )
    .setColor("#FF6B35")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleListCategories(
  interaction: ChatInputCommandInteraction,
  config: any,
): Promise<void> {
  if (config.categories.size === 0) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "No Categories",
          "No ticket categories have been configured.",
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
    const isDefault = config.defaultCategory === categoryId ? " ⭐" : "";
    embed.addFields({
      name: `${categoryData.emoji} ${categoryData.name}${isDefault}`,
      value: `**ID:** ${categoryId}\n**Description:** ${categoryData.description}\n**Color:** ${categoryData.color}`,
      inline: true,
    });
  }

  embed.setFooter({
    text: "⭐ indicates the default category",
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleEditCategory(
  interaction: ChatInputCommandInteraction,
  config: any,
  categoryId: string | null,
  name: string | null,
  description: string | null,
  emoji: string | null,
  color: string | null,
): Promise<void> {
  if (!categoryId) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Missing Category ID",
          "Please provide the category ID to edit.",
        ),
      ],
    });
    return;
  }

  if (!config.categories.has(categoryId)) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Category Not Found",
          "The specified category does not exist.",
        ),
      ],
    });
    return;
  }

  const categoryData = config.categories.get(categoryId);
  let updated = false;
  const changes: string[] = [];

  if (name && name !== categoryData.name) {
    categoryData.name = name;
    updated = true;
    changes.push(`Name: ${name}`);
  }

  if (description && description !== categoryData.description) {
    categoryData.description = description;
    updated = true;
    changes.push(`Description: ${description}`);
  }

  if (emoji && emoji !== categoryData.emoji) {
    categoryData.emoji = emoji;
    updated = true;
    changes.push(`Emoji: ${emoji}`);
  }

  if (color && color !== categoryData.color) {
    categoryData.color = color;
    updated = true;
    changes.push(`Color: ${color}`);
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
      `Category **${categoryData.name}** has been updated successfully!`,
    )
    .addFields(
      { name: "Category ID", value: categoryId, inline: true },
      { name: "Changes Made", value: changes.join("\n"), inline: false },
    )
    .setColor("#FFA500")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleGeneralConfig(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
  subcommand: string,
) {
  switch (subcommand) {
    case "prefix":
      const newPrefix = interaction.options.getString("prefix", true);

      // Validate prefix
      if (newPrefix.includes(" ")) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Invalid Prefix", "Prefix cannot contain spaces."),
          ],
        });
        return;
      }

      const oldPrefix = guildSettings.prefix;
      guildSettings.prefix = newPrefix;
      await guildSettings.save();

      const embed = new EmbedBuilder()
        .setTitle("✅ Prefix Updated")
        .setDescription(
          `Bot prefix has been changed from \`${oldPrefix}\` to \`${newPrefix}\``,
        )
        .addFields(
          { name: "Old Prefix", value: `\`${oldPrefix}\``, inline: true },
          { name: "New Prefix", value: `\`${newPrefix}\``, inline: true },
        )
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      break;

    case "channels":
      const welcomeChannel = interaction.options.getChannel("welcome");
      const goodbyeChannel = interaction.options.getChannel("goodbye");
      const modLogChannel = interaction.options.getChannel("modlog");

      const updates: string[] = [];

      if (welcomeChannel) {
        guildSettings.welcomeChannel = welcomeChannel.id;
        updates.push(`Welcome: ${welcomeChannel}`);
      }

      if (goodbyeChannel) {
        guildSettings.goodbyeChannel = goodbyeChannel.id;
        updates.push(`Goodbye: ${goodbyeChannel}`);
      }

      if (modLogChannel) {
        guildSettings.modLogChannel = modLogChannel.id;
        updates.push(`Mod Log: ${modLogChannel}`);
      }

      if (updates.length === 0) {
        await interaction.editReply({
          embeds: [
            Embeds.error("No Changes", "No channels were specified to update."),
          ],
        });
        return;
      }

      await guildSettings.save();

      const channelEmbed = new EmbedBuilder()
        .setTitle("✅ Channels Updated")
        .setDescription("The following channels have been configured:")
        .addFields({ name: "Changes", value: updates.join("\n") })
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [channelEmbed] });
      break;

    case "logging":
      const logCommands = interaction.options.getBoolean("commands");
      const logErrors = interaction.options.getBoolean("errors");
      const logEvents = interaction.options.getBoolean("events");

      const logUpdates: string[] = [];

      if (logCommands !== null) {
        guildSettings.logCommands = logCommands;
        logUpdates.push(`Commands: ${logCommands ? "Enabled" : "Disabled"}`);
      }

      if (logErrors !== null) {
        guildSettings.logErrors = logErrors;
        logUpdates.push(`Errors: ${logErrors ? "Enabled" : "Disabled"}`);
      }

      if (logEvents !== null) {
        guildSettings.logEvents = logEvents;
        logUpdates.push(`Events: ${logEvents ? "Enabled" : "Disabled"}`);
      }

      if (logUpdates.length === 0) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "No Changes",
              "No logging settings were specified to update.",
            ),
          ],
        });
        return;
      }

      await guildSettings.save();

      const loggingEmbed = new EmbedBuilder()
        .setTitle("✅ Logging Settings Updated")
        .setDescription("The following logging settings have been updated:")
        .addFields({ name: "Changes", value: logUpdates.join("\n") })
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [loggingEmbed] });
      break;
  }
}

async function handleModerationConfig(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
  subcommand: string,
) {
  switch (subcommand) {
    case "automod":
      const enabled = interaction.options.getBoolean("enabled");
      const deleteInvites = interaction.options.getBoolean("delete-invites");
      const deleteSpam = interaction.options.getBoolean("delete-spam");
      const profanityFilter =
        interaction.options.getBoolean("profanity-filter");
      const maxWarnings = interaction.options.getInteger("max-warnings");
      const spamThreshold = interaction.options.getInteger("spam-threshold");

      const autoModUpdates: string[] = [];

      if (enabled !== null) {
        guildSettings.autoModeration.enabled = enabled;
        autoModUpdates.push(`Auto-mod: ${enabled ? "Enabled" : "Disabled"}`);
      }

      if (deleteInvites !== null) {
        guildSettings.autoModeration.deleteInvites = deleteInvites;
        autoModUpdates.push(`Delete invites: ${deleteInvites ? "Yes" : "No"}`);
      }

      if (deleteSpam !== null) {
        guildSettings.autoModeration.deleteSpam = deleteSpam;
        autoModUpdates.push(`Delete spam: ${deleteSpam ? "Yes" : "No"}`);
      }

      if (profanityFilter !== null) {
        guildSettings.autoModeration.profanityFilter = profanityFilter;
        autoModUpdates.push(
          `Profanity filter: ${profanityFilter ? "Enabled" : "Disabled"}`,
        );
      }

      if (maxWarnings !== null) {
        guildSettings.autoModeration.maxWarnings = maxWarnings;
        autoModUpdates.push(`Max warnings: ${maxWarnings}`);
      }

      if (spamThreshold !== null) {
        guildSettings.autoModeration.spamThreshold = spamThreshold;
        autoModUpdates.push(`Spam threshold: ${spamThreshold} messages/5s`);
      }

      if (autoModUpdates.length === 0) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "No Changes",
              "No auto-moderation settings were specified.",
            ),
          ],
        });
        return;
      }

      await guildSettings.save();

      const autoModEmbed = new EmbedBuilder()
        .setTitle("✅ Auto-Moderation Updated")
        .setDescription(
          "The following auto-moderation settings have been updated:",
        )
        .addFields({ name: "Changes", value: autoModUpdates.join("\n") })
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [autoModEmbed] });
      break;

    case "roles":
      await handleRoleConfig(interaction, guildSettings);
      break;

    case "permissions":
      await handlePermissionConfig(interaction, guildSettings);
      break;
  }
}

async function handleRoleConfig(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  const type = interaction.options.getString("type", true);
  const action = interaction.options.getString("action", true);
  const role = interaction.options.getRole("role");

  const roleArray =
    type === "admin"
      ? guildSettings.permissions.adminRoles
      : guildSettings.permissions.modRoles;
  const roleType = type === "admin" ? "Admin" : "Moderator";

  switch (action) {
    case "add":
      if (!role) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Missing Role", "Please specify a role to add."),
          ],
        });
        return;
      }

      if (roleArray.includes(role.id)) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Role Already Added",
              `${role} is already an ${roleType.toLowerCase()} role.`,
            ),
          ],
        });
        return;
      }

      roleArray.push(role.id);
      await guildSettings.save();

      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${roleType} Role Added`,
            `${role} has been added as an ${roleType.toLowerCase()} role.`,
          ),
        ],
      });
      break;

    case "remove":
      if (!role) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Missing Role", "Please specify a role to remove."),
          ],
        });
        return;
      }

      const index = roleArray.indexOf(role.id);
      if (index === -1) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Role Not Found",
              `${role} is not an ${roleType.toLowerCase()} role.`,
            ),
          ],
        });
        return;
      }

      roleArray.splice(index, 1);
      await guildSettings.save();

      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${roleType} Role Removed`,
            `${role} has been removed from ${roleType.toLowerCase()} roles.`,
          ),
        ],
      });
      break;

    case "list":
      if (roleArray.length === 0) {
        await interaction.editReply({
          embeds: [
            Embeds.info(
              `No ${roleType} Roles`,
              `No ${roleType.toLowerCase()} roles have been configured.`,
            ),
          ],
        });
        return;
      }

      const roleList = roleArray.map((roleId) => `<@&${roleId}>`).join("\n");
      await interaction.editReply({
        embeds: [Embeds.info(`${roleType} Roles`, roleList)],
      });
      break;

    case "clear":
      roleArray.length = 0;
      await guildSettings.save();

      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${roleType} Roles Cleared`,
            `All ${roleType.toLowerCase()} roles have been removed.`,
          ),
        ],
      });
      break;
  }
}

async function handlePermissionConfig(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  const type = interaction.options.getString("type", true);
  const action = interaction.options.getString("action", true);
  const channel = interaction.options.getChannel("channel");
  const user = interaction.options.getUser("user");

  let targetArray: string[];
  let itemType: string;
  let item: string | null = null;

  switch (type) {
    case "allowed":
      targetArray = guildSettings.permissions.allowedChannels;
      itemType = "channel";
      item = channel?.id || null;
      break;
    case "blocked":
      targetArray = guildSettings.permissions.blockedChannels;
      itemType = "channel";
      item = channel?.id || null;
      break;
    case "blacklist":
      targetArray = guildSettings.permissions.blacklistedUsers;
      itemType = "user";
      item = user?.id || null;
      break;
    default:
      return;
  }

  const typeName =
    type === "allowed"
      ? "Allowed Channels"
      : type === "blocked"
        ? "Blocked Channels"
        : "Blacklisted Users";

  switch (action) {
    case "add":
      if (!item) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Missing Item",
              `Please specify a ${itemType} to add.`,
            ),
          ],
        });
        return;
      }

      if (targetArray.includes(item)) {
        const mention = itemType === "channel" ? `<#${item}>` : `<@${item}>`;
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Already Added",
              `${mention} is already in ${typeName.toLowerCase()}.`,
            ),
          ],
        });
        return;
      }

      targetArray.push(item);
      await guildSettings.save();

      const addMention = itemType === "channel" ? `<#${item}>` : `<@${item}>`;
      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${typeName} Updated`,
            `${addMention} has been added to ${typeName.toLowerCase()}.`,
          ),
        ],
      });
      break;

    case "remove":
      if (!item) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Missing Item",
              `Please specify a ${itemType} to remove.`,
            ),
          ],
        });
        return;
      }

      const removeIndex = targetArray.indexOf(item);
      if (removeIndex === -1) {
        const removeMention =
          itemType === "channel" ? `<#${item}>` : `<@${item}>`;
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Not Found",
              `${removeMention} is not in ${typeName.toLowerCase()}.`,
            ),
          ],
        });
        return;
      }

      targetArray.splice(removeIndex, 1);
      await guildSettings.save();

      const removedMention =
        itemType === "channel" ? `<#${item}>` : `<@${item}>`;
      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${typeName} Updated`,
            `${removedMention} has been removed from ${typeName.toLowerCase()}.`,
          ),
        ],
      });
      break;

    case "list":
      if (targetArray.length === 0) {
        await interaction.editReply({
          embeds: [
            Embeds.info(
              `No ${typeName}`,
              `No ${typeName.toLowerCase()} have been configured.`,
            ),
          ],
        });
        return;
      }

      const listMentions = targetArray
        .map((id) => (itemType === "channel" ? `<#${id}>` : `<@${id}>`))
        .join("\n");
      await interaction.editReply({
        embeds: [Embeds.info(typeName, listMentions)],
      });
      break;

    case "clear":
      targetArray.length = 0;
      await guildSettings.save();

      await interaction.editReply({
        embeds: [
          Embeds.success(
            `${typeName} Cleared`,
            `All ${typeName.toLowerCase()} have been removed.`,
          ),
        ],
      });
      break;
  }
}

async function handleTicketsConfig(
  interaction: ChatInputCommandInteraction,
  subcommand: string,
) {
  switch (subcommand) {
    case "categories":
      await handleTicketCategories(interaction);
      break;
    case "quick-setup":
      const category = interaction.options.getChannel("category");
      const logsChannel = interaction.options.getChannel("logs");
      const supportRole = interaction.options.getRole("support-role");

      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Invalid Category",
              "Please provide a valid category channel.",
            ),
          ],
        });
        return;
      }

      // Get or create ticket config
      let ticketConfig = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!ticketConfig) {
        ticketConfig = await TicketConfig.createDefault(interaction.guild!.id);
      }

      // Update configuration
      ticketConfig.enabled = true;
      ticketConfig.categoryId = category.id;

      if (logsChannel) {
        ticketConfig.logChannelId = logsChannel.id;
      }

      if (supportRole) {
        ticketConfig.supportRoles = [supportRole.id];
      }

      await ticketConfig.save();

      const setupEmbed = new EmbedBuilder()
        .setTitle("✅ Ticket System Setup Complete")
        .setDescription("The ticket system has been quickly configured!")
        .addFields(
          { name: "Status", value: "✅ Enabled", inline: true },
          { name: "Category", value: `${category}`, inline: true },
          {
            name: "Logs Channel",
            value: logsChannel ? `${logsChannel}` : "❌ Not set",
            inline: true,
          },
        )
        .setColor("#00FF00")
        .setTimestamp();

      if (supportRole) {
        setupEmbed.addFields({
          name: "Support Role",
          value: `${supportRole}`,
          inline: true,
        });
      }

      setupEmbed.addFields({
        name: "Next Steps",
        value:
          "• Use `/ticketpanel` to create a ticket panel\n• Use `/ticketconfig` for advanced settings",
        inline: false,
      });

      await interaction.editReply({ embeds: [setupEmbed] });
      break;

    case "status":
      const config = await TicketConfig.findByGuild(interaction.guild!.id);

      if (!config) {
        await interaction.editReply({
          embeds: [
            Embeds.info(
              "Ticket System Status",
              "❌ Not configured\n\nUse `/config tickets quick-setup` to get started.",
            ),
          ],
        });
        return;
      }

      const statusEmbed = new EmbedBuilder()
        .setTitle("🎫 Ticket System Status")
        .setDescription(`Status for ${interaction.guild!.name}`)
        .addFields(
          {
            name: "System Status",
            value: config.enabled ? "✅ Enabled" : "❌ Disabled",
            inline: true,
          },
          {
            name: "Category",
            value: config.categoryId ? `<#${config.categoryId}>` : "❌ Not set",
            inline: true,
          },
          {
            name: "Log Channel",
            value: config.logChannelId
              ? `<#${config.logChannelId}>`
              : "❌ Not set",
            inline: true,
          },
          {
            name: "Support Roles",
            value:
              config.supportRoles.length > 0
                ? `${config.supportRoles.length} role(s)`
                : "❌ None",
            inline: true,
          },
          {
            name: "Categories",
            value: `${config.categories.size} configured`,
            inline: true,
          },
          {
            name: "Max Tickets/User",
            value: config.maxTicketsPerUser.toString(),
            inline: true,
          },
        )
        .setColor(config.enabled ? "#00FF00" : "#FF0000")
        .setTimestamp();

      await interaction.editReply({ embeds: [statusEmbed] });
      break;
  }
}

async function handleView(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  const section = interaction.options.getString("section") || "all";

  const embeds: EmbedBuilder[] = [];

  if (section === "all" || section === "general") {
    const generalEmbed = new EmbedBuilder()
      .setTitle("⚙️ General Settings")
      .addFields(
        { name: "Prefix", value: `\`${guildSettings.prefix}\``, inline: true },
        {
          name: "Welcome Channel",
          value: guildSettings.welcomeChannel
            ? `<#${guildSettings.welcomeChannel}>`
            : "❌ Not set",
          inline: true,
        },
        {
          name: "Goodbye Channel",
          value: guildSettings.goodbyeChannel
            ? `<#${guildSettings.goodbyeChannel}>`
            : "❌ Not set",
          inline: true,
        },
        {
          name: "Mod Log Channel",
          value: guildSettings.modLogChannel
            ? `<#${guildSettings.modLogChannel}>`
            : "❌ Not set",
          inline: true,
        },
      )
      .setColor("#5865F2")
      .setTimestamp();

    embeds.push(generalEmbed);
  }

  if (section === "all" || section === "moderation") {
    const modEmbed = new EmbedBuilder()
      .setTitle("🛡️ Moderation Settings")
      .addFields(
        {
          name: "Auto-Moderation",
          value: guildSettings.autoModeration.enabled
            ? "✅ Enabled"
            : "❌ Disabled",
          inline: true,
        },
        {
          name: "Delete Invites",
          value: guildSettings.autoModeration.deleteInvites
            ? "✅ Yes"
            : "❌ No",
          inline: true,
        },
        {
          name: "Delete Spam",
          value: guildSettings.autoModeration.deleteSpam ? "✅ Yes" : "❌ No",
          inline: true,
        },
        {
          name: "Profanity Filter",
          value: guildSettings.autoModeration.profanityFilter
            ? "✅ Enabled"
            : "❌ Disabled",
          inline: true,
        },
        {
          name: "Max Warnings",
          value: guildSettings.autoModeration.maxWarnings.toString(),
          inline: true,
        },
        {
          name: "Spam Threshold",
          value: `${guildSettings.autoModeration.spamThreshold}/5s`,
          inline: true,
        },
        {
          name: "Admin Roles",
          value:
            guildSettings.permissions.adminRoles.length > 0
              ? `${guildSettings.permissions.adminRoles.length} role(s)`
              : "❌ None",
          inline: true,
        },
        {
          name: "Mod Roles",
          value:
            guildSettings.permissions.modRoles.length > 0
              ? `${guildSettings.permissions.modRoles.length} role(s)`
              : "❌ None",
          inline: true,
        },
      )
      .setColor("#FF6B35")
      .setTimestamp();

    embeds.push(modEmbed);
  }

  if (section === "all" || section === "logging") {
    const loggingEmbed = new EmbedBuilder()
      .setTitle("📝 Logging Settings")
      .addFields(
        {
          name: "Log Commands",
          value: guildSettings.logCommands ? "✅ Enabled" : "❌ Disabled",
          inline: true,
        },
        {
          name: "Log Errors",
          value: guildSettings.logErrors ? "✅ Enabled" : "❌ Disabled",
          inline: true,
        },
        {
          name: "Log Events",
          value: guildSettings.logEvents ? "✅ Enabled" : "❌ Disabled",
          inline: true,
        },
        {
          name: "Allowed Channels",
          value:
            guildSettings.permissions.allowedChannels.length > 0
              ? `${guildSettings.permissions.allowedChannels.length} channel(s)`
              : "❌ All allowed",
          inline: true,
        },
        {
          name: "Blocked Channels",
          value:
            guildSettings.permissions.blockedChannels.length > 0
              ? `${guildSettings.permissions.blockedChannels.length} channel(s)`
              : "❌ None",
          inline: true,
        },
        {
          name: "Blacklisted Users",
          value:
            guildSettings.permissions.blacklistedUsers.length > 0
              ? `${guildSettings.permissions.blacklistedUsers.length} user(s)`
              : "❌ None",
          inline: true,
        },
      )
      .setColor("#4CAF50")
      .setTimestamp();

    embeds.push(loggingEmbed);
  }

  if (section === "all" || section === "tickets") {
    const ticketConfig = await TicketConfig.findByGuild(interaction.guild!.id);

    const ticketEmbed = new EmbedBuilder()
      .setTitle("🎫 Ticket System Settings")
      .setColor("#9932CC")
      .setTimestamp();

    if (!ticketConfig) {
      ticketEmbed.setDescription(
        "❌ Ticket system not configured\n\nUse `/config tickets quick-setup` to get started.",
      );
    } else {
      ticketEmbed.addFields(
        {
          name: "Status",
          value: ticketConfig.enabled ? "✅ Enabled" : "❌ Disabled",
          inline: true,
        },
        {
          name: "Category",
          value: ticketConfig.categoryId
            ? `<#${ticketConfig.categoryId}>`
            : "❌ Not set",
          inline: true,
        },
        {
          name: "Log Channel",
          value: ticketConfig.logChannelId
            ? `<#${ticketConfig.logChannelId}>`
            : "❌ Not set",
          inline: true,
        },
        {
          name: "Support Roles",
          value:
            ticketConfig.supportRoles.length > 0
              ? `${ticketConfig.supportRoles.length} role(s)`
              : "❌ None",
          inline: true,
        },
        {
          name: "Max Tickets/User",
          value: ticketConfig.maxTicketsPerUser.toString(),
          inline: true,
        },
        {
          name: "Categories",
          value: `${ticketConfig.categories.size} configured`,
          inline: true,
        },
      );
    }

    embeds.push(ticketEmbed);
  }

  // Send embeds (Discord has a limit of 10 embeds per message)
  const embedsToSend = embeds.slice(0, 10);
  await interaction.editReply({ embeds: embedsToSend });
}

async function handleReset(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  const section = interaction.options.getString("section", true);

  // Create confirmation buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_reset_${section}`)
      .setLabel("Confirm Reset")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚠️"),
    new ButtonBuilder()
      .setCustomId("cancel_reset")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  const sectionName =
    section === "all" ? "ALL SETTINGS" : section.toUpperCase();
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Confirm Reset - ${sectionName}`)
    .setDescription(
      `This will reset ${sectionName} configuration to defaults. This action cannot be undone!\n\n` +
        `**This will affect:**\n` +
        (section === "all" || section === "general"
          ? "• Bot prefix\n• Welcome/goodbye channels\n• Logging settings\n"
          : "") +
        (section === "all" || section === "moderation"
          ? "• Auto-moderation settings\n• Admin and moderator roles\n• Permissions\n"
          : "") +
        (section === "all" || section === "tickets"
          ? "• Ticket system configuration\n• All ticket categories\n• Panel settings\n"
          : ""),
    )
    .setColor("#FF0000")
    .setTimestamp();

  const response = await interaction.editReply({
    embeds: [embed],
    components: [row],
  });

  try {
    const confirmation = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    if (confirmation.customId.startsWith("confirm_reset_")) {
      // Perform the reset based on section
      await performReset(interaction, guildSettings, section);

      const resetEmbed = new EmbedBuilder()
        .setTitle("✅ Configuration Reset")
        .setDescription(
          `${sectionName} configuration has been reset to defaults.`,
        )
        .setColor("#00FF00")
        .setTimestamp();

      await confirmation.update({ embeds: [resetEmbed], components: [] });
    } else {
      const cancelEmbed = new EmbedBuilder()
        .setTitle("❌ Reset Cancelled")
        .setDescription("Configuration reset has been cancelled.")
        .setColor("#FF0000")
        .setTimestamp();

      await confirmation.update({ embeds: [cancelEmbed], components: [] });
    }
  } catch {
    const timeoutEmbed = new EmbedBuilder()
      .setTitle("⏰ Reset Timeout")
      .setDescription("Configuration reset confirmation timed out.")
      .setColor("#FF0000")
      .setTimestamp();

    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
  }
}

async function performReset(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
  section: string,
) {
  if (section === "all" || section === "general") {
    guildSettings.prefix = ".";
    guildSettings.welcomeChannel = null;
    guildSettings.goodbyeChannel = null;
    guildSettings.modLogChannel = null;
    guildSettings.logCommands = true;
    guildSettings.logErrors = true;
    guildSettings.logEvents = true;
  }

  if (section === "all" || section === "moderation") {
    guildSettings.autoModeration = {
      enabled: false,
      deleteInvites: false,
      deleteSpam: false,
      maxWarnings: 3,
      spamThreshold: 5,
      profanityFilter: false,
    };
    guildSettings.permissions = {
      adminRoles: [],
      modRoles: [],
      blacklistedUsers: [],
      allowedChannels: [],
      blockedChannels: [],
    };
  }

  if (section === "all" || section === "tickets") {
    await TicketConfig.deleteOne({ guildId: interaction.guild!.id });
  }

  await guildSettings.save();
}

async function handleExport(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  try {
    const ticketConfig = await TicketConfig.findByGuild(interaction.guild!.id);

    const exportData = {
      guildSettings: {
        prefix: guildSettings.prefix,
        logCommands: guildSettings.logCommands,
        logErrors: guildSettings.logErrors,
        logEvents: guildSettings.logEvents,
        welcomeChannel: guildSettings.welcomeChannel,
        goodbyeChannel: guildSettings.goodbyeChannel,
        modLogChannel: guildSettings.modLogChannel,
        autoModeration: guildSettings.autoModeration,
        permissions: guildSettings.permissions,
      },
      ticketConfig: ticketConfig
        ? {
            enabled: ticketConfig.enabled,
            categoryId: ticketConfig.categoryId,
            logChannelId: ticketConfig.logChannelId,
            supportRoles: ticketConfig.supportRoles,
            adminRoles: ticketConfig.adminRoles,
            maxTicketsPerUser: ticketConfig.maxTicketsPerUser,
            autoDeleteAfter: ticketConfig.autoDeleteAfter,
            dmUserOnClose: ticketConfig.dmUserOnClose,
            mentionSupportOnCreate: ticketConfig.mentionSupportOnCreate,
            allowUserClose: ticketConfig.allowUserClose,
            panelTitle: ticketConfig.panelTitle,
            panelDescription: ticketConfig.panelDescription,
            panelColor: ticketConfig.panelColor,
            categories: Object.fromEntries(ticketConfig.categories),
            transcript: ticketConfig.transcript,
          }
        : null,
      exportedAt: new Date().toISOString(),
      guildId: interaction.guild!.id,
      guildName: interaction.guild!.name,
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonData, "utf8");

    const embed = new EmbedBuilder()
      .setTitle("📤 Configuration Export")
      .setDescription(
        `Configuration exported for **${interaction.guild!.name}**`,
      )
      .addFields(
        {
          name: "Export Date",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "File Size",
          value: `${(buffer.length / 1024).toFixed(2)} KB`,
          inline: true,
        },
      )
      .setColor("#00FF00")
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [
        {
          attachment: buffer,
          name: `${interaction.guild!.name.replace(/[^a-zA-Z0-9]/g, "_")}_config_${Date.now()}.json`,
        },
      ],
    });
  } catch (error) {
    Logger.error("Error exporting configuration:" + ": " + error);
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Export Failed",
          "Failed to export configuration. Please try again.",
        ),
      ],
    });
  }
}

async function handleImport(
  interaction: ChatInputCommandInteraction,
  guildSettings: IGuildSettings,
) {
  const attachment = interaction.options.getAttachment("config-file", true);

  if (!attachment.name?.endsWith(".json")) {
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Invalid File",
          "Please provide a valid JSON configuration file.",
        ),
      ],
    });
    return;
  }

  if (attachment.size > 1024 * 1024) {
    // 1MB limit
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "File Too Large",
          "Configuration file must be smaller than 1MB.",
        ),
      ],
    });
    return;
  }

  try {
    const response = await fetch(attachment.url);
    const configText = await response.text();
    const importData = JSON.parse(configText);

    // Validate the import data structure
    if (!importData.guildSettings) {
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Invalid Config",
            "The configuration file is missing required data.",
          ),
        ],
      });
      return;
    }

    // Import guild settings
    if (importData.guildSettings) {
      const gs = importData.guildSettings;
      guildSettings.prefix = gs.prefix || ".";
      guildSettings.logCommands = gs.logCommands ?? true;
      guildSettings.logErrors = gs.logErrors ?? true;
      guildSettings.logEvents = gs.logEvents ?? true;
      guildSettings.welcomeChannel = gs.welcomeChannel || null;
      guildSettings.goodbyeChannel = gs.goodbyeChannel || null;
      guildSettings.modLogChannel = gs.modLogChannel || null;

      if (gs.autoModeration) {
        guildSettings.autoModeration = {
          ...guildSettings.autoModeration,
          ...gs.autoModeration,
        };
      }

      if (gs.permissions) {
        guildSettings.permissions = {
          ...guildSettings.permissions,
          ...gs.permissions,
        };
      }

      await guildSettings.save();
    }

    // Import ticket configuration
    if (importData.ticketConfig) {
      let ticketConfig = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!ticketConfig) {
        ticketConfig = await TicketConfig.createDefault(interaction.guild!.id);
      }

      const tc = importData.ticketConfig;
      ticketConfig.enabled = tc.enabled ?? false;
      ticketConfig.categoryId = tc.categoryId || undefined;
      ticketConfig.logChannelId = tc.logChannelId || undefined;
      ticketConfig.supportRoles = tc.supportRoles || [];
      ticketConfig.adminRoles = tc.adminRoles || [];
      ticketConfig.maxTicketsPerUser = tc.maxTicketsPerUser || 3;
      ticketConfig.autoDeleteAfter = tc.autoDeleteAfter || undefined;
      ticketConfig.dmUserOnClose = tc.dmUserOnClose ?? true;
      ticketConfig.mentionSupportOnCreate = tc.mentionSupportOnCreate ?? true;
      ticketConfig.allowUserClose = tc.allowUserClose ?? true;
      ticketConfig.panelTitle = tc.panelTitle || "🎫 Support Tickets";
      ticketConfig.panelDescription =
        tc.panelDescription ||
        "Create a support ticket by clicking the button below.";
      ticketConfig.panelColor = tc.panelColor || "#5865F2";

      if (tc.categories) {
        ticketConfig.categories = new Map(Object.entries(tc.categories));
      }

      if (tc.transcript) {
        ticketConfig.transcript = {
          ...ticketConfig.transcript,
          ...tc.transcript,
        };
      }

      await ticketConfig.save();
    }

    const importEmbed = new EmbedBuilder()
      .setTitle("✅ Configuration Imported")
      .setDescription("Configuration has been successfully imported!")
      .addFields(
        {
          name: "Imported From",
          value: importData.guildName || "Unknown Server",
          inline: true,
        },
        {
          name: "Export Date",
          value: importData.exportedAt
            ? `<t:${Math.floor(new Date(importData.exportedAt).getTime() / 1000)}:F>`
            : "Unknown",
          inline: true,
        },
        {
          name: "Import Date",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
      )
      .setColor("#00FF00")
      .setTimestamp();

    await interaction.editReply({ embeds: [importEmbed] });
  } catch (error) {
    Logger.error("Error importing configuration:" + ": " + error);
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Import Failed",
          "Failed to import configuration. Please ensure the file is valid.",
        ),
      ],
    });
  }
}
