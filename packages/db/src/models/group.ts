import { Schema, model, Document } from "mongoose";

export interface IGroup extends Document {
  telegramId: string;
  title?: string;
  settings: {
    aiEnabled: boolean;
    aiTrigger: "always" | "mention" | "replay";
    language: string;
    welcomeMessage?: string;
    aiSystemPrompt?: string;
  };
  moderation: {
    automodEnabled: boolean;
    aiModEnabled: boolean;
    bannedWords: string[];
    warnThreshold: number;
    spamProtection: boolean;
  };
  admins: string[];
  adSettings: {
    adsEnabled: boolean;
    adFrequency: number;
  };
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>({
  telegramId: { type: String, required: true, unique: true },
  title: String,

  settings: {
    aiEnabled: { type: Boolean, default: true },
    aiTrigger: {
      type: String,
      enum: ["mention", "reply", "always"],
      default: "mention",
    },
    language: { type: String, default: "ru" },
    welcomeMessage: String,
    aiSystemPrompt: String,
  },

  moderation: {
    automodEnabled: { type: Boolean, default: false },
    aiModEnabled: { type: Boolean, default: false },
    bannedWords: [String],
    warnThreshold: { type: Number, default: 3 },
    spamProtection: { type: Boolean, default: true },
  },

  admins: [String],

  adSettings: {
    adsEnabled: { type: Boolean, default: true },
    adFrequency: { type: Number, default: 5 },
  },

  createdAt: { type: Date, default: Date.now },
});

export const Group = model<IGroup>("Group", GroupSchema);
