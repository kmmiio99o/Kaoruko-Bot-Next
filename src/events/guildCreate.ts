import { Guild } from 'discord.js';
import { Logger } from '../utils/logger';

export default {
  name: 'guildCreate',
  async execute(guild: Guild) {
    Logger.info(`Joined new guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
  }
};
