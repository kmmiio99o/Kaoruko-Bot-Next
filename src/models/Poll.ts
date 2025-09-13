import mongoose, { Document, Schema } from "mongoose";

export interface IPoll extends Document {
  messageId: string;
  channelId: string;
  guildId: string;
  creatorId: string;
  question: string;
  options: Array<{
    letter: string;
    emoji: string;
    text: string;
  }>;
  anonymous: boolean;
  createdAt: Date;
  endsAt: Date | null;
  votes: Record<string, string>; // userId -> selectedOption
}

const PollSchema = new Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  creatorId: { type: String, required: true },
  question: { type: String, required: true },
  options: [
    {
      letter: String,
      emoji: String,
      text: String,
    },
  ],
  anonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  endsAt: { type: Date, default: null },
  votes: { type: Schema.Types.Mixed, default: {} },
});

export default mongoose.model<IPoll>("Poll", PollSchema);
