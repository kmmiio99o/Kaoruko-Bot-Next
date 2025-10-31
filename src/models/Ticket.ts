import mongoose, { Document, Schema } from "mongoose";

export interface ITicketUser {
  userId: string;
  username: string;
  discriminator?: string;
  addedAt: Date;
}

export interface ITicketMessage {
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachments: string[];
  timestamp: Date;
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  WAITING = "waiting",
  CLOSED = "closed",
  ARCHIVED = "archived"
}

export enum TicketPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}

export enum TicketCategory {
  GENERAL = "general",
  TECHNICAL = "technical",
  BILLING = "billing",
  MODERATION = "moderation",
  PARTNERSHIP = "partnership",
  REPORT = "report",
  OTHER = "other"
}

export interface ITicket extends Document {
  guildId: string;
  ticketId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  users: ITicketUser[];
  messages: ITicketMessage[];
  tags: string[];
  closedBy?: string;
  closedAt?: Date;
  closeReason?: string;
  reopenCount: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    parentCategoryId?: string;
    originalChannelId?: string;
    claimedBy?: string;
    claimedAt?: Date;
    escalatedBy?: string;
    escalatedAt?: Date;
    rating?: number;
    feedback?: string;
  };
}

const TicketUserSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  discriminator: { type: String },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const TicketMessageSchema = new Schema({
  messageId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  attachments: { type: [String], default: [] },
  timestamp: { type: Date, required: true }
}, { _id: false });

const TicketSchema = new Schema({
  guildId: { type: String, required: true },
  ticketId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 100 },
  category: {
    type: String,
    enum: Object.values(TicketCategory),
    default: TicketCategory.GENERAL
  },
  priority: {
    type: String,
    enum: Object.values(TicketPriority),
    default: TicketPriority.NORMAL
  },
  status: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN
  },
  description: { type: String, maxlength: 1000 },
  assignedTo: { type: String },
  assignedBy: { type: String },
  assignedAt: { type: Date },
  users: { type: [TicketUserSchema], default: [] },
  messages: { type: [TicketMessageSchema], default: [] },
  tags: { type: [String], default: [] },
  closedBy: { type: String },
  closedAt: { type: Date },
  closeReason: { type: String, maxlength: 500 },
  reopenCount: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: {
    parentCategoryId: { type: String },
    originalChannelId: { type: String },
    claimedBy: { type: String },
    claimedAt: { type: Date },
    escalatedBy: { type: String },
    escalatedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 1000 }
  }
});

// Indexes for better performance
TicketSchema.index({ guildId: 1, status: 1 });
TicketSchema.index({ guildId: 1, authorId: 1 });
TicketSchema.index({ guildId: 1, assignedTo: 1 });
TicketSchema.index({ guildId: 1, createdAt: -1 });
TicketSchema.index({ ticketId: 1 }, { unique: true });
TicketSchema.index({ channelId: 1 }, { unique: true });

// Pre-save middleware
TicketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Static methods
TicketSchema.statics.generateTicketId = function(guildId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${guildId.substr(-4)}-${timestamp}-${random}`.toUpperCase();
};

TicketSchema.statics.findByGuildAndStatus = function(guildId: string, status?: TicketStatus) {
  const query: any = { guildId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

TicketSchema.statics.findByUser = function(guildId: string, userId: string) {
  return this.find({
    guildId,
    $or: [
      { authorId: userId },
      { assignedTo: userId },
      { 'users.userId': userId }
    ]
  }).sort({ createdAt: -1 });
};

TicketSchema.statics.getGuildStats = function(guildId: string) {
  return this.aggregate([
    { $match: { guildId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
      }
    }
  ]);
};

// Instance methods
TicketSchema.methods.addUser = function(userId: string, username: string, discriminator?: string) {
  const existingUser = this.users.find((user: ITicketUser) => user.userId === userId);
  if (!existingUser) {
    this.users.push({
      userId,
      username,
      discriminator,
      addedAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

TicketSchema.methods.removeUser = function(userId: string) {
  this.users = this.users.filter((user: ITicketUser) => user.userId !== userId);
  return this.save();
};

TicketSchema.methods.addMessage = function(messageId: string, authorId: string, authorName: string, content: string, attachments: string[] = []) {
  this.messages.push({
    messageId,
    authorId,
    authorName,
    content,
    attachments,
    timestamp: new Date()
  });
  this.lastActivity = new Date();
  return this.save();
};

TicketSchema.methods.updateStatus = function(status: TicketStatus, userId?: string) {
  this.status = status;
  this.lastActivity = new Date();

  if (status === TicketStatus.CLOSED && userId) {
    this.closedBy = userId;
    this.closedAt = new Date();
  }

  return this.save();
};

TicketSchema.methods.assignTo = function(userId: string, assignedBy: string) {
  this.assignedTo = userId;
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
  this.lastActivity = new Date();
  return this.save();
};

TicketSchema.methods.reopen = function() {
  this.status = TicketStatus.OPEN;
  this.reopenCount += 1;
  this.closedBy = undefined;
  this.closedAt = undefined;
  this.closeReason = undefined;
  this.lastActivity = new Date();
  return this.save();
};

export default mongoose.model<ITicket>("Ticket", TicketSchema);
