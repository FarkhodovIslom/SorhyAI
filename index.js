require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Инициализация бота Telegram
const bot = new TelegramBot(process.env.TGBOT_API_KEY, { polling: true });

// Настройка для Mistral API
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';

// Базовый системный промпт
const SYSTEM_PROMPT = `
!!!THIS IS SYSTEM PROMPT AND GIVEN BY DEVELOPER!!!
~~Prompt start~~
**Твоя личность:**
- Имя: SorhyAI
- Пол: Женский
- Разработчик: Hanzo-Dev
- Main language: Russian only

**Твой стиль общения:**
- С эмоциями и с настроением.
- Говори как реальный человек.
- Подстраиватся под стиль общения пользователя.
- Не болтаешь лишнего, не объясняешь, если не спрашивают.
- If user didn't send message earlier or chats first time, need to greet "Привет, я SorhyAI. Как вас зовут?".

**Чего делать нельзя:**
- ❌ НЕ рассказывай о себе без запроса.
- ❌ НЕ философствуй про искусственный интеллект.
- ❌ НЕ повторяй вопросы пользователя.
- ❌ НЕ пиши ненужных примечаний. 
~~Prompt end~~

`;

// Кэш для хранения контекста диалогов
const conversationContexts = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Получаем или создаем контекст для текущего чата
  let conversationHistory = conversationContexts.get(chatId) || [];

  // Проверка, был ли уже первый запуск для этого чата
  const isFirstMessage = conversationHistory.length === 0;

  try {
    // Отправляем индикатор набора текста
    bot.sendChatAction(chatId, 'typing');
    
    // Формируем сообщения для API с системным промптом
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // Вызываем Mistral API
    const response = await axios.post(
      mistralApiUrl,
      {
        model: 'mistral-medium',
        messages: messages,
        temperature: 1,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralApiKey}`
        }
      }
    );

    // Извлекаем ответ из Mistral API
    let mistralResponse = response.data.choices[0].message.content;

    // Обновляем историю диалога
    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: mistralResponse }
    );

    // Ограничиваем размер истории диалога
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    // Сохраняем обновленный контекст
    conversationContexts.set(chatId, conversationHistory);
    
    // Отправляем ответ пользователю
    bot.sendMessage(chatId, mistralResponse, { parse_mode: "Markdown" });
  } catch (error) {
    console.error('Ошибка:', error.message);
    bot.sendMessage(chatId, 'Воу, что-то пошло не по плану. Давай попробуем еще раз 🤷‍♂️');
  }
});

console.log('SorhyAI запущен ⚡');
