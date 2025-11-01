import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
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
  MessageFlags,
} from "discord.js";
import { WebhookLogger } from "../utils/webhooklogger";
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
        const channel = await interaction.guild!.channels.fetch(
          interaction.channelId,
        );
        if (channel?.isTextBased()) {
          const ticket = await Ticket.findOne({
            ticketId: customId.replace("ticket_reopen_", ""),
            guildId: interaction.guild!.id,
          });
          if (ticket) {
            await ticket.updateOne({
              status: TicketStatus.OPEN,
              $inc: { reopenCount: 1 },
              closedBy: null,
              closedAt: null,
              closeReason: null,
              lastActivity: new Date(),
            });
            await channel.send({
              embeds: [
                Embeds.success(
                  "Ticket Reopened",
                  `Ticket reopened by ${interaction.user}.`,
                ),
              ],
            });
            await interaction.reply({
              embeds: [
                Embeds.success("Success", "The ticket has been reopened."),
              ],
              flags: [64],
            });
          } else {
            await interaction.reply({
              embeds: [
                Embeds.error("Error", "Could not find the ticket to reopen."),
              ],
              flags: [64],
            });
          }
        }
      } else if (customId.startsWith("ticket_transcript_")) {
        await this.handleGenerateTranscript(interaction as ButtonInteraction);
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
    await interaction.deferReply({ flags: 64 });

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
    await interaction.deferReply({ flags: 64 });

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
    const formatTimestamp = (date: Date) => date.toISOString();
    const transcriptLines: string[] = [];

    // Header
    transcriptLines.push(`Ticket Transcript for ticket-${ticket.ticketId}`);
    transcriptLines.push(
      `Created by: ${ticket.authorName} (${ticket.authorId})`,
    );
    if (ticket.closedBy && ticket.closedAt) {
      transcriptLines.push(
        `Closed by: ${ticket.closedBy} (${formatTimestamp(
          new Date(ticket.closedAt),
        )})`,
      );
    }
    transcriptLines.push(`Date: ${new Date().toISOString()}`);
    transcriptLines.push(`──────────────────────────────────────────────────`);
    transcriptLines.push(``); // Empty line for spacing

    // Message History
    messages.forEach((msg) => {
      const timestamp = formatTimestamp(msg.createdAt);
      const authorTag = `${msg.author.username}${
        msg.author.discriminator !== "0" ? `#${msg.author.discriminator}` : ""
      }`;
      transcriptLines.push(`[${timestamp}] ${authorTag}: ${msg.content || ""}`);

      if (msg.attachments.size > 0) {
        msg.attachments.forEach((att) => {
          transcriptLines.push(`[Attachment: ${att.url}]`);
        });
      }
      if (msg.embeds.length > 0) {
        transcriptLines.push(`[Embedded content]`);
      }
      transcriptLines.push(``); // Empty line for spacing between messages
    });

    return transcriptLines.join("\n");
  }

  private generateLogTranscript(
    ticket: any,
    _messages: Message[],
    guildName: string,
  ): string {
    const formatTimestamp = (date: Date) =>
      `<t:${Math.floor(date.getTime() / 1000)}:R>`;

    let log = `# Ticket Transcript Summary\n\n`;

    // Ticket header
    log += `## 📑 Ticket Details\n\n`;
    log += `• **Ticket ID:** \`${ticket.ticketId}\`\n`;
    log += `• **Subject:** ${ticket.subject || "*No subject*"}\n`;
    log += `• **Category:** ${ticket.category || "*No category*"}\n`;
    log += `• **Created by:** ${ticket.authorName}\n`;
    log += `• **Created:** ${formatTimestamp(ticket.createdAt)}\n`;
    if (ticket.closedAt) {
      log += `• **Closed:** ${formatTimestamp(ticket.closedAt)}\n`;
    }
    if (ticket.reopenCount > 0) {
      log += `• **Times reopened:** ${ticket.reopenCount}\n`;
    }

    return log;
  }

  private formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 10) / 10}${units[unitIndex]}`;
  }

  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      await interaction.deferReply({ flags: 64 });

      if (!interaction.customId.startsWith("ticket_modal_")) {
        return; // Ignore modals that aren't for ticket creation
      }

      const categoryId = interaction.customId.replace(
        "ticket_modal_",
        "",
      ) as TicketCategory;
      const subject = interaction.fields.getTextInputValue("ticket_subject");
      const description =
        interaction.fields.getTextInputValue("ticket_description");

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
              `Your ticket has been created: <#${result.channel.id}>`,
            ),
          ],
        });
        Logger.info(
          `Ticket ${result.ticket.ticketId} created in guild ${interaction.guild!.id} by user ${interaction.user.id}`,
        ); // Log the ticket creation
      } else {
        await interaction.editReply({
          embeds: [Embeds.error("Creation Failed", "Failed to create ticket.")],
        });
        Logger.error(
          `Failed to create ticket in guild ${interaction.guild!.id} by user ${interaction.user.id}`,
        ); // Log ticket creation failure
      }
    } catch (error: any) {
      Logger.error(`Error creating ticket: ${error}`);
      await interaction.editReply({
        embeds: [
          Embeds.error(
            "Error",
            `An error occurred while creating your ticket: ${error.message}`,
          ),
        ],
      });
      WebhookLogger.logError(
        "TicketCreateError",
        "handleModalSubmit",
        `Error creating ticket in guild ${interaction.guild!.id} by user ${interaction.user.id}`,
        error.stack || null,
        interaction.user.id,
      );
    }
  }

  public async handleCategorySelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    try {
      let categoryId = interaction.values[0] as TicketCategory;
      Logger.info(
        `Category selected: ${categoryId} by user ${interaction.user.tag} in guild ${interaction.guild!.id}`,
      );

      const config = await TicketConfig.findByGuild(interaction.guild!.id);
      if (!config) {
        Logger.error(
          `No ticket config found for guild ${interaction.guild!.id}`,
        );
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Configuration Error",
              "Ticket system is not configured for this server.",
            ),
          ],
          flags: 64,
        });
        return;
      }

      // Get category from the Map
      const category = Array.from(config.categories.entries()).find(
        ([id]) => id === categoryId,
      );
      if (!category) {
        Logger.error(
          `Invalid category ${categoryId} selected in guild ${interaction.guild!.id}`,
        );
        await interaction.reply({
          embeds: [
            Embeds.error(
              "Invalid Category",
              `Category ${categoryId} is not available. Available categories: ${Array.from(config.categories.keys()).join(", ")}`,
            ),
          ],
          flags: 64,
        });
        return;
      }
      Logger.info(
        `Valid category ${categoryId} found with config: ${JSON.stringify(category[1])}`,
      );

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
      const errorMsg = `Error handling category select in guild ${interaction.guild!.id}: ${error}`;
      Logger.error(errorMsg);
      WebhookLogger.logError(
        "TicketCategorySelect",
        errorMsg,
        (error as Error).stack || null,
        interaction.user.id,
        interaction.values[0] || "unknown",
      );
      await interaction.reply({
        embeds: [
          Embeds.error(
            "Error",
            "An error occurred while processing your selection. Please try again or contact an administrator.",
          ),
        ],
        flags: [64],
      });
    }
  }

  private async handleCloseTicket(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [64] });

    try {
      // Send a follow-up message to inform the user that processing is in progress
      // This is crucial to prevent the "Unknown Message" / "InteractionAlreadyReplied" errors
      await interaction.followUp({
        embeds: [
          Embeds.info(
            "Ticket Closure in Progress",
            "Your ticket is being closed and archived. Please wait...",
          ),
        ],
        flags: [64],
      });

      const ticketId = interaction.customId.replace("ticket_close_", "");
      const ticket = await Ticket.findOne({
        ticketId: ticketId,
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

      const channel = interaction.guild!.channels.cache.get(
        ticket.channelId,
      ) as TextChannel;

      if (!channel) {
        await interaction.editReply({
          embeds: [Embeds.error("Error", "Could not find the ticket channel.")],
        });
        return;
      }

      // Get messages for transcript before closing
      const messages = await channel.messages.fetch({ limit: 100 });
      const messageArray = Array.from(messages.values()).reverse();

      // Generate transcripts
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

      // Create transcript file
      const transcriptAttachment = new AttachmentBuilder(
        Buffer.from(jsonTranscript),
        { name: `transcript-${ticket.ticketId}.txt` },
      );

      // Send transcript to log channel if configured
      if (config.logChannelId) {
        const logChannel = interaction.guild!.channels.cache.get(
          config.logChannelId,
        ) as TextChannel;

        if (logChannel) {
          await logChannel.send({
            embeds: [
              Embeds.info("Ticket Closed", "📝 Ticket transcript saved")
                .addFields([
                  {
                    name: "Ticket Info",
                    value: [
                      `• ID: \`${ticket.ticketId}\``,
                      `• Subject: ${ticket.subject || "*No subject*"}`,
                      `• Category: ${ticket.category || "*No category*"}`,
                    ].join("\n"),
                    inline: false,
                  },
                  {
                    name: "Users",
                    value: [
                      `• Created by: ${ticket.authorName}`,
                      `• Closed by: ${interaction.user.tag}`,
                      `• Total messages: ${messages.size}`,
                    ].join("\n"),
                    inline: false,
                  },
                ])
                .setDescription(logTranscript) // Use the full logTranscript as the embed description
                .setTimestamp(),
            ],
            files: [transcriptAttachment],
          });
        }
      }

      // Update ticket status and close info
      await ticket.updateOne({
        status: TicketStatus.CLOSED,
        closedBy: interaction.user.id,
        closedAt: new Date(),
      });

      // Delete the channel immediately
      await channel.delete(`Ticket closed by ${interaction.user.tag}`);

      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Success",
            "The ticket has been closed and archived. A transcript has been saved.",
          ),
        ],
      });
    } catch (error) {
      Logger.error(`Error closing ticket: ${error}`);
      await interaction.editReply({
        embeds: [Embeds.error("Error", "Failed to close the ticket.")],
      });
    }
  }

  private async handleGenerateTranscript(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [64] });

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
