import mongoose, { type Document, Schema } from "mongoose";

export type CustomCommandType =
	| "response"
	| "embed"
	| "code"
	| "image"
	| "random_image"
	| "welcome"
	| "goodbye"
	| "reaction_role"
	| "auto_responder"
	| "timer"
	| "counter"
	| "poll";

export type TriggerType =
	| "exact"
	| "contains"
	| "starts_with"
	| "regex"
	| "slash"
	| "event"
	| "random"
	| "interval";

export type EventType =
	| "member_join"
	| "member_leave"
	| "message_send"
	| "reaction_add"
	| "role_add"
	| "role_remove"
	| "voice_join"
	| "voice_leave";

export interface ICustomCommandResponse {
	type: "text" | "embed" | "image" | "file" | "mixed";
	content?: string;
	embedTitle?: string;
	embedDescription?: string;
	embedColor?: string;
	embedFooter?: string;
	embedThumbnail?: string;
	embedImage?: string;
	embedFields?: Array<{ name: string; value: string; inline: boolean }>;
	images?: string[];
	files?: string[];
	tts?: boolean;
	ephemeral?: boolean;
	allowedMentions?: {
		parse?: Array<"users" | "roles" | "everyone">;
		users?: string[];
		roles?: string[];
	};
}

export interface ICustomCommandCode {
	language: "javascript";
	source: string;
	timeout?: number;
}

export interface ICustomCommandCooldown {
	global?: number;
	user?: number;
	channel?: number;
	guild?: number;
}

export interface ICustomCommandPermissions {
	allowedRoles?: string[];
	blockedRoles?: string[];
	allowedUsers?: string[];
	blockedUsers?: string[];
	allowedChannels?: string[];
	blockedChannels?: string[];
	requireBotPermissions?: string[];
	requireUserPermissions?: string[];
}

export interface ICustomCommandVariables {
	name: string;
	type: "string" | "number" | "boolean" | "array";
	defaultValue: string | number | boolean | string[];
	description?: string;
}

export interface ICustomCommandRandom {
	chance: number;
	interval?: number;
	channels?: string[];
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ICustomCommand extends Document {
	guildId: string;

	name: string;
	description: string;
	aliases: string[];

	type: CustomCommandType;
	triggerType: TriggerType;
	trigger: string;
	regexFlags?: string;

	response?: ICustomCommandResponse;
	code?: ICustomCommandCode;

	eventType?: EventType;

	permissions?: ICustomCommandPermissions;
	cooldown?: ICustomCommandCooldown;
	variables?: ICustomCommandVariables[];

	random?: ICustomCommandRandom;

	enabled: boolean;
	deleted: boolean;
	approvalStatus: ApprovalStatus;
	approvalMessageId?: string;
	rejectionReason?: string;
	approvedBy?: string;
	approvedAt?: Date;

	usageCount: number;
	lastUsed?: Date;
	createdAt: Date;
	updatedAt: Date;
	createdBy: string;
}

const CustomCommandResponseSchema = new Schema(
	{
		type: { type: String, default: "text" },
		content: { type: String, default: null },
		embedTitle: { type: String, default: null },
		embedDescription: { type: String, default: null },
		embedColor: { type: String, default: null },
		embedFooter: { type: String, default: null },
		embedThumbnail: { type: String, default: null },
		embedImage: { type: String, default: null },
		embedFields: [
			{
				name: String,
				value: String,
				inline: { type: Boolean, default: false },
			},
		],
		images: { type: [String], default: [] },
		files: { type: [String], default: [] },
		tts: { type: Boolean, default: false },
		ephemeral: { type: Boolean, default: false },
		allowedMentions: {
			parse: { type: [String], default: null },
			users: { type: [String], default: null },
			roles: { type: [String], default: null },
		},
	},
	{ _id: false },
);

const CustomCommandCodeSchema = new Schema(
	{
		language: { type: String, default: "javascript" },
		source: { type: String, required: true },
		timeout: { type: Number, default: 5000 },
	},
	{ _id: false },
);

const CustomCommandCooldownSchema = new Schema(
	{
		global: { type: Number, default: null },
		user: { type: Number, default: null },
		channel: { type: Number, default: null },
		guild: { type: Number, default: null },
	},
	{ _id: false },
);

const CustomCommandPermissionsSchema = new Schema(
	{
		allowedRoles: { type: [String], default: [] },
		blockedRoles: { type: [String], default: [] },
		allowedUsers: { type: [String], default: [] },
		blockedUsers: { type: [String], default: [] },
		allowedChannels: { type: [String], default: [] },
		blockedChannels: { type: [String], default: [] },
		requireBotPermissions: { type: [String], default: [] },
		requireUserPermissions: { type: [String], default: [] },
	},
	{ _id: false },
);

const CustomCommandVariablesSchema = new Schema(
	{
		name: { type: String, required: true },
		type: { type: String, default: "string" },
		defaultValue: { type: Schema.Types.Mixed, default: "" },
		description: { type: String, default: null },
	},
	{ _id: false },
);

const CustomCommandRandomSchema = new Schema(
	{
		chance: { type: Number, default: 0, min: 0, max: 100 },
		interval: { type: Number, default: null },
		channels: { type: [String], default: [] },
	},
	{ _id: false },
);

const CustomCommandSchema = new Schema({
	guildId: { type: String, required: true, index: true },

	name: { type: String, required: true },
	description: { type: String, default: "" },
	aliases: { type: [String], default: [] },

	type: { type: String, default: "response" },
	triggerType: { type: String, default: "exact" },
	trigger: { type: String, required: true },
	regexFlags: { type: String, default: "i" },

	response: { type: CustomCommandResponseSchema, default: null },
	code: { type: CustomCommandCodeSchema, default: null },

	eventType: { type: String, default: null },

	permissions: { type: CustomCommandPermissionsSchema, default: () => ({}) },
	cooldown: { type: CustomCommandCooldownSchema, default: () => ({}) },
	variables: { type: [CustomCommandVariablesSchema], default: [] },

	random: { type: CustomCommandRandomSchema, default: null },

	enabled: { type: Boolean, default: true },
	deleted: { type: Boolean, default: false },
	approvalStatus: { type: String, default: "approved", enum: ["pending", "approved", "rejected"] },
	approvalMessageId: { type: String, default: null },
	rejectionReason: { type: String, default: null },
	approvedBy: { type: String, default: null },
	approvedAt: { type: Date, default: null },

	usageCount: { type: Number, default: 0 },
	lastUsed: { type: Date, default: null },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	createdBy: { type: String, required: true },
});

CustomCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });
CustomCommandSchema.index({ guildId: 1, trigger: 1 });
CustomCommandSchema.index({ guildId: 1, aliases: 1 });
CustomCommandSchema.index({ guildId: 1, enabled: 1, deleted: 1 });
CustomCommandSchema.index({ guildId: 1, triggerType: 1, eventType: 1 });

CustomCommandSchema.pre("save", function () {
	try {
		(this as any).updatedAt = new Date(Date.now());
	} catch (e) {}
});

export default mongoose.model<ICustomCommand>(
	"CustomCommand",
	CustomCommandSchema,
);
