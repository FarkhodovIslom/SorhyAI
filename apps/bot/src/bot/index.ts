import { Bot, session } from "grammy";
import type { BotContext, SessionData } from "../types.js";
import { createRedisStorage, getRedisClient } from "@sorhy/redis";
import { startCommand, helpCommand } from "./commands.js";
import { handleCallbacks } from "./callbacks.js";

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Session middleware
  bot.use(
    session({
      initial: (): SessionData => ({}),
      storage: createRedisStorage<SessionData>(getRedisClient()),
    }),
  );

  // Logger middleware
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[${ctx.updateType}] ${ms}ms — user: ${ctx.from?.id}`);
  });

  // Команды
  bot.command("start", startCommand);
  bot.command("help", helpCommand);

  // Коллбеки
  bot.on("callback_query:data", handleCallbacks);

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}
