import { Schema, model, Document } from "mongoose";

export interface IMessage {
  role: "user" | "assistant" | "tool";
  content: string | object;
  toolName?: string;
  toolCallId?: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: string;
  chatId: string;
  messages: IMessage[];
  roleplay: {
    active: boolean;
    systemPrompt: string;
    characterName: string;
  };
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  userId: { type: String, required: true },
  chatId: { type: String, required: true },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant", "tool"] },
      content: Schema.Types.Mixed,
      toolName: String,
      toolCallId: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],

  roleplay: {
    active: { type: Boolean, default: false },
    systemPrompt: String,
    characterName: String,
  },
  updatedAt: { type: Date, default: Date.now },
});

ConversationSchema.index({ userId: 1, chatId: 1 });

export const Conversation = model<IConversation>(
  "Conversation",
  ConversationSchema,
);
