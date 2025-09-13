import { ChatInputCommandInteraction, Message, PermissionResolvable } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  category: string;
  permissions?: PermissionResolvable[];
  usage?: string;
  examples?: string[];
  cooldown?: number;
  slashCommand?: boolean;
  prefixCommand?: boolean;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  run: (interaction?: ChatInputCommandInteraction, message?: Message, args?: string[]) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void>;
}

export interface StatusConfig {
  activities: Array<{
    name: string;
    type: any;
  }>;
  updateInterval: number;
}
