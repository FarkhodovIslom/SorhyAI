import type { BotContext } from "../types";
import { mainMenuKeyboard } from "../keyboards/main";

export async function startCommand(ctx: BotContext) {
  const name = ctx.from?.first_name || "friend";

  await ctx.reply(
    `👋 Hello, <b>${name}</b>!\n\n` +
      `I'm <b>Sorhy</b> — a next-generation AI assistant.\n\n` +
      `🤖 Smart chat with memory\n` +
      `🎭 Characters and roleplay\n` +
      `⬇️ Media downloader\n` +
      `⏰ Reminders and tasks\n\n` +
      `Choose what interests you:`,
    {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(),
    },
  );
}

export async function helpCommand(ctx: BotContext) {
  await ctx.reply(
    `<b>📖 Sorhy Commands</b>\n\n` +
      `<b>Main:</b>\n` +
      `/start — main menu\n` +
      `/help — command list\n` +
      `/settings — settings\n` +
      `/profile — profile and stats\n\n` +
      `<b>AI:</b>\n` +
      `/new — start a new conversation\n` +
      `/mode — change response mode\n\n` +
      `<b>Downloader:</b>\n` +
      `/download <url> — download video/audio\n\n` +
      `<b>Reminders:</b>\n` +
      `/remind 30m text — in 30 minutes\n` +
      `/remind daily 09:00 text — every day\n` +
      `/tasks — reminder list\n\n` +
      `<b>Groups:</b>\n` +
      `/warn @user — warn\n` +
      `/ban @user — ban\n` +
      `/mute @user — mute`,
    { parse_mode: "HTML" },
  );
}