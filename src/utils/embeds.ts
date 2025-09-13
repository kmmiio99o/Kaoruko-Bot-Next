import { EmbedBuilder, ColorResolvable } from "discord.js";
import { config } from "../config/config";

export class Embeds {
  static createEmbed(
    title: string,
    description: string,
    color: ColorResolvable = config.colors.primary as ColorResolvable,
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: "Kaoruko Bot" });
  }

  static success(title: string, description: string): EmbedBuilder {
    return this.createEmbed(
      title,
      description,
      config.colors.success as ColorResolvable,
    );
  }

  static error(title: string, description: string): EmbedBuilder {
    return this.createEmbed(
      title,
      description,
      config.colors.error as ColorResolvable,
    );
  }

  static warning(title: string, description: string): EmbedBuilder {
    return this.createEmbed(
      title,
      description,
      config.colors.warning as ColorResolvable,
    );
  }

  static info(title: string, description: string): EmbedBuilder {
    return this.createEmbed(
      title,
      description,
      config.colors.info as ColorResolvable,
    );
  }
}
