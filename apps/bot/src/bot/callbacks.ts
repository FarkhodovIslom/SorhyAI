import type { BotContext } from "../types";
import {
  mainMenuKeyboard,
  settingsKeyboard,
  languageKeyboard,
  styleKeyboard,
} from "../keyboards/index";
import { User } from "@sorhy/db";

export async function handleCallbacks(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  await ctx.answerCallbackQuery();

  switch (data) {
    case "menu:main":
      await ctx.editMessageText("🏠 <b>Главное меню</b>\n\nВыбери раздел:", {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(),
      });
      break;

    case "menu:chat":
      await ctx.editMessageText(
        "🤖 <b>AI Чат</b>\n\nПросто напиши мне сообщение, и я отвечу.\n\n" +
          "Я запоминаю контекст разговора 🧠",
        {
          parse_mode: "HTML",
          reply_markup: new (await import("grammy")).InlineKeyboard().text(
            "« Назад",
            "menu:main",
          ),
        },
      );
      break;

    case "menu:settings":
      await showSettings(ctx);
      break;

    case "settings:language":
      await ctx.editMessageText("🌐 <b>Выбери язык</b>", {
        parse_mode: "HTML",
        reply_markup: languageKeyboard(),
      });
      break;

    case "settings:style":
      await ctx.editMessageText(
        "✏️ <b>Стиль ответов</b>\n\n" +
          "⚖️ Обычный — сбалансированные ответы\n" +
          "⚡ Краткий — коротко и по делу\n" +
          "📝 Подробный — максимум деталей",
        { parse_mode: "HTML", reply_markup: styleKeyboard() },
      );
      break;

    case "lang:ru":
    case "lang:en": {
      const lang = data.split(":")[1]!;
      if (ctx.from?.id) {
        await User.updateOne(
          { telegramId: String(ctx.from.id) },
          { "settings.language": lang },
        );
      }
      await ctx.answerCallbackQuery(`✅ Язык изменён`);
      await showSettings(ctx);
      break;
    }

    case "style:default":
    case "style:concise":
    case "style:detailed": {
      const style = data.split(":")[1]!;
      if (ctx.from?.id) {
        await User.updateOne(
          { telegramId: String(ctx.from.id) },
          { "settings.responseStyle": style },
        );
      }
      await ctx.answerCallbackQuery(`✅ Стиль изменён`);
      await showSettings(ctx);
      break;
    }

    case "menu:profile":
      await showProfile(ctx);
      break;
  }
}

async function showSettings(ctx: BotContext) {
  const user = await User.findOne({ telegramId: String(ctx.from?.id) });
  const lang = user?.settings.language ?? "ru";
  const style = user?.settings.responseStyle ?? "default";

  await ctx.editMessageText("⚙️ <b>Настройки</b>", {
    parse_mode: "HTML",
    reply_markup: settingsKeyboard(lang, style),
  });
}

async function showProfile(ctx: BotContext) {
  const user = await User.findOne({ telegramId: String(ctx.from?.id) });

  const plan = user?.subscription?.plan === "pro" ? "Pro" : "Free";
  const credits = user?.credits?.balance ?? 0;
  const msgs = user?.usage?.dailyMessages ?? 0;

  await ctx.editMessageText(
    `👤 <b>Профиль</b>\n\n` +
      `📛 Имя: ${ctx.from?.first_name ?? "—"}\n` +
      `🆔 ID: <code>${ctx.from?.id}</code>\n` +
      `📦 План: ${plan}\n` +
      `💰 Кредиты: ${credits}\n` +
      `💬 Сообщений сегодня: ${msgs}`,
    {
      parse_mode: "HTML",
      reply_markup: new (await import("grammy")).InlineKeyboard().text(
        "« Назад",
        "menu:main",
      ),
    },
  );
}
