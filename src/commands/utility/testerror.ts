import { ChatInputCommandInteraction, Message } from "discord.js";
import { Command } from "../../types";
import { Embeds } from "../../utils/embeds";
import { Logger } from "../../utils/logger";

export default {
  name: "testerror",
  description: "Test command to verify error handling (Owner only)",
  category: "utility",
  slashCommand: true,
  prefixCommand: true,
  ownerOnly: true,
  usage:
    "Slash: /testerror [error_type:<general|reference|timeout>]\nPrefix: .testerror [general|reference|timeout]",
  async run(
    interaction: ChatInputCommandInteraction | undefined,
    message: Message | undefined,
    args: string[] | undefined,
  ) {
    const isSlashCommand = !!interaction;
    const executor = isSlashCommand ? interaction!.user : message!.author;

    // Verify bot owner permission
    const ownerId = process.env.OWNER_ID;
    if (!ownerId || executor.id !== ownerId) {
      const embed = Embeds.error(
        "Permission Denied",
        "Only the bot owner can use this command.",
      );
      if (isSlashCommand) {
        return await interaction!.reply({ embeds: [embed], flags: [64] });
      } else {
        return await message!.reply({ embeds: [embed] });
      }
    }

    // Get error type parameter
    const errorType = isSlashCommand
      ? interaction!.options.getString("error_type") || "general"
      : args?.[0] || "general";

    // Log owner testing activity for security monitoring
    Logger.logWithContext(
      "TESTERROR",
      `Owner ${executor.tag} triggered ${errorType} error test`,
      "info",
    );

    // Execute different error scenarios for testing
    switch (errorType) {
      case "general":
        // Test general JavaScript errors
        throw new Error("This is a test general error!");

      case "reference":
        // Test reference errors (undefined variables)
        // @ts-ignore - Intentional error for testing
        return someUndefinedVariable.thatDoesNotExist;

      case "timeout":
        // Test timeout handling
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const successEmbed = Embeds.success(
          "Test Complete",
          "Timeout test completed successfully!",
        );
        if (isSlashCommand) {
          await interaction!.reply({ embeds: [successEmbed] });
        } else {
          await message!.reply({ embeds: [successEmbed] });
        }
        return;

      default:
        // Handle unknown error types
        const unknownEmbed = Embeds.success(
          "Test Error",
          `No error triggered for type: ${errorType}`,
        );
        if (isSlashCommand) {
          await interaction!.reply({ embeds: [unknownEmbed] });
        } else {
          await message!.reply({ embeds: [unknownEmbed] });
        }
    }
  },
} as Command;
