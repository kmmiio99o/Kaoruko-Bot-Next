import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { ICommand } from "../../types/Command";
import { default as Ticket, TicketStatus } from "../../models/Ticket";
import { Logger } from "../../utils/logger";
import { Embeds } from "../../utils/embeds";

export const command: ICommand = {
  name: "ticket",
  description: "Manage tickets",
  category: "Tickets",
  permissions: [PermissionFlagsBits.ManageMessages],
  usage: "/ticket reopen <ticket_id>",
  examples: ["/ticket reopen ABC-123"],
  cooldown: 5,
  slashCommand: true,
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reopen")
        .setDescription("Reopen a closed ticket")
        .addStringOption((option) =>
          option
            .setName("ticket_id")
            .setDescription("The ID of the ticket to reopen")
            .setRequired(true),
        ),
    ),

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "reopen":
        await handleReopenCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: "Unknown subcommand",
          ephemeral: true,
        });
    }
  },
};

async function handleReopenCommand(interaction: ChatInputCommandInteraction) {
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
        embeds: [
          Embeds.error(
            "Error",
            `No ticket found with ID ${ticketId} in this server.`,
          ),
        ],
      });
      return;
    }

    if (ticket.status === TicketStatus.OPEN) {
      await interaction.editReply({
        embeds: [Embeds.error("Error", "This ticket is already open.")],
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
          `Ticket ${ticketId} has been reopened. You can now continue the conversation.`,
        ),
      ],
    });

    Logger.info(
      `Successfully reopened ticket ${ticketId} in guild ${guildId} by ${interaction.user.tag}`,
    );
  } catch (error) {
    Logger.error(
      `Error reopening ticket in guild ${interaction.guildId}: ${error}`,
    );
    await interaction.editReply({
      embeds: [
        Embeds.error(
          "Error",
          "An error occurred while reopening the ticket. Please try again or contact an administrator.",
        ),
      ],
    });
  }
}
