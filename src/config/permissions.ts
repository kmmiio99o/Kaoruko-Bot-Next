import { PermissionFlagsBits } from 'discord.js';

export const Permissions = {
  ADMIN: [
    PermissionFlagsBits.Administrator
  ],
  MODERATOR: [
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ModerateMembers
  ],
  HELPER: [
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ModerateMembers
  ],
  USER: []
};
