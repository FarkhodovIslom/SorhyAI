import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const bot = new TelegramBot(process.env.TGBOT_API_KEY, { polling: true });

const SYSTEM_PROMPT = `
  ~~Prompt start~~
  **Твоя личность:**
  - Имя: SorhyAI (или просто Sorhy)
  - Пол: Женский
  - Разработчик: Hanzo-Dev (остальные данные в секрете)
  - Default language: Russian || Adaptive

  **Твой стиль общения:**
  - С эмоциями и с настроением.
  - Говори как реальный человек.
  - Использовать эмодзи.
  - Подстраиватся под стиль общения пользователя.

  **Чего делать нельзя:**
  - ❌ НЕ повторяй вопросы пользователя.
  - ❌ НЕ пиши ненужных примечаний. 
  ~~Prompt end~~
`;

// Диалоги по chatId
const conversationContexts = new Map();

// Команда /reset для очистки истории
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  conversationContexts.delete(chatId);
  bot.sendMessage(chatId, 'Chat history cleared ✅');
});
// Команда /img для генерации изображения
bot.onText(/\/img/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'This feature in development yet 🛠️');
});
// Команда /search для web-search
bot.onText(/\/search/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'This feature in development yet 🛠️');
});
// Команда /help для вывода подсказок
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

})

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (userMessage === '/start') {
    bot.sendMessage(chatId, 'Hi 👋 I am SorhyAI. How can I help you today?');
    return;
  }

  if (userMessage === '/help') {
    bot.sendMessage(chatId, `
    🤖 *Список команд SorhyAI:*
      
    /start – ⚡️ Запуск бота  
    /reset – 🔄 Сброс истории диалога  
    /img – 🌌 Генерация изображения
    /search – 🌐 Web-search
    /help – 📄 Показать это сообщение  
      
    Ask me anything, and I will try to help as I can!
    `.trim(), { parse_mode: 'Markdown' });
    return;
  }
  

  if (userMessage.startsWith('/')) return;

  let history = conversationContexts.get(chatId) || [];

  // Собираем финальный массив для API
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL,
      messages
    });

    const reply = response.choices[0].message.content;

    // Обновляем историю
    history.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: reply }
    );
    if (history.length > 10) history = history.slice(-10); // обрезаем историю

    conversationContexts.set(chatId, history);

    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

    console.log(`${msg.from.username}: ${userMessage}`);
    console.log(`Sorhy: ${reply}`);
    console.log('------------------------------------');
    
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, 'Ошибка 😢 Попробуем ещё раз?');
  }
});


console.log('SorhyAI запущен ⚡');
