import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import { WebhookLogger } from "../utils/webhooklogger";
import Ticket, { TicketStatus, TicketCategory } from "../models/Ticket";
import TicketConfig from "../models/TicketConfig";
import { Logger } from "../utils/logger";
import { Embeds } from "../utils/embeds";
import { TicketService } from "../services/TicketService";

export class TicketInteractionHandler {
  private ticketService: TicketService;

  private closingTickets: Set<string> = new Set();
  private deletingTickets: Set<string> = new Set();

  constructor() {
    this.ticketService = new TicketService();
  }

  public async handleInteraction(
    interaction:
      | ButtonInteraction
      | ModalSubmitInteraction
      | StringSelectMenuInteraction,
  ): Promise<void> {
    if (interaction.isButton()) {
      await this.handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await this.handleModalSubmit(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await this.handleCategorySelect(interaction);
    }
  }

  private async handleButtonInteraction(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const [action, ...args] = interaction.customId.split("_");

    switch (action) {
      case "ticket":
        const subAction = args[0];
        const ticketId = args.length > 1 ? args.slice(1).join("_") : undefined;
        switch (subAction) {
          case "create":
            await this.handleCreateTicket(
              interaction,
              args[1] as TicketCategory,
            );
            break;
          case "close":
            if (ticketId) {
              await this.handleCloseTicket(interaction, ticketId);
            }
            break;
          case "delete":
            if (ticketId) {
              await this.handleDeleteTicket(interaction, ticketId);
            }
            break;
        }
        break;
    }
  }

  private async handleModalSubmit(
    interaction: ModalSubmitInteraction,
  ): Promise<void> {
    try {
      const categoryId = interaction.customId.split("_").slice(2).join("_");

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const subject = interaction.fields.getTextInputValue("ticket_subject");
      const description =
        interaction.fields.getTextInputValue("ticket_description");

      const result = await this.ticketService.createTicket(
        interaction.guild!,
        interaction.user,
        categoryId as TicketCategory,
        subject,
        description,
      );

      if (result) {
        await interaction.editReply({
          embeds: [
            Embeds.success(
              "Ticket Created",
              `Your ticket has been created: <#${result.channel.id}>`,
            ),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Error Creating Ticket",
              "Could not create your ticket. This might be because you have the maximum number of open tickets or the bot is misconfigured.",
            ),
          ],
        });
      }
    } catch (error: any) {
      const errorMsg = `Error handling ticket modal submission in guild ${interaction.guild!.id}: ${error}`;
      Logger.error(errorMsg);
      WebhookLogger.logError(
        "TicketModalSubmit",
        errorMsg,
        error.stack || null,
        interaction.user.id,
        null,
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Error",
              "An unexpected error occurred while creating your ticket.",
            ),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Error",
              "An unexpected error occurred while creating your ticket.",
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  private async handleCategorySelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const categoryId = interaction.values[0] as TicketCategory;
    await this.handleCreateTicket(interaction, categoryId);
  }

  private async handleCreateTicket(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryId: TicketCategory,
  ): Promise<void> {
    try {
      const config = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!config) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Configuration Error",
              "Ticket system is not configured for this server.",
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const userTickets = await Ticket.findByUser(
        interaction.guild!.id,
        interaction.user.id,
      );
      if (
        userTickets.filter((t) => t.status !== TicketStatus.CLOSED).length >= 3
      ) {
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Too Many Tickets",
              "You already have the maximum number of open tickets (3).",
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${categoryId}`)
        .setTitle("Create Ticket");

      const subjectInput = new TextInputBuilder()
        .setCustomId("ticket_subject")
        .setLabel("Subject")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Brief description of your issue")
        .setRequired(true)
        .setMaxLength(100);

      const descriptionInput = new TextInputBuilder()
        .setCustomId("ticket_description")
        .setLabel("Description")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Please provide details about your issue")
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          descriptionInput,
        ),
      );

      await interaction.showModal(modal);
    } catch (error: any) {
      const errorMsg = `Error handling create ticket button in guild ${interaction.guild!.id}: ${error}`;
      Logger.error(errorMsg);
      WebhookLogger.logError(
        "TicketCreateButton",
        errorMsg,
        error.stack || null,
        interaction.user.id,
        categoryId,
      );
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            embeds: [
              Embeds.error(
                "Error",
                "An error occurred while processing your request. Please try again or contact an administrator.",
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        } catch (e) {
          Logger.error(`Failed to send error reply: ${e}`);
        }
      }
    }
  }

  private async handleCloseTicket(
    interaction: ButtonInteraction,
    ticketId: string,
  ): Promise<void> {
    if (this.closingTickets.has(ticketId)) {
      await interaction.reply({
        embeds: [
          Embeds.error("In Progress", "This ticket is already being closed."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    this.closingTickets.add(ticketId);
    try {
      const ticket = await Ticket.findOne({
        ticketId,
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.reply({
          embeds: [
            Embeds.error("Error", "Could not find the ticket to close."),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channel = await interaction
        .guild!.channels.fetch(ticket.channelId)
        .catch(() => null);

      if (!channel) {
        await Ticket.updateOne(
          { ticketId, guildId: interaction.guild!.id },
          { status: TicketStatus.CLOSED },
        );
        await interaction.reply({
          embeds: [Embeds.error("Error", "Ticket channel already deleted.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Acknowledge the interaction immediately.
      await interaction.reply({
        embeds: [
          Embeds.success("Success", "The ticket is being closed and archived."),
        ],
        flags: MessageFlags.Ephemeral,
      });

      // Perform background tasks.
      try {
        const closeDate = new Date();
        await ticket.updateOne({
          status: TicketStatus.CLOSED,
          closedBy: interaction.user.id,
          closedAt: closeDate,
        });
        ticket.closedBy = interaction.user.id;
        ticket.closedAt = closeDate;

        const config = await TicketConfig.findByGuild(interaction.guild!.id);
        if (config) {
          await TicketService.getInstance()
            .generateTranscript(channel as TextChannel, ticket, config)
            .catch((err) =>
              Logger.warn(
                `Failed to generate transcript for ticket ${ticket.ticketId}: ${err}`,
              ),
            );
        }

        // Delay deletion to ensure other operations complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await channel.delete(`Ticket closed by ${interaction.user.tag}`);
      } catch (error: any) {
        Logger.error(
          `Error during ticket close background tasks for ${ticketId}: ${error.message}`,
        );
      }
    } catch (error: any) {
      Logger.error(`Error in handleCloseTicket: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            embeds: [
              Embeds.error(
                "Error",
                "An unexpected error occurred while closing the ticket.",
              ),
            ],
            flags: MessageFlags.Ephemeral,
          })
          .catch((e) => Logger.error(`Failed to send final error reply: ${e}`));
      }
    } finally {
      this.closingTickets.delete(ticketId);
    }
  }

  private async handleDeleteTicket(
    interaction: ButtonInteraction,
    ticketId: string,
  ): Promise<void> {
    if (this.deletingTickets.has(ticketId)) {
      await interaction.reply({
        embeds: [
          Embeds.error("In Progress", "This ticket is already being deleted."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    this.deletingTickets.add(ticketId);
    try {
      const ticket = await Ticket.findOne({
        ticketId,
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.reply({
          embeds: [
            Embeds.error("Error", "Could not find the ticket to delete."),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Acknowledge the interaction immediately.
      await interaction.reply({
        embeds: [Embeds.success("Success", "The ticket is being deleted.")],
        flags: MessageFlags.Ephemeral,
      });

      // Perform background tasks.
      try {
        const channel = await interaction
          .guild!.channels.fetch(ticket.channelId)
          .catch(() => null);

        await ticket.deleteOne();

        if (channel) {
          // Delay deletion to ensure other operations complete
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await channel.delete(`Ticket deleted by ${interaction.user.tag}`);
        }
      } catch (error: any) {
        Logger.error(
          `Error during ticket delete background tasks for ${ticketId}: ${error.message}`,
        );
      }
    } catch (error: any) {
      Logger.error(`Error in handleDeleteTicket: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            embeds: [
              Embeds.error(
                "Error",
                "An unexpected error occurred while deleting the ticket.",
              ),
            ],
            flags: MessageFlags.Ephemeral,
          })
          .catch((e) => Logger.error(`Failed to send final error reply: ${e}`));
      }
    } finally {
      this.deletingTickets.delete(ticketId);
    }
  }

  private generateTranscript(ticket: any, messages: any[]): string {
    const formatTimestamp = (date: Date) => date.toISOString();
    let transcript = `Ticket Transcript for ticket-${ticket.ticketId}\n`;
    transcript += `Created by: ${ticket.authorName} (${ticket.authorId})\n`;
    transcript += `Date: ${formatTimestamp(new Date())}\n`;
    transcript += `──────────────────────────────────────────────────\n\n`;

    messages.forEach((msg) => {
      transcript += `[${formatTimestamp(msg.createdAt)}] ${msg.author.tag}: ${
        msg.content
      }\n`;
      msg.attachments.forEach((attachment: any) => {
        transcript += `[Attachment] ${attachment.url}\n`;
      });
      if (msg.embeds.length > 0) {
        transcript += `[Embed]\n`;
        msg.embeds.forEach((embed: any) => {
          transcript += `${embed.description}`;
        });
        transcript += `\n`;
      }
      transcript += `\n`;
    });
    return transcript;
  }
}
