import mongoose, { Document, Schema } from "mongoose";
import { TicketCategory } from "./Ticket";

export interface ITicketCategoryConfig {
  name: string;
  description: string;
  emoji?: string;
  color: string;
  autoAssignRoles: string[];
  requiredRoles: string[];
  maxTickets?: number;
  autoClose?: number; // hours
}

export interface ITicketAutoResponse {
  trigger: string;
  response: string;
  enabled: boolean;
}

export interface ITicketTranscript {
  enabled: boolean;
  channelId?: string;
  includeAttachments: boolean;
  format: "html" | "txt" | "json";
}

export interface ITicketConfig extends Document {
  guildId: string;
  enabled: boolean;

  // Channel Settings
  categoryId?: string;
  logChannelId?: string;
  supportRoles: string[];
  adminRoles: string[];

  // Panel Settings
  panelChannelId?: string;
  panelMessageId?: string;
  panelTitle: string;
  panelDescription: string;
  panelColor: string;
  panelThumbnail?: string;

  // Ticket Settings
  maxTicketsPerUser: number;
  autoDeleteAfter?: number; // hours
  dmUserOnClose: boolean;
  requireReason: boolean;
  allowUserClose: boolean;
  mentionSupportOnCreate: boolean;

  // Categories
  categories: Map<string, ITicketCategoryConfig>;
  defaultCategory: string;

  // Auto Responses
  autoResponses: ITicketAutoResponse[];

  // Transcript Settings
  transcript: ITicketTranscript;

  // Naming
  ticketNameFormat: string; // {category}-{username}-{number}
  channelName: string; // ticket-{username}

  // Permissions
  ticketPermissions: {
    viewTicket: string[];
    manageTickets: string[];
    closeAnyTicket: string[];
  };

  // Automation
  autoCloseInactive: boolean;
  inactiveHours: number;
  autoArchive: boolean;
  archiveCategoryId?: string;

  // Feedback
  collectFeedback: boolean;
  feedbackChannelId?: string;

  // Advanced
  customFields: Array<{
    name: string;
    type: "text" | "number" | "select" | "boolean";
    required: boolean;
    options?: string[];
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const TicketCategoryConfigSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 50 },
    description: { type: String, required: true, maxlength: 200 },
    emoji: { type: String, maxlength: 10 },
    color: { type: String, default: "#5865F2" },
    autoAssignRoles: { type: [String], default: [] },
    requiredRoles: { type: [String], default: [] },
    maxTickets: { type: Number, min: 1, max: 50 },
    autoClose: { type: Number, min: 1, max: 720 }, // max 30 days
  },
  { _id: false },
);

const TicketAutoResponseSchema = new Schema(
  {
    trigger: { type: String, required: true, maxlength: 100 },
    response: { type: String, required: true, maxlength: 2000 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const TicketTranscriptSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    channelId: { type: String },
    includeAttachments: { type: Boolean, default: false },
    format: {
      type: String,
      enum: ["html", "txt", "json"],
      default: "html",
    },
  },
  { _id: false },
);

const CustomFieldSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 50 },
    type: {
      type: String,
      enum: ["text", "number", "select", "boolean"],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false },
);

