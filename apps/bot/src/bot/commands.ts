import type { BotContext } from "../types";
import { mainMenuKeyboard } from "../keyboards/main";

export async function startCommand(ctx: BotContext) {
  const name = ctx.from?.first_name || "друг";

  await ctx.reply(
    `👋 Привет, <b>${name}</b>!\n\n` +
      `Я <b>Sorhy</b> — AI ассистент нового поколения.\n\n` +
      `🤖 Умный чат с памятью\n` +
      `🎭 Персонажи и ролевые игры\n` +
      `⬇️ Загрузчик медиа\n` +
      `⏰ Напоминания и задачи\n\n` +
      `Выбери что тебя интересует:`,
    {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(),
    },
  );
}

export async function helpCommand(ctx: BotContext) {
  await ctx.reply(
    `<b>📖 Команды Sorhy</b>\n\n` +
      `<b>Основные:</b>\n` +
      `/start — главное меню\n` +
      `/help — список команд\n` +
      `/settings — настройки\n` +
      `/profile — профиль и статистика\n\n` +
      `<b>AI:</b>\n` +
      `/new — начать новый диалог\n` +
      `/mode — сменить режим ответов\n\n` +
      `<b>Загрузчик:</b>\n` +
      `/download <url> — скачать видео/аудио\n\n` +
      `<b>Напоминания:</b>\n` +
      `/remind 30m текст — через 30 минут\n` +
      `/remind daily 09:00 текст — каждый день\n` +
      `/tasks — список напоминаний\n\n` +
      `<b>Группы:</b>\n` +
      `/warn @user — предупреждение\n` +
      `/ban @user — бан\n` +
      `/mute @user — мут`,
    { parse_mode: "HTML" },
  );
}
