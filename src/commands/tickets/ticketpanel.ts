import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";
import TicketConfig from "../../models/TicketConfig";
import { TicketService } from "../../services/TicketService";

export const command: ICommand = {
  name: "ticketpanel",
  description: "Send the ticket creation panel to a channel",
  category: "tickets",
  slashCommand: true,
  prefixCommand: false,

  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Send the ticket creation panel to a channel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "The channel to send the panel to (defaults to current channel)",
        )
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async run(interaction?: ChatInputCommandInteraction) {
    if (!interaction || !interaction.guild || !interaction.member) {
      return;
    }

    try {
      await interaction.deferReply({ flags: 64 });

      const targetChannel = (interaction.options.getChannel("channel") ||
        interaction.channel) as TextChannel;

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Invalid Channel",
              "Please specify a valid text channel or use this command in a text channel.",
            ),
          ],
        });
        return;
      }

      // Check if user has permission to manage channels
      const member = interaction.member as any;
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Insufficient Permissions",
              "You need the `Manage Channels` permission to use this command.",
            ),
          ],
        });
        return;
      }

      // Get or create ticket configuration
      let config = await TicketConfig.findByGuild(interaction.guild.id);

      if (!config) {
        config = await TicketConfig.createDefault(interaction.guild.id);
        Logger.info(
          `Created default ticket config for guild ${interaction.guild.id}`,
        );
      }

      if (!config.enabled) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Ticket System Disabled",
              "The ticket system is currently disabled for this server. Use `/ticketconfig enable:true` to enable it first.",
            ),
          ],
        });
        return;
      }

      // Create the ticket panel
      const ticketService = TicketService.getInstance();
      const panelMessage = await ticketService.createTicketPanel(
        interaction.guild,
        targetChannel,
        config,
      );

      if (!panelMessage) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Failed to Create Panel",
              "There was an error creating the ticket panel. Please try again.",
            ),
          ],
        });
        return;
      }

      // Success response
      const embed = new EmbedBuilder()
        .setTitle("✅ Ticket Panel Created")
        .setDescription(
          `The ticket panel has been successfully sent to ${targetChannel}`,
        )
        .addFields(
          { name: "Channel", value: `${targetChannel}`, inline: true },
          { name: "Message ID", value: panelMessage.id, inline: true },
          {
            name: "Categories",
            value: config.categories.size.toString(),
            inline: true,
          },
        )
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log the action
      Logger.info(
        `Ticket panel created in channel ${targetChannel.id} by user ${interaction.user.id} in guild ${interaction.guild.id}`,
      );
    } catch (error) {
      Logger.error(`Error in ticketpanel command: ${error}`);

      const errorEmbed = Embeds.error(
        "Command Error",
        "An unexpected error occurred while creating the ticket panel. Please try again or contact an administrator.",
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  },
};
