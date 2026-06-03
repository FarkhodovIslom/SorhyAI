import { Bot, session } from 'grammy';
import type { BotContext, SessionData } from '../types.js';
import { createRedisStorage, getRedisClient } from '@sorhy/redis';

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Session middleware
  bot.use(session({
    initial: (): SessionData => ({}),
    storage: createRedisStorage<SessionData>(getRedisClient()),
  }));

  // Logger middleware
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[${ctx.updateType}] ${ms}ms — user: ${ctx.from?.id}`);
  });

  // /start команда
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 Привет, ${ctx.from?.first_name ?? 'друг'}!\n\n` +
      `Я Sorhy — AI ассистент нового поколения.\n\n` +
      `Просто напиши мне что-нибудь, и я отвечу`
    );
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}