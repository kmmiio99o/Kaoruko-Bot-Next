import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ComponentType,
  StringSelectMenuBuilder,
  GuildMember,
} from "discord.js";
import { TicketService } from "../services/TicketService";
import TicketConfig from "../models/TicketConfig";
import Ticket, { TicketCategory, TicketStatus } from "../models/Ticket";
import { Embeds } from "../utils/embeds";
import { Logger } from "../utils/logger";

export class TicketInteractionHandler {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = TicketService.getInstance();
  }

  async handleTicketInteraction(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) return;

    const customId = interaction.customId;
    const member = interaction.member as GuildMember;

    try {
      if (customId.startsWith("ticket_create_")) {
        await this.handleCreateTicket(interaction, customId);
      } else if (customId.startsWith("ticket_close_")) {
        await this.handleCloseTicket(interaction, customId);
      } else if (customId.startsWith("ticket_reopen_")) {
        await this.handleReopenTicket(interaction, customId);
      } else if (customId.startsWith("ticket_delete_")) {
        await this.handleDeleteTicket(interaction, customId);
      } else if (customId.startsWith("ticket_claim_")) {
        await this.handleClaimTicket(interaction, customId);
      } else if (customId.startsWith("ticket_unclaim_")) {
        await this.handleUnclaimTicket(interaction, customId);
      } else if (customId.startsWith("ticket_add_user_")) {
        await this.handleAddUser(interaction, customId);
      } else if (customId.startsWith("ticket_remove_user_")) {
        await this.handleRemoveUser(interaction, customId);
      } else if (customId.startsWith("ticket_transcript_")) {
        await this.handleGenerateTranscript(interaction, customId);
      }
    } catch (error) {
      Logger.error("Error handling ticket interaction:", error);

      const errorEmbed = Embeds.error(
        "Interaction Error",
        "An error occurred while processing your request. Please try again or contact an administrator."
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else if (!interaction.replied) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }

  private async handleCreateTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const categoryId = customId.replace("ticket_create_", "");

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config || !config.enabled) {
      await interaction.reply({
        embeds: [Embeds.error("System Disabled", "The ticket system is currently disabled.")],
        ephemeral: true
      });
      return;
    }

    // Check if user already has max tickets
    const userTickets = await Ticket.find({
      guildId: interaction.guild!.id,
      authorId: interaction.user.id,
      status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING] }
    });

    if (userTickets.length >= config.maxTicketsPerUser) {
      await interaction.reply({
        embeds: [Embeds.error(
          "Ticket Limit Reached",
          `You already have ${userTickets.length} open tickets. Please close some before creating new ones.`
        )],
        ephemeral: true
      });
      return;
    }

    const category = config.categories.get(categoryId);
    if (!category) {
      await interaction.reply({
        embeds: [Embeds.error("Invalid Category", "The selected category no longer exists.")],
        ephemeral: true
      });
      return;
    }

    // Check if user has required roles for this category
    if (category.requiredRoles && category.requiredRoles.length > 0) {
      const member = interaction.member as GuildMember;
      const hasRequiredRole = category.requiredRoles.some(roleId =>
        member.roles.cache.has(roleId)
      );

      if (!hasRequiredRole) {
        await interaction.reply({
          embeds: [Embeds.error(
            "Missing Permissions",
            "You don't have the required roles to create tickets in this category."
          )],
          ephemeral: true
        });
        return;
      }
    }

    // Show modal for ticket details if required
    if (config.requireReason || category.name.toLowerCase().includes("report")) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${categoryId}`)
        .setTitle(`Create ${category.name} Ticket`);

      const subjectInput = new TextInputBuilder()
        .setCustomId("ticket_subject")
        .setLabel("Subject")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Brief description of your issue")
        .setMaxLength(100)
        .setRequired(true);

      const descriptionInput = new TextInputBuilder()
        .setCustomId("ticket_description")
        .setLabel("Description")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Detailed description of your issue or request")
        .setMaxLength(1000)
        .setRequired(config.requireReason);

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput);
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);

      modal.addComponents(firstRow, secondRow);

      await interaction.showModal(modal);
      return;
    }

    // Create ticket directly
    await this.createTicketDirect(interaction, categoryId as TicketCategory);
  }

  private async createTicketDirect(
    interaction: ButtonInteraction,
    category: TicketCategory,
    subject?: string,
    description?: string
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const result = await this.ticketService.createTicket(
      interaction.guild!,
      interaction.user,
      category,
      subject,
      description
    );

    if (!result) {
      await interaction.editReply({
        embeds: [Embeds.error("Creation Failed", "Failed to create your ticket. Please try again.")]
      });
      return;
    }

    const { ticket, channel } = result;

    const embed = new EmbedBuilder()
      .setTitle("✅ Ticket Created")
      .setDescription(`Your ticket has been created successfully!`)
      .addFields(
        { name: "Ticket ID", value: ticket.ticketId, inline: true },
        { name: "Category", value: ticket.category, inline: true },
        { name: "Channel", value: `${channel}`, inline: true }
      )
      .setColor("#00FF00")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleCloseTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_close_", "");

    const ticket = await Ticket.findOne({ ticketId, guildId: interaction.guild!.id });
    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Ticket Not Found", "This ticket could not be found.")],
        ephemeral: true
      });
      return;
    }

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config) {
      await interaction.reply({
        embeds: [Embeds.error("Configuration Error", "Ticket configuration not found.")],
        ephemeral: true
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canClose =
      ticket.authorId === interaction.user.id && config.allowUserClose ||
      config.hasPermission(interaction.user.id, member.roles.cache.map(r => r.id), 'closeAnyTicket') ||
      config.supportRoles.some(roleId => member.roles.cache.has(roleId)) ||
      config.adminRoles.some(roleId => member.roles.cache.has(roleId)) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!canClose) {
      await interaction.reply({
        embeds: [Embeds.error("Insufficient Permissions", "You don't have permission to close this ticket.")],
        ephemeral: true
      });
      return;
    }

    // Show reason modal
    const modal = new ModalBuilder()
      .setCustomId(`close_reason_${ticketId}`)
      .setTitle("Close Ticket");

    const reasonInput = new TextInputBuilder()
      .setCustomId("close_reason")
      .setLabel("Reason for closing (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Provide a reason for closing this ticket...")
      .setMaxLength(500)
      .setRequired(false);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  private async handleReopenTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_reopen_", "");

    await interaction.deferReply({ ephemeral: true });

    const success = await this.ticketService.reopenTicket(
      interaction.guild!,
      ticketId,
      interaction.user
    );

    if (success) {
      await interaction.editReply({
        embeds: [Embeds.success("Ticket Reopened", "The ticket has been successfully reopened.")]
      });
    } else {
      await interaction.editReply({
        embeds: [Embeds.error("Reopen Failed", "Failed to reopen the ticket.")]
      });
    }
  }

  private async handleDeleteTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_delete_", "");

    const ticket = await Ticket.findOne({ ticketId, guildId: interaction.guild!.id });
    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Ticket Not Found", "This ticket could not be found.")],
        ephemeral: true
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canDelete =
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      member.permissions.has(PermissionFlagsBits.Administrator);

    if (!canDelete) {
      await interaction.reply({
        embeds: [Embeds.error("Insufficient Permissions", "You don't have permission to delete this ticket.")],
        ephemeral: true
      });
      return;
    }

    // Confirmation
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_delete_${ticketId}`)
      .setLabel("Confirm Delete")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️");

    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel_delete")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(confirmButton, cancelButton);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Confirm Deletion")
      .setDescription(`Are you sure you want to delete this ticket?\n\n**Ticket ID:** ${ticketId}\n**Author:** <@${ticket.authorId}>\n\n**This action cannot be undone!**`)
      .setColor("#FF0000")
      .setTimestamp();

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    try {
      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
      });

      if (confirmation.customId === `confirm_delete_${ticketId}`) {
        const channel = interaction.guild!.channels.cache.get(ticket.channelId);
        if (channel) {
          await channel.delete("Ticket deleted by moderator");
        }

        await Ticket.deleteOne({ ticketId });

        const deleteEmbed = new EmbedBuilder()
          .setTitle("✅ Ticket Deleted")
          .setDescription("The ticket and its channel have been deleted.")
          .setColor("#00FF00")
          .setTimestamp();

        await confirmation.update({ embeds: [deleteEmbed], components: [] });
      } else {
        const cancelEmbed = new EmbedBuilder()
          .setTitle("❌ Deletion Cancelled")
          .setDescription("Ticket deletion has been cancelled.")
          .setColor("#FF0000")
          .setTimestamp();

        await confirmation.update({ embeds: [cancelEmbed], components: [] });
      }
    } catch {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⏰ Deletion Timeout")
        .setDescription("Ticket deletion confirmation timed out.")
        .setColor("#FF0000")
        .setTimestamp();

      await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
  }

  private async handleClaimTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_claim_", "");

    const ticket = await Ticket.findOne({ ticketId, guildId: interaction.guild!.id });
    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Ticket Not Found", "This ticket could not be found.")],
        ephemeral: true
      });
      return;
    }

    if (ticket.assignedTo) {
      await interaction.reply({
        embeds: [Embeds.error("Already Claimed", "This ticket is already claimed by another staff member.")],
        ephemeral: true
      });
      return;
    }

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config) return;

    const member = interaction.member as GuildMember;
    const canClaim =
      config.supportRoles.some(roleId => member.roles.cache.has(roleId)) ||
      config.adminRoles.some(roleId => member.roles.cache.has(roleId)) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!canClaim) {
      await interaction.reply({
        embeds: [Embeds.error("Insufficient Permissions", "You don't have permission to claim this ticket.")],
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    await ticket.assignTo(interaction.user.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("✋ Ticket Claimed")
      .setDescription(`This ticket has been claimed by ${interaction.user}`)
      .addFields(
        { name: "Ticket ID", value: ticket.ticketId, inline: true },
        { name: "Claimed By", value: `${interaction.user}`, inline: true },
        { name: "Claimed At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setColor("#FFA500")
      .setTimestamp();

    // Update buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.ticketId}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId(`ticket_unclaim_${ticket.ticketId}`)
          .setLabel("Unclaim Ticket")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🚫")
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async handleUnclaimTicket(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_unclaim_", "");

    const ticket = await Ticket.findOne({ ticketId, guildId: interaction.guild!.id });
    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Ticket Not Found", "This ticket could not be found.")],
        ephemeral: true
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canUnclaim =
      ticket.assignedTo === interaction.user.id ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!canUnclaim) {
      await interaction.reply({
        embeds: [Embeds.error("Insufficient Permissions", "You can only unclaim tickets you have claimed.")],
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    ticket.assignedTo = undefined;
    ticket.assignedBy = undefined;
    ticket.assignedAt = undefined;
    await ticket.save();

    const embed = new EmbedBuilder()
      .setTitle("🚫 Ticket Unclaimed")
      .setDescription(`This ticket has been unclaimed by ${interaction.user}`)
      .setColor("#FF0000")
      .setTimestamp();

    // Update buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.ticketId}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticket.ticketId}`)
          .setLabel("Claim Ticket")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✋")
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async handleAddUser(interaction: ButtonInteraction, customId: string): Promise<void> {
    // This would typically show a user select menu
    // For now, we'll just show an info message
    await interaction.reply({
      embeds: [Embeds.info("Add User", "Use `/ticket add-user @user` to add users to this ticket.")],
      ephemeral: true
    });
  }

  private async handleRemoveUser(interaction: ButtonInteraction, customId: string): Promise<void> {
    // This would typically show a user select menu
    // For now, we'll just show an info message
    await interaction.reply({
      embeds: [Embeds.info("Remove User", "Use `/ticket remove-user @user` to remove users from this ticket.")],
      ephemeral: true
    });
  }

  private async handleGenerateTranscript(interaction: ButtonInteraction, customId: string): Promise<void> {
    const ticketId = customId.replace("ticket_transcript_", "");

    await interaction.reply({
      embeds: [Embeds.info("Transcript", "Transcript generation is not yet implemented. This feature will be available soon!")],
      ephemeral: true
    });
  }

  // Handle modal submissions
  async handleModalSubmit(interaction: any): Promise<void> {
    const customId = interaction.customId;

    if (customId.startsWith("ticket_modal_")) {
      await this.handleTicketModalSubmit(interaction);
    } else if (customId.startsWith("close_reason_")) {
      await this.handleCloseReasonSubmit(interaction);
    }
  }

  private async handleTicketModalSubmit(interaction: any): Promise<void> {
    const categoryId = interaction.customId.replace("ticket_modal_", "") as TicketCategory;
    const subject = interaction.fields.getTextInputValue("ticket_subject");
    const description = interaction.fields.getTextInputValue("ticket_description");

    await this.createTicketDirect(interaction, categoryId, subject, description);
  }

  private async handleCloseReasonSubmit(interaction: any): Promise<void> {
    const ticketId = interaction.customId.replace("close_reason_", "");
    const reason = interaction.fields.getTextInputValue("close_reason") || undefined;

    await interaction.deferReply({ ephemeral: true });

    const success = await this.ticketService.closeTicket(
      interaction.guild!,
      ticketId,
      interaction.user,
      reason,
      true
    );

    if (success) {
      await interaction.editReply({
        embeds: [Embeds.success("Ticket Closed", "The ticket has been successfully closed.")]
      });
    } else {
      await interaction.editReply({
        embeds: [Embeds.error("Close Failed", "Failed to close the ticket.")]
      });
    }
  }
}