const TicketConfigSchema = new Schema({
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },

  // Channel Settings
  categoryId: { type: String },
  logChannelId: { type: String },
  supportRoles: { type: [String], default: [] },
  adminRoles: { type: [String], default: [] },

  // Panel Settings
  panelChannelId: { type: String },
  panelMessageId: { type: String },
  panelTitle: { type: String, default: "🎫 Support Tickets" },
  panelDescription: {
    type: String,
    default:
      "Create a support ticket by clicking the button below. Our team will help you as soon as possible!",
  },
  panelColor: { type: String, default: "#5865F2" },
  panelThumbnail: { type: String },

  // Ticket Settings
  maxTicketsPerUser: { type: Number, default: 3, min: 1, max: 10 },
  autoDeleteAfter: { type: Number, min: 1, max: 720 }, // max 30 days
  dmUserOnClose: { type: Boolean, default: true },
  requireReason: { type: Boolean, default: false },
  allowUserClose: { type: Boolean, default: true },
  mentionSupportOnCreate: { type: Boolean, default: false },

  // Categories
  categories: {
    type: Map,
    of: TicketCategoryConfigSchema,
    default: new Map([
      [
        "general",
        {
          name: "General Support",
          description: "General questions and support",
          emoji: "❓",
          color: "#5865F2",
          autoAssignRoles: [],
          requiredRoles: [],
        },
      ],
    ]),
  },
  defaultCategory: { type: String, default: "general" },

  // Auto Responses
  autoResponses: { type: [TicketAutoResponseSchema], default: [] },

  // Transcript Settings
  transcript: { type: TicketTranscriptSchema, default: () => ({}) },

  // Naming
  ticketNameFormat: { type: String, default: "{category}-{username}-{number}" },
  channelName: { type: String, default: "ticket-{username}" },

  // Permissions
  ticketPermissions: {
    viewTicket: { type: [String], default: [] },
    manageTickets: { type: [String], default: [] },
    closeAnyTicket: { type: [String], default: [] },
  },

  // Automation
  autoCloseInactive: { type: Boolean, default: false },
  inactiveHours: { type: Number, default: 72, min: 1, max: 720 },
  autoArchive: { type: Boolean, default: true },
  archiveCategoryId: { type: String },

  // Feedback
  collectFeedback: { type: Boolean, default: true },
  feedbackChannelId: { type: String },

  // Advanced
  customFields: { type: [CustomFieldSchema], default: [] },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
TicketConfigSchema.index({ guildId: 1 }, { unique: true });

// Pre-save middleware
TicketConfigSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Define interface for static methods
interface TicketConfigModel extends mongoose.Model<ITicketConfig> {
  findByGuild(guildId: string): Promise<ITicketConfig | null>;
  createDefault(guildId: string): Promise<ITicketConfig>;
}

// Static methods
TicketConfigSchema.statics.findByGuild = function (guildId: string) {
  return this.findOne({ guildId });
};

TicketConfigSchema.statics.createDefault = function (guildId: string) {
  return this.create({
    guildId,
    enabled: false,
    supportRoles: [],
    adminRoles: [],
    categories: new Map([
      [
        "general",
        {
          name: "General Support",
          description: "General questions and support",
          emoji: "❓",
          color: "#5865F2",
          autoAssignRoles: [],
          requiredRoles: [],
        },
      ],
      [
        "technical",
        {
          name: "Technical Support",
          description: "Technical issues and bugs",
          emoji: "🔧",
          color: "#FF6B35",
          autoAssignRoles: [],
          requiredRoles: [],
        },
      ],
      [
        "billing",
        {
          name: "Billing Support",
          description: "Payment and billing questions",
          emoji: "💰",
          color: "#4CAF50",
          autoAssignRoles: [],
          requiredRoles: [],
        },
      ],
    ]),
  });
};

// Instance methods
TicketConfigSchema.methods.addCategory = function (
  id: string,
  config: ITicketCategoryConfig,
) {
  this.categories.set(id, config);
  return this.save();
};

TicketConfigSchema.methods.removeCategory = function (id: string) {
  this.categories.delete(id);
  if (this.defaultCategory === id) {
    this.defaultCategory = "general";
  }
  return this.save();
};

TicketConfigSchema.methods.updateCategory = function (
  id: string,
  config: Partial<ITicketCategoryConfig>,
) {
  const existing = this.categories.get(id);
  if (existing) {
    this.categories.set(id, { ...existing, ...config });
    return this.save();
  }
  return Promise.resolve(this);
};

TicketConfigSchema.methods.canUserCreateTicket = function (
  userId: string,
  currentTicketCount: number,
) {
  return currentTicketCount < this.maxTicketsPerUser;
};

TicketConfigSchema.methods.hasPermission = function (
  userId: string,
  roles: string[],
  permission: keyof ITicketConfig["ticketPermissions"],
) {
  const requiredRoles = this.ticketPermissions[permission];
  if (requiredRoles.length === 0) return false;

  // Check if user has admin roles
  if (this.adminRoles.some((role: string) => roles.includes(role))) return true;

  // Check specific permission roles
  return requiredRoles.some((role: string) => roles.includes(role));
};

export default mongoose.model<ITicketConfig, TicketConfigModel>(
  "TicketConfig",
  TicketConfigSchema,
) as TicketConfigModel;
