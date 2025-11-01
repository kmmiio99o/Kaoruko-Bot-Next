import {
  ButtonInteraction,
  ModalSubmitInteraction,
  GuildMember,
  TextChannel,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  ButtonStyle,
  TextInputStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
} from "discord.js";
import {
  default as Ticket,
  ITicket,
  TicketStatus,
  TicketCategory,
} from "../models/Ticket";
import { default as TicketConfig, ITicketConfig } from "../models/TicketConfig";
import { Logger } from "../utils/logger";
import { Embeds } from "../utils/embeds";
import { TicketService } from "../services/TicketService";

export class TicketInteractionHandler {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  async handleTicketInteraction(
    interaction: ButtonInteraction | ModalSubmitInteraction,
  ): Promise<void> {
    const customId = interaction.customId;

    try {
      if (customId.startsWith("ticket_create_")) {
        await this.handleCreateTicket(interaction as ButtonInteraction);
      } else if (customId.startsWith("ticket_close_")) {
        await this.handleCloseTicket(interaction as ButtonInteraction);
      } else if (customId.startsWith("ticket_delete_")) {
        await this.handleTicketDelete(interaction as ButtonInteraction);
      } else if (customId.startsWith("ticket_reopen_")) {
        await this.handleReopenTicket(interaction as ButtonInteraction);
      } else if (customId.startsWith("ticket_transcript_")) {
        await this.handleGenerateTranscript(interaction as ButtonInteraction);
      } else if (customId.startsWith("ticket_category_")) {
        await this.handleCategorySelect(interaction as ButtonInteraction);
      }
    } catch (error) {
      Logger.error(`Error handling ticket interaction: ${error}`);
      const errorEmbed = Embeds.error(
        "Error",
        "An error occurred while processing your request.",
      );
      if (interaction.isButton()) {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  }

  private async handleCreateTicket(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const categoryId = interaction.customId.replace(
        "ticket_create_",
        "",
      ) as TicketCategory;

      const config = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!config) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Configuration Error",
              "Ticket system is not configured for this server.",
            ),
          ],
        });
        return;
      }

      // Check if user has an open ticket
      const userTickets = await Ticket.find({
        guildId: interaction.guild!.id,
        authorId: interaction.user.id,
        status: {
          $in: ["OPEN", "ON_HOLD"],
        },
      });

      if (userTickets.length >= config.maxTicketsPerUser) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Ticket Limit Reached",
              `You can only have ${config.maxTicketsPerUser} open ticket(s) at a time.`,
            ),
          ],
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

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        subjectInput,
      );
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        descriptionInput,
      );

      modal.addComponents(firstRow, secondRow);
      await interaction.showModal(modal);
    } catch (error) {
      Logger.error(`Error creating ticket modal: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Error", "Failed to create ticket modal.")],
      });
    }
  }

  private async handleTicketDelete(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await Ticket.findOne({
        ticketId: interaction.customId.replace("ticket_delete_", ""),
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Error", "Could not find the ticket to delete."),
          ],
        });
        return;
      }

      const member = interaction.member as GuildMember;
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Insufficient Permissions",
              "Only administrators can delete tickets.",
            ),
          ],
        });
        return;
      }

      // Generate transcript before deletion
      const channel = interaction.guild!.channels.cache.get(
        ticket.channelId,
      ) as TextChannel;

      if (channel?.isTextBased()) {
        const messages = await channel.messages.fetch({ limit: 100 });
        const messageArray = Array.from(messages.values()).reverse();

        // Generate both transcripts
        const jsonTranscript = this.generateTranscript(
          ticket,
          messageArray,
          interaction.guild!.name,
        );
        const logTranscript = this.generateLogTranscript(
          ticket,
          messageArray,
          interaction.guild!.name,
        );

        // Save transcripts as attachments
        const transcriptAttachment = new AttachmentBuilder(
          Buffer.from(jsonTranscript),
          {
            name: `ticket-${ticket.ticketId}-transcript.json`,
          },
        );

        // Send to log channel if configured
        const config = await TicketConfig.findByGuild(interaction.guild!.id);
        if (config?.logChannelId) {
          const logChannel = interaction.guild!.channels.cache.get(
            config.logChannelId,
          ) as TextChannel;

          if (logChannel?.isTextBased()) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("🗑️ Ticket Deleted")
                  .setDescription(logTranscript)
                  .setColor("#ff0000")
                  .addFields(
                    { name: "Ticket ID", value: ticket.ticketId, inline: true },
                    {
                      name: "Deleted By",
                      value: interaction.user.tag,
                      inline: true,
                    },
                    { name: "Category", value: ticket.category, inline: true },
                  )
                  .setTimestamp(),
              ],
              files: [transcriptAttachment],
            });
          }
        }

        await channel.delete(`Ticket deleted by ${interaction.user.tag}`);
      }

      await Ticket.deleteOne({ _id: ticket._id });

      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Ticket Deleted",
            "The ticket has been permanently deleted. A transcript has been saved to the log channel.",
          ),
        ],
      });

      Logger.info(
        `Successfully deleted ticket ${ticket.ticketId} with transcript`,
      );
    } catch (error) {
      Logger.error(`Failed to delete ticket: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Delete Failed", "Failed to delete the ticket.")],
      });
    }
  }

  private generateTranscript(
    ticket: any,
    messages: Message[],
    guildName: string,
  ): string {
    const transcript = {
      metadata: {
        guildName,
        generatedAt: new Date().toISOString(),
        messageCount: messages.length,
      },
      ticket: {
        id: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        author: ticket.authorName,
      },
      messages: messages.map((msg) => ({
        author: {
          id: msg.author.id,
          username: msg.author.username,
          discriminator: msg.author.discriminator,
        },
        content: msg.content || "",
        timestamp: msg.createdAt.toISOString(),
        attachments: Array.from(msg.attachments.values()).map((att) => ({
          name: att.name,
          url: att.url,
          size: att.size,
        })),
      })),
    };

    return JSON.stringify(transcript, null, 2);
  }

  private generateLogTranscript(
    ticket: any,
    messages: Message[],
    guildName: string,
  ): string {
    const formatTimestamp = (date: Date) =>
      `<t:${Math.floor(date.getTime() / 1000)}:F>`;

    let logTranscript = `## Ticket Information\n`;
    logTranscript += `**Guild:** ${guildName}\n`;
    logTranscript += `**ID:** ${ticket.ticketId}\n`;
    logTranscript += `**Subject:** ${ticket.subject}\n`;
    logTranscript += `**Category:** ${ticket.category}\n`;
    logTranscript += `**Status:** ${ticket.status}\n`;
    logTranscript += `**Created:** ${formatTimestamp(ticket.createdAt)}\n`;
    logTranscript += `**Author:** ${ticket.authorName}\n\n`;

    logTranscript += `## Messages (${messages.length})\n\n`;

    messages.forEach((msg) => {
      logTranscript += `### ${msg.author.username} (${formatTimestamp(
        msg.createdAt,
      )})\n`;
      logTranscript += msg.content ? `${msg.content}\n` : "*No content*\n";

      if (msg.attachments.size > 0) {
        logTranscript += "\n**Attachments:**\n";
        msg.attachments.forEach((att) => {
          logTranscript += `- 📎 [${att.name}](${att.url}) (${Math.round(
            att.size / 1024,
          )}KB)\n`;
        });
      }
      logTranscript += "\n";
    });

    return logTranscript;
  }

  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.customId.startsWith("ticket_modal_")) {
      return;
    }

    const categoryId = interaction.customId.replace(
      "ticket_modal_",
      "",
    ) as TicketCategory;
    const subject = interaction.fields.getTextInputValue("ticket_subject");
    const description =
      interaction.fields.getTextInputValue("ticket_description");

    try {
      await interaction.deferReply({ ephemeral: true });
      const result = await this.ticketService.createTicket(
        interaction.guild!,
        interaction.user,
        categoryId,
        subject,
        description,
      );

      if (result && result.channel) {
        await interaction.editReply({
          embeds: [
            Embeds.success(
              "Ticket Created",
              `Your ticket has been created: ${result.channel}`,
            ),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [Embeds.error("Creation Failed", "Failed to create ticket.")],
        });
      }
    } catch (error) {
      Logger.error(`Error creating ticket: ${error}`);
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Error",
            "An error occurred while creating your ticket.",
          ),
        ],
      });
    }
  }

  public async handleCategorySelect(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const categoryId = interaction.customId.replace(
        "ticket_category_",
        "",
      ) as TicketCategory;

      const config = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!config || !config.categories.has(categoryId)) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Invalid Category",
              "This ticket category is not available.",
            ),
          ],
        });
        return;
      }

      // Show ticket creation modal
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

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        subjectInput,
      );
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        descriptionInput,
      );

      modal.addComponents(firstRow, secondRow);
      await interaction.showModal(modal);
    } catch (error) {
      Logger.error(`Error handling category select: ${error}`);
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Error",
            "An error occurred while processing your selection.",
          ),
        ],
      });
    }
  }

  private async handleCloseTicket(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await Ticket.findOne({
        ticketId: interaction.customId.replace("ticket_close_", ""),
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Error", "Could not find the ticket to close."),
          ],
        });
        return;
      }

      const member = interaction.member as GuildMember;
      const config = await TicketConfig.findByGuild(interaction.guild!.id);

      if (!config) {
        await interaction.editReply({
          embeds: [Embeds.error("Error", "Ticket configuration not found.")],
        });
        return;
      }

      const canClose =
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        config.supportRoles.some((roleId) => member.roles.cache.has(roleId)) ||
        ticket.authorId === interaction.user.id;

      if (!canClose) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "No Permission",
              "You don't have permission to close this ticket.",
            ),
          ],
        });
        return;
      }

      await ticket.updateOne({ status: TicketStatus.CLOSED });

      const channel = interaction.guild!.channels.cache.get(
        ticket.channelId,
      ) as TextChannel;

      if (channel) {
        await channel.send({
          embeds: [
            Embeds.success(
              "Ticket Closed",
              `Ticket closed by ${interaction.user}. Use \`/ticket reopen\` to reopen it if needed.`,
            ),
          ],
        });
      }

      await interaction.editReply({
        embeds: [Embeds.success("Success", "The ticket has been closed.")],
      });
    } catch (error) {
      Logger.error(`Error closing ticket: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Error", "Failed to close the ticket.")],
      });
    }
  }

  private async handleReopenTicket(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await Ticket.findOne({
        ticketId: interaction.customId.replace("ticket_reopen_", ""),
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.editReply({
          embeds: [
            Embeds.error("Error", "Could not find the ticket to reopen."),
          ],
        });
        return;
      }

      const member = interaction.member as GuildMember;
      const config = await TicketConfig.findByGuild(interaction.guild!.id);

      if (!config) {
        await interaction.editReply({
          embeds: [Embeds.error("Error", "Ticket configuration not found.")],
        });
        return;
      }

      const canReopen =
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        config.supportRoles.some((roleId) => member.roles.cache.has(roleId)) ||
        ticket.authorId === interaction.user.id;

      if (!canReopen) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "No Permission",
              "You don't have permission to reopen this ticket.",
            ),
          ],
        });
        return;
      }

      await ticket.updateOne({ status: TicketStatus.OPEN });

      const channel = interaction.guild!.channels.cache.get(
        ticket.channelId,
      ) as TextChannel;

      if (channel) {
        await channel.send({
          embeds: [
            Embeds.success(
              "Ticket Reopened",
              `Ticket reopened by ${interaction.user}.`,
            ),
          ],
        });
      }

      await interaction.editReply({
        embeds: [Embeds.success("Success", "The ticket has been reopened.")],
      });
    } catch (error) {
      Logger.error(`Error reopening ticket: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Error", "Failed to reopen the ticket.")],
      });
    }
  }

  private async handleGenerateTranscript(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await Ticket.findOne({
        ticketId: interaction.customId.replace("ticket_transcript_", ""),
        guildId: interaction.guild!.id,
      });

      if (!ticket) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Error",
              "Could not find the ticket to generate transcript.",
            ),
          ],
        });
        return;
      }

      const channel = interaction.guild!.channels.cache.get(
        ticket.channelId,
      ) as TextChannel;

      if (!channel?.isTextBased()) {
        await interaction.editReply({
          embeds: [
            Embeds.error(
              "Error",
              "Could not find the ticket channel or it's not a text channel.",
            ),
          ],
        });
        return;
      }

      const messages = await channel.messages.fetch({ limit: 100 });
      const messageArray = Array.from(messages.values()).reverse();

      const jsonTranscript = this.generateTranscript(
        ticket,
        messageArray,
        interaction.guild!.name,
      );

      const attachment = new AttachmentBuilder(Buffer.from(jsonTranscript), {
        name: `ticket-${ticket.ticketId}-transcript.json`,
      });

      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Transcript Generated",
            "Here's your ticket transcript.",
          ),
        ],
        files: [attachment],
      });
    } catch (error) {
      Logger.error(`Error generating transcript: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Error", "Failed to generate transcript.")],
      });
    }
  }
}
