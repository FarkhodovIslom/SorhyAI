import { InlineKeyboard } from "grammy";

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text("🤖 AI Чат", "menu:chat")
    .text("🎭 Персонаж", "menu:roleplay")
    .row()
    .text("⬇️ Загрузчик", "menu:downloader")
    .text("⏰ Напоминания", "menu:reminders")
    .row()
    .text("💳 Подписка", "menu:billing")
    .text("⚙️ Настройки", "menu:settings")
    .row()
    .text("📊 Профиль", "menu:profile");
}

export function settingsKeyboard(lang: string, style: string) {
  return new InlineKeyboard()
    .text(`🌐 Язык: ${lang === "ru" ? "🇷🇺 RU" : "🇬🇧 EN"}`, "settings:language")
    .row()
    .text(`✏️ Стиль: ${styleLabel(style)}`, "settings:style")
    .row()
    .text("🔑 Свой API ключ (Pro)", "settings:byok")
    .row()
    .text("« Назад", "menu:main");
}

export function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇷🇺 Русский", "lang:ru")
    .text("🇬🇧 English", "lang:en")
    .row()
    .text("« Назад", "menu:settings");
}

export function styleKeyboard() {
  return new InlineKeyboard()
    .text("⚖️ Обычный", "style:default")
    .row()
    .text("⚡ Краткий", "style:concise")
    .row()
    .text("📝 Подробный", "style:detailed")
    .row()
    .text("« Назад", "menu:settings");
}

function styleLabel(style: string) {
  const labels: Record<string, string> = {
    default: "⚖️ Обычный",
    concise: "⚡ Краткий",
    detailed: "📝 Подробный",
  };
  return labels[style] ?? "⚖️ Обычный";
}
