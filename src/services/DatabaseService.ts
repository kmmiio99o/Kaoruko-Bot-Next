import GuildSettings, { IGuildSettings } from "../models/GuildSettings";
import { Logger } from "../utils/logger";

export class DatabaseService {
  // Get guild settings with default values
  static async getGuildSettings(guildId: string): Promise<IGuildSettings> {
    try {
      let settings = await GuildSettings.findOne({ guildId });

      if (!settings) {
        // Create default settings
        settings = new GuildSettings({
          guildId,
        });
        await settings.save();
        Logger.info(`Created new guild settings for ${guildId}`);
      }

      return settings;
    } catch (error) {
      Logger.error(`Error getting guild settings for ${guildId}: ${error}`);
      throw error;
    }
  }

  // Update guild settings
  static async updateGuildSettings(
    guildId: string,
    updates: any,
  ): Promise<IGuildSettings> {
    try {
      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { new: true, upsert: true, runValidators: true },
      );

      Logger.info(`Updated guild settings for ${guildId}`);
      return settings!;
    } catch (error) {
      Logger.error(`Error updating guild settings for ${guildId}: ${error}`);
      throw error;
    }
  }

  // Reset guild settings to defaults
  static async resetGuildSettings(guildId: string): Promise<IGuildSettings> {
    try {
      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        {
          $set: {
            guildId,
          },
        },
        { new: true, upsert: true },
      );

      Logger.info(`Reset guild settings for ${guildId}`);
      return settings!;
    } catch (error) {
      Logger.error(`Error resetting guild settings for ${guildId}: ${error}`);
      throw error;
    }
  }

  // Get all guild settings (for dashboard)
  static async getAllGuildSettings(): Promise<IGuildSettings[]> {
    try {
      const settings = await GuildSettings.find({});
      return settings;
    } catch (error) {
      Logger.error(`Error getting all guild settings: ${error}`);
      throw error;
    }
  }
}
