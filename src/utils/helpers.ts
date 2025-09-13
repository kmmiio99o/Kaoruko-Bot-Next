import { Guild, User } from 'discord.js';

export class Helpers {
  static formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  static parseTime(time: string): number {
    const regex = /^(\d+)([smhdwy])$/;
    const match = time.match(regex);
    
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
      w: 604800000,
      y: 31536000000
    };
    
    return value * (multipliers[unit] || 0);
  }

  static formatMemberCount(guild: Guild): string {
    return guild.memberCount?.toLocaleString() || 'Unknown';
  }

  static formatUsername(user: User): string {
    return `${user.username}#${user.discriminator}`;
  }

  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
