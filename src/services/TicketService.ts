import {
  Guild,
  GuildChannel,
  TextChannel,
  User,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  Message,
  GuildMember,
  Collection
} from "discord.js";
import Ticket, { ITicket, TicketStatus, TicketCategory, TicketPriority } from "../models/Ticket";
import TicketConfig, { ITicketConfig } from "../models/TicketConfig";
import { Logger } from "../utils/logger";
import { Embeds } from "../utils/embeds";

export class TicketService {
  private static instance: TicketService;

  public static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  /**
   * Create a new ticket
   */
  async createTicket(
    guild: Guild,
    user: User,
    category: TicketCategory = TicketCategory.GENERAL,
    subject?: string,
    description?: string
  ): Promise<{ ticket: ITicket; channel: TextChannel } | null> {
    try {
      // Get ticket configuration
      const config = await TicketConfig.findByGuild(guild.id);
      if (!config || !config.enabled) {
        Logger.warn(`Ticket system not enabled for guild ${guild.id}`);
        return null;
      }

      // Check if user can create tickets
      const userTickets = await Ticket.find({
        guildId: guild.id,
        authorId: user.id,
        status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING] }
      });

      if (userTickets.length >= config.maxTicketsPerUser) {
        Logger.warn(`User ${user.id} has reached max tickets limit in guild ${guild.id}`);
        return null;
      }

      // Generate ticket ID
      const ticketId = this.generateTicketId(guild.id);

