import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { default as Ticket, TicketStatus } from "../../models/Ticket";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default class TicketCommand implements ICommand {
  name = "ticket";
  description = "Manage tickets";
  category = "Tickets";
  permissions = [PermissionFlagsBits.ManageMessages];
  slashCommand = true;
  guildOnly = true;

  data = (() => {
    const builder = new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Manage tickets")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

    builder.addSubcommand((subcommand) =>
      subcommand
        .setName("reopen")
        .setDescription("Reopen a closed ticket")
        .addStringOption((option) =>
          option
            .setName("ticket_id")
            .setDescription("The ID of the ticket to reopen")
            .setRequired(true),
        ),
    );

    return builder;
  })();

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "reopen":
        await this.handleReopenCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: "Unknown subcommand",
          ephemeral: true,
        });
    }
  }

  private async handleReopenCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticketId = interaction.options.getString("ticket_id", true);
      const guildId = interaction.guildId!;

      Logger.info(
        `Attempting to reopen ticket ${ticketId} in guild ${guildId} by ${interaction.user.tag}`,
      );

      // Find the ticket
      const ticket = await Ticket.findOne({
        ticketId: ticketId,
        guildId: guildId,
      });

      if (!ticket) {
        await interaction.editReply({
          content: `No ticket found with ID ${ticketId} in this server.`,
        });
        return;
      }

      if (ticket.status === TicketStatus.OPEN) {
        await interaction.editReply({
          content: "This ticket is already open.",
        });
        return;
      }

      // Update ticket status
      await ticket.updateOne({
        status: TicketStatus.OPEN,
        $inc: { reopenCount: 1 },
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastActivity: new Date(),
      });

      // Send success message
      await interaction.editReply({
        embeds: [
          Embeds.success(
            "Ticket Reopened",
            `Ticket ${ticketId} has been reopened.`,
          ),
        ],
      });

      Logger.info(
        `Ticket ${ticketId} reopened by ${interaction.user.tag} in guild ${guildId}`,
      );
    } catch (error) {
      Logger.error(
        `Error reopening ticket in guild ${interaction.guildId}: ${error}`,
      );
      await interaction.editReply({
        content:
          "An error occurred while reopening the ticket. Please try again or contact an administrator.",
      });
    }
  }
}
