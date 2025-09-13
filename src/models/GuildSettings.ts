import mongoose, { Document, Schema } from "mongoose";

export interface IGuildSettings extends Document {
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuildSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
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
