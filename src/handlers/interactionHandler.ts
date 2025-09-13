import { Client, ChatInputCommandInteraction } from 'discord.js';
import { CommandHandler } from './commandHandler';
import { Embeds } from '../utils/embeds';
import { Logger } from '../utils/logger';

export class InteractionHandler {
  constructor(private commandHandler: CommandHandler) {}

  async handleInteraction(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commandHandler.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        embeds: [Embeds.error('Command Not Found', 'This command does not exist.')],
        ephemeral: true
      });
      return;
    }

    try {
      await command.run(interaction);
    } catch (error) {
      Logger.error(`Error executing command ${command.name}: ${error}`);
      
      const replyOptions = {
        embeds: [Embeds.error('Command Error', 'An error occurred while executing this command.')],
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  }
}
