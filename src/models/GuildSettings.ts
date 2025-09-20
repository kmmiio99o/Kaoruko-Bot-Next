import mongoose, { Document, Schema } from "mongoose";

export interface IAutoModeration {
  enabled: boolean;
  deleteInvites: boolean;
  deleteSpam: boolean;
  maxWarnings: number;
  spamThreshold: number;
  profanityFilter: boolean;
}

export interface IPermissions {
  adminRoles: string[];
  modRoles: string[];
  blacklistedUsers: string[];
  allowedChannels: string[];
  blockedChannels: string[];
}

export interface IGuildSettings extends Document {
  guildId: string;
  prefix: string;
  logCommands: boolean;
  logErrors: boolean;
  logEvents: boolean;
  welcomeChannel: string | null;
  goodbyeChannel: string | null;
  modLogChannel: string | null;
  autoModeration: IAutoModeration;
  permissions: IPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const AutoModerationSchema = new Schema({
  enabled: { type: Boolean, default: false },
  deleteInvites: { type: Boolean, default: false },
  deleteSpam: { type: Boolean, default: false },
  maxWarnings: { type: Number, default: 3 },
  spamThreshold: { type: Number, default: 5 },
  profanityFilter: { type: Boolean, default: false }
}, { _id: false });

const PermissionsSchema = new Schema({
  adminRoles: { type: [String], default: [] },
  modRoles: { type: [String], default: [] },
  blacklistedUsers: { type: [String], default: [] },
  allowedChannels: { type: [String], default: [] },
  blockedChannels: { type: [String], default: [] }
}, { _id: false });

const GuildSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '.' },
  logCommands: { type: Boolean, default: true },
  logErrors: { type: Boolean, default: true },
  logEvents: { type: Boolean, default: true },
  welcomeChannel: { type: String, default: null },
  goodbyeChannel: { type: String, default: null },
  modLogChannel: { type: String, default: null },
  autoModeration: { type: AutoModerationSchema, default: () => ({}) },
  permissions: { type: PermissionsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

GuildSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date(Date.now());
  next();
});

export default mongoose.model<IGuildSettings>(
  "GuildSettings",
  GuildSettingsSchema,
);
