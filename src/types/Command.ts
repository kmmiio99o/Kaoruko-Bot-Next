import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  Message,
  PermissionResolvable,
} from "discord.js";
import { CommandHandler } from "../handlers/commandHandler";

export interface ICommand {
  name: string;
  description: string;
  category?: string;
  permissions?: PermissionResolvable[];
  usage?: string;
  examples?: string[];
  cooldown?: number;
  slashCommand?: boolean;
  prefixCommand?: boolean;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  data?:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  run: (
    interaction?: ChatInputCommandInteraction,
    message?: Message,
    args?: string[],
    commandHandler?: CommandHandler,
  ) => Promise<void>;
}

export interface IEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void>;
}

export interface IStatusConfig {
  activities: Array<{
    name: string;
    type: any;
  }>;
  updateInterval: number;
}