      // Create ticket channel
      const channelName = this.generateChannelName(config.channelName, user.username, ticketId);
      const categoryChannel = config.categoryId ? guild.channels.cache.get(config.categoryId) as CategoryChannel : null;

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryChannel,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          }
        ]
      });

      // Add support role permissions
      for (const roleId of config.supportRoles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          await channel.permissionOverwrites.edit(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
            ManageMessages: true
          });
        }
      }

      // Add admin role permissions
      for (const roleId of config.adminRoles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          await channel.permissionOverwrites.edit(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
            ManageMessages: true,
            ManageChannels: true
          });
        }
      }

      // Create ticket in database
      const ticket = new Ticket({
        guildId: guild.id,
        ticketId,
        channelId: channel.id,
        authorId: user.id,
        authorName: user.tag,
        subject: subject || `${category} Support`,
        category,
        priority: TicketPriority.NORMAL,
        status: TicketStatus.OPEN,
        description,
        users: [{
          userId: user.id,
          username: user.username,
          discriminator: user.discriminator,
          addedAt: new Date()
        }]
      });

      await ticket.save();

      // Send welcome message
      await this.sendWelcomeMessage(channel, ticket, config, user);

      // Log ticket creation
      if (config.logChannelId) {
        await this.logTicketEvent(guild, config.logChannelId, 'created', ticket, user);
      }

      // Mention support roles if enabled
      if (config.mentionSupportOnCreate) {
        const mentions = config.supportRoles
          .map(roleId => `<@&${roleId}>`)
          .join(' ');
        if (mentions) {
          await channel.send(`${mentions} New ticket created!`);
        }
      }

      Logger.info(`Ticket ${ticketId} created in guild ${guild.id} by user ${user.id}`);
      return { ticket, channel };

    } catch (error) {
      Logger.error(`Failed to create ticket in guild ${guild.id}:`, error);
      return null;
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(
    guild: Guild,
    ticketId: string,
    closedBy: User,
    reason?: string,
    generateTranscript: boolean = true
  ): Promise<boolean> {
    try {
      const ticket = await Ticket.findOne({ ticketId, guildId: guild.id });
      if (!ticket) {
        Logger.warn(`Ticket ${ticketId} not found in guild ${guild.id}`);
        return false;
      }

      const config = await TicketConfig.findByGuild(guild.id);
      if (!config) {
        Logger.warn(`Ticket config not found for guild ${guild.id}`);
        return false;
      }

      const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
      if (!channel) {
        Logger.warn(`Ticket channel ${ticket.channelId} not found`);
        // Update ticket status anyway
        await ticket.updateStatus(TicketStatus.CLOSED, closedBy.id);
        return true;
      }

      // Generate transcript if enabled and requested
      let transcriptUrl: string | null = null;
      if (generateTranscript && config.transcript.enabled) {
        transcriptUrl = await this.generateTranscript(channel, ticket, config);
      }

      // Update ticket status
      ticket.status = TicketStatus.CLOSED;
      ticket.closedBy = closedBy.id;
      ticket.closedAt = new Date();
      ticket.closeReason = reason;
      await ticket.save();

      // Send closing message
      const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by ${closedBy.tag}`)
        .addFields(
          { name: 'Ticket ID', value: ticket.ticketId, inline: true },
          { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor('#FF0000')
        .setTimestamp();

      if (reason) {
        embed.addFields({ name: 'Reason', value: reason });
      }

      if (transcriptUrl) {
        embed.addFields({ name: 'Transcript', value: `[Download](${transcriptUrl})` });
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_reopen_${ticket.ticketId}`)
            .setLabel('Reopen Ticket')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔓'),
          new ButtonBuilder()
            .setCustomId(`ticket_delete_${ticket.ticketId}`)
            .setLabel('Delete Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );

      await channel.send({ embeds: [embed], components: [row] });

      // Log ticket closure
      if (config.logChannelId) {
        await this.logTicketEvent(guild, config.logChannelId, 'closed', ticket, closedBy, reason);
      }

      // Send DM to ticket author if enabled
      if (config.dmUserOnClose) {
        await this.sendClosureDM(ticket.authorId, guild, ticket, transcriptUrl);
      }

      // Auto-delete after configured time
      if (config.autoDeleteAfter) {
        setTimeout(async () => {
          try {
            const channelToDelete = guild.channels.cache.get(ticket.channelId);
            if (channelToDelete) {
              await channelToDelete.delete('Ticket auto-delete');
            }
          } catch (error) {
            Logger.error(`Failed to auto-delete ticket channel ${ticket.channelId}:`, error);
          }
        }, config.autoDeleteAfter * 60 * 60 * 1000); // Convert hours to milliseconds
      }

      Logger.info(`Ticket ${ticketId} closed in guild ${guild.id} by user ${closedBy.id}`);
      return true;

    } catch (error) {
      Logger.error(`Failed to close ticket ${ticketId} in guild ${guild.id}:`, error);
      return false;
    }
  }

  /**
   * Reopen a ticket
   */
  async reopenTicket(guild: Guild, ticketId: string, reopenedBy: User): Promise<boolean> {
    try {
      const ticket = await Ticket.findOne({ ticketId, guildId: guild.id });
      if (!ticket) {
        Logger.warn(`Ticket ${ticketId} not found in guild ${guild.id}`);
        return false;
      }

      if (ticket.status !== TicketStatus.CLOSED) {
        Logger.warn(`Ticket ${ticketId} is not closed, cannot reopen`);
        return false;
      }

      const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
      if (!channel) {
        Logger.warn(`Ticket channel ${ticket.channelId} not found`);
        return false;
      }

      // Reopen ticket
      await ticket.reopen();

      // Send reopening message
      const embed = new EmbedBuilder()
        .setTitle('🔓 Ticket Reopened')
        .setDescription(`This ticket has been reopened by ${reopenedBy.tag}`)
        .addFields(
          { name: 'Ticket ID', value: ticket.ticketId, inline: true },
          { name: 'Reopened At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: 'Reopen Count', value: ticket.reopenCount.toString(), inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Log ticket reopening
      const config = await TicketConfig.findByGuild(guild.id);
      if (config && config.logChannelId) {
        await this.logTicketEvent(guild, config.logChannelId, 'reopened', ticket, reopenedBy);
      }

      Logger.info(`Ticket ${ticketId} reopened in guild ${guild.id} by user ${reopenedBy.id}`);
      return true;

    } catch (error) {
      Logger.error(`Failed to reopen ticket ${ticketId} in guild ${guild.id}:`, error);
      return false;
    }
  }

  /**
   * Add user to ticket
   */
  async addUserToTicket(guild: Guild, ticketId: string, user: User, addedBy: User): Promise<boolean> {
    try {
      const ticket = await Ticket.findOne({ ticketId, guildId: guild.id });
      if (!ticket) return false;

      const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
      if (!channel) return false;

      // Add user permissions
      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      // Add to ticket database
      await ticket.addUser(user.id, user.username, user.discriminator);

      // Send notification
      const embed = new EmbedBuilder()
        .setTitle('👤 User Added to Ticket')
        .setDescription(`${user.tag} has been added to this ticket by ${addedBy.tag}`)
        .setColor('#00FF00')
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      Logger.info(`User ${user.id} added to ticket ${ticketId} by ${addedBy.id}`);
      return true;

    } catch (error) {
      Logger.error(`Failed to add user to ticket ${ticketId}:`, error);
      return false;
    }
  }

  /**
   * Remove user from ticket
   */
  async removeUserFromTicket(guild: Guild, ticketId: string, user: User, removedBy: User): Promise<boolean> {
    try {
      const ticket = await Ticket.findOne({ ticketId, guildId: guild.id });
      if (!ticket) return false;

      const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
      if (!channel) return false;

      // Remove user permissions
      await channel.permissionOverwrites.delete(user.id);

      // Remove from ticket database
      await ticket.removeUser(user.id);

      // Send notification
      const embed = new EmbedBuilder()
        .setTitle('👤 User Removed from Ticket')
        .setDescription(`${user.tag} has been removed from this ticket by ${removedBy.tag}`)
        .setColor('#FF0000')
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      Logger.info(`User ${user.id} removed from ticket ${ticketId} by ${removedBy.id}`);
      return true;

    } catch (error) {
      Logger.error(`Failed to remove user from ticket ${ticketId}:`, error);
      return false;
    }
  }

  /**
   * Create ticket panel
   */
  async createTicketPanel(guild: Guild, channel: TextChannel, config: ITicketConfig): Promise<Message | null> {
    try {
      const embed = new EmbedBuilder()
        .setTitle(config.panelTitle)
        .setDescription(config.panelDescription)
        .setColor(config.panelColor)
        .setTimestamp()
        .setFooter({ text: `${guild.name} Support`, iconURL: guild.iconURL() || undefined });

      if (config.panelThumbnail) {
        embed.setThumbnail(config.panelThumbnail);
      }

      // Create buttons for categories
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      let currentRow = new ActionRowBuilder<ButtonBuilder>();
      let buttonCount = 0;

      for (const [categoryId, categoryConfig] of config.categories) {
        if (buttonCount >= 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<ButtonBuilder>();
          buttonCount = 0;
        }

        const button = new ButtonBuilder()
          .setCustomId(`ticket_create_${categoryId}`)
          .setLabel(categoryConfig.name)
          .setStyle(ButtonStyle.Primary);

        if (categoryConfig.emoji) {
          button.setEmoji(categoryConfig.emoji);
        }

        currentRow.addComponents(button);
        buttonCount++;
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      const message = await channel.send({
        embeds: [embed],
        components: rows
      });

      // Update config with panel message ID
      config.panelMessageId = message.id;
      config.panelChannelId = channel.id;
      await config.save();

      Logger.info(`Ticket panel created in channel ${channel.id} for guild ${guild.id}`);
      return message;

    } catch (error) {
      Logger.error(`Failed to create ticket panel in guild ${guild.id}:`, error);
      return null;
    }
  }

  /**
   * Generate transcript
   */
  private async generateTranscript(
    channel: TextChannel,
    ticket: ITicket,
    config: ITicketConfig
  ): Promise<string | null> {
    try {
      // This is a simplified transcript generation
      // In a real implementation, you might use a proper transcript service
      const messages = await this.fetchAllMessages(channel);

      let transcript = '';
      transcript += `Ticket ID: ${ticket.ticketId}\n`;
      transcript += `Created: ${ticket.createdAt.toISOString()}\n`;
      transcript += `Author: ${ticket.authorName}\n`;
      transcript += `Category: ${ticket.category}\n`;
      transcript += `Status: ${ticket.status}\n`;
      transcript += `\n--- Messages ---\n\n`;

      for (const message of messages) {
        transcript += `[${message.createdAt.toISOString()}] ${message.author.tag}: ${message.content}\n`;
        if (message.attachments.size > 0) {
          for (const attachment of message.attachments.values()) {
            transcript += `  📎 Attachment: ${attachment.url}\n`;
          }
        }
      }

      // In a real implementation, you'd upload this to a file hosting service
      // For now, we'll just return a placeholder URL
      return `https://transcripts.example.com/${ticket.ticketId}.txt`;

    } catch (error) {
      Logger.error(`Failed to generate transcript for ticket ${ticket.ticketId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all messages in a channel
   */
  private async fetchAllMessages(channel: TextChannel): Promise<Message[]> {
    const messages: Message[] = [];
    let lastMessageId: string | undefined;

    while (true) {
      const options: any = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const fetchedMessages = await channel.messages.fetch(options);
      if (fetchedMessages.size === 0) break;

      messages.push(...fetchedMessages.values());
      lastMessageId = fetchedMessages.last()?.id;
    }

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Send welcome message to new ticket
   */
  private async sendWelcomeMessage(
    channel: TextChannel,
    ticket: ITicket,
    config: ITicketConfig,
    user: User
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🎫 New Support Ticket')
      .setDescription(`Hello ${user.tag}! Thank you for creating a support ticket. Our team will assist you shortly.`)
      .addFields(
        { name: 'Ticket ID', value: ticket.ticketId, inline: true },
        { name: 'Category', value: ticket.category, inline: true },
        { name: 'Priority', value: ticket.priority, inline: true },
        { name: 'Created', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: false }
      )
      .setColor(config.panelColor)
      .setTimestamp()
      .setThumbnail(user.displayAvatarURL());

    if (ticket.description) {
      embed.addFields({ name: 'Description', value: ticket.description });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.ticketId}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticket.ticketId}`)
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✋')
      );

    await channel.send({ embeds: [embed], components: [row] });
  }

  /**
   * Send closure DM to user
   */
  private async sendClosureDM(
    userId: string,
    guild: Guild,
    ticket: ITicket,
    transcriptUrl?: string | null
  ): Promise<void> {
    try {
      const user = await guild.client.users.fetch(userId);

      const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Your support ticket in **${guild.name}** has been closed.`)
        .addFields(
          { name: 'Ticket ID', value: ticket.ticketId, inline: true },
          { name: 'Category', value: ticket.category, inline: true },
          { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor('#FF0000')
        .setTimestamp()
        .setThumbnail(guild.iconURL());

      if (ticket.closeReason) {
        embed.addFields({ name: 'Reason', value: ticket.closeReason });
      }

      if (transcriptUrl) {
        embed.addFields({ name: 'Transcript', value: `[Download Transcript](${transcriptUrl})` });
      }

      await user.send({ embeds: [embed] });

    } catch (error) {
      Logger.warn(`Failed to send closure DM to user ${userId}:`, error);
    }
  }

  /**
   * Log ticket events
   */
  private async logTicketEvent(
    guild: Guild,
    logChannelId: string,
    event: string,
    ticket: ITicket,
    user: User,
    reason?: string
  ): Promise<void> {
    try {
      const logChannel = guild.channels.cache.get(logChannelId) as TextChannel;
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`📋 Ticket ${event.charAt(0).toUpperCase() + event.slice(1)}`)
        .addFields(
          { name: 'Ticket ID', value: ticket.ticketId, inline: true },
          { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
          { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true },
          { name: 'Category', value: ticket.category, inline: true },
          { name: 'Status', value: ticket.status, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(this.getEventColor(event))
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL());

      if (reason) {
        embed.addFields({ name: 'Reason', value: reason });
      }

      await logChannel.send({ embeds: [embed] });

    } catch (error) {
      Logger.error(`Failed to log ticket event ${event} for ticket ${ticket.ticketId}:`, error);
    }
  }

  /**
   * Generate ticket ID
   */
  private generateTicketId(guildId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${guildId.substr(-4)}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate channel name
   */
  private generateChannelName(format: string, username: string, ticketId: string): string {
    return format
      .replace('{username}', username.toLowerCase().replace(/[^a-z0-9]/g, '-'))
      .replace('{ticketid}', ticketId.toLowerCase())
      .replace('{number}', Math.floor(Math.random() * 1000).toString());
  }

  /**
   * Get color for event logging
   */
  private getEventColor(event: string): string {
    switch (event) {
      case 'created': return '#00FF00';
      case 'closed': return '#FF0000';
      case 'reopened': return '#FFFF00';
      case 'claimed': return '#0000FF';
      default: return '#FFFFFF';
    }
  }
}
