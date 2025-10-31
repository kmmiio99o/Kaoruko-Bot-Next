import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
  AttachmentBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { Embeds } from "../utils/embeds";
import { Logger } from "../utils/logger";
import { TicketService } from "../services/TicketService";
import TicketConfig from "../models/TicketConfig";
import Ticket, { TicketCategory, TicketStatus } from "../models/Ticket";

export class TicketInteractionHandler {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = TicketService.getInstance();
  }

  async handleTicketInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      const customId = interaction.customId;
      const member = interaction.member as GuildMember;

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
      } else if (customId.startsWith("ticket_transcript_")) {
        await this.handleGenerateTranscript(interaction, customId);
      } else if (customId.startsWith("ticket_add_user_")) {
        await this.handleAddUser(interaction, customId);
      } else if (customId.startsWith("ticket_remove_user_")) {
        await this.handleRemoveUser(interaction, customId);
      } else if (customId === "confirm_close_ticket") {
        await this.handleConfirmClose(interaction);
      } else if (customId === "cancel_close_ticket") {
        await this.handleCancelClose(interaction);
      } else if (customId === "confirm_delete_ticket") {
        await this.handleConfirmDelete(interaction);
      } else if (customId === "cancel_delete_ticket") {
        await this.handleCancelDelete(interaction);
      }
    } catch (error) {
      Logger.error(`Error handling ticket interaction: ${error}`);

      const errorEmbed = Embeds.error(
        "Interaction Error",
        "An error occurred while processing your request. Please try again.",
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  }

  async handleCategorySelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    try {
      const categoryId = interaction.values[0] as TicketCategory;
      await this.handleCreateTicket(
        interaction as any,
        `ticket_create_${categoryId}`,
      );
    } catch (error) {
      Logger.error(`Error handling category selection: ${error}`);

      const errorEmbed = Embeds.error(
        "Selection Error",
        "An error occurred while processing your category selection. Please try again.",
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  }

  private async handleCreateTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const categoryId = customId.replace("ticket_create_", "") as TicketCategory;

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Configuration Error",
            "Ticket configuration not found. Please contact an administrator.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    // Check user's current open tickets
    const userTickets = await Ticket.find({
      guildId: interaction.guild!.id,
      authorId: interaction.user.id,
      status: {
        $in: [
          TicketStatus.OPEN,
          TicketStatus.IN_PROGRESS,
          TicketStatus.WAITING,
        ],
      },
    });

    if (userTickets.length >= config.maxTicketsPerUser) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Ticket Limit Reached",
            `You can only have ${config.maxTicketsPerUser} open tickets at a time.`,
          ),
        ],
        flags: 64,
      });
      return;
    }

    // Get category configuration
    const category = config.categories.get(categoryId);
    if (!category) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Invalid Category",
            "The selected ticket category is not available.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    // Check required roles
    const member = interaction.member as GuildMember;
    if (category.requiredRoles.length > 0) {
      const hasRequiredRole = category.requiredRoles.some((roleId) =>
        member.roles.cache.has(roleId),
      );

      if (!hasRequiredRole) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Access Denied",
              "You don't have the required role to create this type of ticket.",
            ),
          ],
          flags: 64,
        });
        return;
      }
    }

    // Show ticket creation modal
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
      .setPlaceholder("Detailed description of your issue...")
      .setMaxLength(1000)
      .setRequired(config.requireReason);

    const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      subjectInput,
    );
    const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      descriptionInput,
    );

    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);
  }

  private async createTicketDirect(
    interaction: any,
    categoryId: TicketCategory,
    subject: string,
    description: string,
  ): Promise<void> {
    await interaction.deferReply({ flags: 64 });

    const result = await this.ticketService.createTicket(
      interaction.guild!,
      interaction.user,
      categoryId,
      subject,
      description,
    );

    if (!result) {
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Ticket Creation Failed",
            "Failed to create ticket. Please try again.",
          ),
        ],
      });
      return;
    }

    const { ticket, channel } = result;

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Created")
      .setDescription(`Your ticket has been created successfully!`)
      .addFields(
        { name: "Ticket ID", value: ticket!.ticketId, inline: true },
        { name: "Subject", value: subject, inline: true },
        { name: "Channel", value: `${channel}`, inline: true },
      )
      .setColor("#00FF00")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleCloseTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_close_", "");

    const ticket = await Ticket.findOne({
      ticketId,
      guildId: interaction.guild!.id,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          Embeds.error("Ticket Not Found", "This ticket could not be found."),
        ],
        flags: 64,
      });
      return;
    }

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Configuration Error",
            "Ticket configuration not found.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canClose =
      (ticket.authorId === interaction.user.id && config.allowUserClose) ||
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      config.supportRoles.some((roleId) => member.roles.cache.has(roleId)) ||
      config.adminRoles.some((roleId) => member.roles.cache.has(roleId)) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!canClose) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Insufficient Permissions",
            "You don't have permission to close this ticket.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    // Show confirmation buttons instead of modal
    const confirmButton = new ButtonBuilder()
      .setCustomId("confirm_close_ticket")
      .setLabel("Confirm Close")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("✅");

    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel_close_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❌");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      confirmButton,
      cancelButton,
    );

    const embed = new EmbedBuilder()
      .setTitle("🔒 Close Ticket")
      .setDescription(
        `Are you sure you want to close ticket **${ticket.ticketId}**?\n\n` +
          `**Subject:** ${ticket.subject}\n` +
          `**Status:** ${ticket.status}\n` +
          `**Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>\n\n` +
          `This action will close the ticket and optionally generate a transcript.`,
      )
      .setColor("#FF6B35")
      .setTimestamp();

    // Store ticket ID in a way we can retrieve it
    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64,
    });

    // Store the ticket ID for confirmation handling
    (interaction as any).ticketToClose = ticketId;
  }

  private async handleConfirmClose(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const originalInteraction = interaction.message.interaction;
    if (!originalInteraction) {
      await interaction.reply({
        embeds: [
          Embeds.error("Error", "Could not find the original ticket to close."),
        ],
        flags: 64,
      });
      return;
    }

    // Find the ticket from the channel
    const ticket = await Ticket.findOne({
      channelId: interaction.channelId,
      guildId: interaction.guild!.id,
    });

    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Error", "Could not find the ticket to close.")],
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const success = await this.ticketService.closeTicket(
      interaction.guild!,
      ticket.ticketId,
      interaction.user,
      "Closed via button confirmation",
      true,
    );

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("✅ Ticket Closed")
        .setDescription(
          `Ticket **${ticket.ticketId}** has been closed successfully.\n\n` +
            `A transcript has been generated and saved.`,
        )
        .setColor("#00FF00")
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        components: [], // Remove buttons
      });

      // Update the original message to remove buttons
      try {
        await interaction.message.edit({
          embeds: interaction.message.embeds,
          components: [],
        });
      } catch (error) {
        Logger.error(`Failed to update original close message: ${error}`);
      }
    } else {
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Close Failed",
            "Failed to close the ticket. Please try again.",
          ),
        ],
      });
    }
  }

  private async handleCancelClose(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("❌ Close Cancelled")
      .setDescription("Ticket close operation has been cancelled.")
      .setColor("#6C757D")
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  }

  private async handleReopenTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_reopen_", "");

    await interaction.deferReply({ flags: 64 });

    const success = await this.ticketService.reopenTicket(
      interaction.guild!,
      ticketId,
      interaction.user,
    );

    if (success) {
      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Ticket Reopened",
            "The ticket has been successfully reopened.",
          ),
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [Embeds.error("Reopen Failed", "Failed to reopen the ticket.")],
      });
    }
  }

  private async handleDeleteTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_delete_", "");

    const ticket = await Ticket.findOne({
      ticketId,
      guildId: interaction.guild!.id,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          Embeds.error("Ticket Not Found", "This ticket could not be found."),
        ],
        flags: 64,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canDelete = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!canDelete) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Insufficient Permissions",
            "Only administrators can delete tickets.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirm_delete_ticket")
      .setLabel("Delete Permanently")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️");

    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel_delete_ticket")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      confirmButton,
      cancelButton,
    );

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Delete Ticket")
      .setDescription(
        "**WARNING:** This will permanently delete the ticket and its channel!\n\n" +
          "This action cannot be undone. Make sure to generate a transcript first if needed.",
      )
      .setColor("#FF0000");

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64,
    });
  }

  private async handleConfirmDelete(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const ticket = await Ticket.findOne({
      channelId: interaction.channelId,
      guildId: interaction.guild!.id,
    });

    if (!ticket) {
      await interaction.reply({
        embeds: [Embeds.error("Error", "Could not find the ticket to delete.")],
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const channel = interaction.guild!.channels.cache.get(ticket.channelId);
      if (channel) {
        await channel.delete("Ticket deleted by administrator");
      }

      await Ticket.deleteOne({ _id: ticket._id });

      // This reply won't be seen since the channel is deleted, but we should still send it
      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Ticket Deleted",
            "The ticket has been permanently deleted.",
          ),
        ],
      });
    } catch (error) {
      Logger.error(`Failed to delete ticket: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Delete Failed", "Failed to delete the ticket.")],
      });
    }
  }

  private async handleCancelDelete(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("❌ Delete Cancelled")
      .setDescription("Ticket deletion has been cancelled.")
      .setColor("#6C757D")
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  }

  private async handleClaimTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_claim_", "");

    const ticket = await Ticket.findOne({
      ticketId,
      guildId: interaction.guild!.id,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          Embeds.error("Ticket Not Found", "This ticket could not be found."),
        ],
        flags: 64,
      });
      return;
    }

    if (ticket.assignedTo) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Already Claimed",
            "This ticket has already been claimed by another staff member.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    const config = await TicketConfig.findByGuild(interaction.guild!.id);
    if (!config) return;

    const member = interaction.member as GuildMember;
    const canClaim =
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      config.supportRoles.some((roleId) => member.roles.cache.has(roleId)) ||
      config.adminRoles.some((roleId) => member.roles.cache.has(roleId));

    if (!canClaim) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Insufficient Permissions",
            "You don't have permission to claim tickets.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    ticket.assignedTo = interaction.user.id;
    ticket.assignedBy = interaction.user.id;
    ticket.assignedAt = new Date();
    await ticket.save();

    const embed = new EmbedBuilder()
      .setTitle("🏷️ Ticket Claimed")
      .setDescription(`This ticket has been claimed by ${interaction.user}`)
      .addFields(
        { name: "Ticket ID", value: ticket.ticketId, inline: true },
        { name: "Status", value: ticket.status, inline: true },
        {
          name: "Claimed At",
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
          inline: true,
        },
      )
      .setColor("#FFA500")
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_unclaim_${ticketId}`)
        .setLabel("Unclaim")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🏷️"),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticketId}`)
        .setLabel("Download Transcript")
        .setStyle(ButtonStyle.Success)
        .setEmoji("📄"),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  private async handleUnclaimTicket(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_unclaim_", "");

    const ticket = await Ticket.findOne({
      ticketId,
      guildId: interaction.guild!.id,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          Embeds.error("Ticket Not Found", "This ticket could not be found."),
        ],
        flags: 64,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const canUnclaim =
      ticket.assignedTo === interaction.user.id ||
      member.permissions.has(PermissionFlagsBits.Administrator);

    if (!canUnclaim) {
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Insufficient Permissions",
            "You can only unclaim your own tickets or must be an administrator.",
          ),
        ],
        flags: 64,
      });
      return;
    }

    ticket.assignedTo = undefined;
    ticket.assignedBy = undefined;
    ticket.assignedAt = undefined;
    await ticket.save();

    const embed = new EmbedBuilder()
      .setTitle("🏷️ Ticket Unclaimed")
      .setDescription(
        "This ticket is now available for other staff members to claim.",
      )
      .setColor("#6C757D")
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketId}`)
        .setLabel("Claim")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏷️"),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticketId}`)
        .setLabel("Download Transcript")
        .setStyle(ButtonStyle.Success)
        .setEmoji("📄"),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  private async handleAddUser(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    // TODO: Implement user addition functionality with modal
    await interaction.reply({
      embeds: [
        Embeds.error(
          "Not Implemented",
          "User addition functionality is not yet implemented.",
        ),
      ],
      flags: 64,
    });
  }

  private async handleRemoveUser(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    // TODO: Implement user removal functionality with modal
    await interaction.reply({
      embeds: [
        Embeds.error(
          "Not Implemented",
          "User removal functionality is not yet implemented.",
        ),
      ],
      flags: 64,
    });
  }

  private async handleGenerateTranscript(
    interaction: ButtonInteraction,
    customId: string,
  ): Promise<void> {
    const ticketId = customId.replace("ticket_transcript_", "");

    await interaction.deferReply({ flags: 64 });

    try {
      const ticket = await Ticket.findOne({
        ticketId,
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Ticket Not Found", "This ticket could not be found."),
          ],
        });
        return;
      }

      const config = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!config) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Configuration Error",
              "Ticket configuration not found.",
            ),
          ],
        });
        return;
      }

      // Check permissions
      const member = interaction.member as GuildMember;
      const canDownloadTranscript =
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        config.supportRoles.some((roleId) => member.roles.cache.has(roleId)) ||
        config.adminRoles.some((roleId) => member.roles.cache.has(roleId)) ||
        member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!canDownloadTranscript) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Insufficient Permissions",
              "You don't have permission to download transcripts.",
            ),
          ],
        });
        return;
      }

      // Generate transcript
      const channel = interaction.guild!.channels.cache.get(ticket.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Channel Error",
              "Could not find the ticket channel or it's not a text channel.",
            ),
          ],
        });
        return;
      }

      // Fetch recent messages (last 100)
      const messages = await channel.messages.fetch({ limit: 100 });
      const messageArray = Array.from(messages.values()).reverse();

      // Generate HTML transcript
      const transcriptHtml = this.generateHtmlTranscript(
        ticket,
        messageArray,
        interaction.guild!.name,
      );

      // Create attachment
      const attachment = new AttachmentBuilder(
        Buffer.from(transcriptHtml, "utf-8"),
        {
          name: `ticket-${ticket.ticketId}-transcript.html`,
          description: `Transcript for ticket ${ticket.ticketId}`,
        },
      );

      const embed = new EmbedBuilder()
        .setTitle("📄 Transcript Generated")
        .setDescription(
          `Transcript for ticket **${ticket.ticketId}** has been generated.\n\n` +
            `**Subject:** ${ticket.subject}\n` +
            `**Status:** ${ticket.status}\n` +
            `**Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>\n` +
            `**Messages:** ${messageArray.length}`,
        )
        .setColor("#4CAF50")
        .setTimestamp()
        .setFooter({
          text: `Generated by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });

      Logger.info(
        `Transcript generated for ticket ${ticketId} by user ${interaction.user.id} in guild ${interaction.guild!.id}`,
      );
    } catch (error) {
      Logger.error(
        `Error generating transcript for ticket ${ticketId}: ${error}`,
      );

      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Transcript Error",
            "An error occurred while generating the transcript. Please try again.",
          ),
        ],
      });
    }
  }

  private generateHtmlTranscript(
    ticket: any,
    messages: any[],
    guildName: string,
  ): string {
    const formatDate = (date: Date) => {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket ${ticket.ticketId} - Transcript</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: #40444b;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .header {
            background-color: #5865f2;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .ticket-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .info-item {
            background-color: #2f3136;
            padding: 10px;
            border-radius: 5px;
        }
        .info-label {
            font-weight: bold;
            color: #b9bbbe;
            font-size: 12px;
            text-transform: uppercase;
        }
        .info-value {
            color: #dcddde;
            margin-top: 5px;
        }
        .messages {
            margin-top: 30px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #36393f;
            border-radius: 8px;
            border-left: 3px solid #5865f2;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 10px;
            background-color: #5865f2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
        }
        .author {
            font-weight: bold;
            margin-right: 10px;
        }
        .timestamp {
            color: #72767d;
            font-size: 12px;
        }
        .content {
            color: #dcddde;
            word-wrap: break-word;
        }
        .attachment {
            background-color: #2f3136;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            color: #00d166;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #72767d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket Transcript</h1>
            <p>Guild: ${escapeHtml(guildName)}</p>
        </div>

        <div class="ticket-info">
            <div class="info-item">
                <div class="info-label">Ticket ID</div>
                <div class="info-value">${escapeHtml(ticket.ticketId)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Subject</div>
                <div class="info-value">${escapeHtml(ticket.subject)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value">${escapeHtml(ticket.category)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">${escapeHtml(ticket.status)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Created</div>
                <div class="info-value">${formatDate(ticket.createdAt)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Author</div>
                <div class="info-value">${escapeHtml(ticket.authorName)}</div>
            </div>
        </div>

        <div class="messages">
            <h2>Messages (${messages.length})</h2>
            ${messages
              .map(
                (message) => `
                <div class="message">
                    <div class="message-header">
                        <div class="avatar">${message.author.username ? message.author.username.charAt(0).toUpperCase() : "U"}</div>
                        <div class="author">${escapeHtml(message.author.username || "Unknown User")}</div>
                        <div class="timestamp">${formatDate(message.createdAt)}</div>
                    </div>
                    <div class="content">${escapeHtml(message.content || "No content")}</div>
                    ${
                      message.attachments.size > 0
                        ? Array.from(message.attachments.values())
                            .map(
                              (att) => `
                        <div class="attachment">📎 ${escapeHtml((att as any).name)} (${(att as any).size} bytes)</div>
                    `,
                            )
                            .join("")
                        : ""
                    }
                </div>
            `,
              )
              .join("")}
        </div>

        <div class="footer">
            <p>Generated on ${formatDate(new Date())} | Total Messages: ${messages.length}</p>
            <p>This transcript was generated by the Kaoruko Bot ticket system</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // Handle modal submissions
  async handleModalSubmit(interaction: any): Promise<void> {
    try {
      const customId = interaction.customId;

      if (customId.startsWith("ticket_modal_")) {
        await this.handleTicketModalSubmit(interaction);
      } else if (customId.startsWith("close_reason_")) {
        await this.handleCloseReasonSubmit(interaction);
      }
    } catch (error) {
      Logger.error(`Error handling modal submit: ${error}`);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Modal Error",
              "An error occurred processing your request.",
            ),
          ],
          flags: 64,
        });
      }
    }
  }

  private async handleTicketModalSubmit(interaction: any): Promise<void> {
    const categoryId = interaction.customId.replace(
      "ticket_modal_",
      "",
    ) as TicketCategory;
    const subject = interaction.fields.getTextInputValue("ticket_subject");
    const description =
      interaction.fields.getTextInputValue("ticket_description") || "";

    await this.createTicketDirect(
      interaction,
      categoryId,
      subject,
      description,
    );
  }

  private async handleCloseReasonSubmit(interaction: any): Promise<void> {
    const ticketId = interaction.customId.replace("close_reason_", "");
    const reason =
      interaction.fields.getTextInputValue("close_reason") ||
      "No reason provided";

    await interaction.deferReply({ flags: 64 });

    const success = await this.ticketService.closeTicket(
      interaction.guild!,
      ticketId,
      interaction.user,
      reason,
      true,
    );

    if (success) {
      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Ticket Closed",
            `The ticket has been successfully closed.\n**Reason:** ${reason}`,
          ),
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Close Failed",
            "Failed to close the ticket. Please try again.",
          ),
        ],
      });
    }
  }
}
