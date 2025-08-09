import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import chalk from 'chalk';
import fs from 'fs';
import express from 'express';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { generateSystemPrompt } from './prompt/systemPrompt.js';
import { 
  LANGUAGES,
  localization,
  getUserLanguage,
  getLocalized,
  createLanguageKeyboard
} from './localization/localization.js';

import {  
  PORT,
  DEVELOPER_ID,
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_CHARS,
  MODEL_EMOJIS,
  MONGO_URI,
  MODEL_TEMP,
  MODEL_TOP_P
} from './config/config.js';

// Импортируем наш новый менеджер пользователей
import { UserDataManager } from './database/userManager.js';
// Импортируем новый command handler
import { CommandHandler } from './handlers/commandHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.OPENROUTER_API_KEY) {
  console.error(chalk.red('❌ Missing environment variable: OPENROUTER_API_KEY'));
  process.exit(1);
}

if (!process.env.TGBOT_API_KEY || !process.env.TGBOT_API_KEY2) {
  console.error(chalk.red('❌ Missing environment variable: TGBOT_API_KEY'));
  process.exit(1);
}

if (!process.env.DEV_ACCESS_KEY) {
  console.error(chalk.red('❌ Missing environment variable: DEV_ACCESS_KEY'));
  process.exit(1);
}



// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});



// Инициализация Telegram бота
const bot = new TelegramBot(process.env.TGBOT_API_KEY, { polling: true });



// Инициализация менеджера пользователей с MongoDB
const userManager = new UserDataManager(
  process.env.MONGODB_URI || MONGO_URI,
  process.env.DB_NAME || 'sorhy'
);



// Инициализация command handler
const commandHandler = new CommandHandler(bot, userManager);



// Переменные бота
let botUsername = '';
let botId = '';
const version = process.env.VERSION;

// Антиспам система
const COOLDOWN_TIME = 10000; // 10 секунд в миллисекундах
const userCooldowns = new Map();



/**
 * Проверка cooldown пользователя
 */
function checkCooldown(userId) {
  const now = Date.now();
  const lastMessage = userCooldowns.get(userId);
  
  if (lastMessage && (now - lastMessage) < COOLDOWN_TIME) {
    const remainingTime = Math.ceil((COOLDOWN_TIME - (now - lastMessage)) / 1000);
    return { blocked: true, remainingTime };
  }
  
  return { blocked: false };
}

/**
 * Установка cooldown для пользователя
 */
function setCooldown(userId) {
  userCooldowns.set(userId, Date.now());
}

/**
 * Очистка старых cooldown записей (каждые 5 минут)
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of userCooldowns.entries()) {
    if (now - timestamp > COOLDOWN_TIME * 2) { // Удаляем записи старше 20 секунд
      userCooldowns.delete(userId);
    }
  }
}, 300000); // Каждые 5 минут



/**
 * Инициализация приложения
 */
async function initializeApp() {
  console.log(chalk.blue('🚀 Запуск Telegram бота...'));
  
  // Подключаемся к MongoDB
  const mongoConnected = await userManager.connect();
  if (!mongoConnected) {
    console.error(chalk.red('❌ Не удалось подключиться к MongoDB. Бот может работать нестабильно.'));
    // Можем продолжить работу без БД, но с ограниченным функционалом
  }
  
  // Инициализируем бота
  try {
    const botInfo = await bot.getMe();
    botUsername = botInfo.username;
    botId = botInfo.id;
    console.log(chalk.green(`🤖 Бот @${botUsername} (${botId}) активен!`));
  } catch (error) {
    console.error(chalk.red('❌ Ошибка инициализации бота:'), error);
    process.exit(1);
  }
}



/**
 * Экранирует специальные символы для Markdown
 */
function escapeMarkdown(text) {
  // Если текст содержит сложные структуры, лучше отправить как plain text
  const hasComplexMarkdown = /[*_`\[\]()~>#+\-=|{}\.!\\]/g.test(text);
  
  if (!hasComplexMarkdown) {
    return text;
  }
  
  // Простое экранирование только критичных символов
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`');
}



/**
 * Логирование сообщений
 */
function logMessage({ first_name, username, userMessage, reply, isDeveloper, modelName = 'Unknown' }) {
  const now = new Date();
  const tzOffsetMs = 5 * 60 * 60 * 1000;
  const localTime = new Date(now.getTime() + tzOffsetMs);
  const time = localTime.toLocaleString('uz-UZ');

  console.log(chalk.red('┌────────────────────────────────────────────'));
  console.log(`${chalk.red('│')} ${chalk.cyan.bold(time)} ${isDeveloper ? chalk.magenta('[DEV]') : ''}`);
  console.log(`${chalk.red('│')} ${chalk.green(`${first_name} [${username || 'unknown'}]:`)} ${chalk.white(userMessage.slice(0, 100))}${userMessage.length > 100 ? '...' : ''}`);
  console.log(`${chalk.red('│')} ${chalk.yellow(`Sorhy [${modelName}] ➤`)} ${chalk.white(reply.slice(0, 100))}${reply.length > 100 ? '...' : ''}`);
  console.log(chalk.red('└────────────────────────────────────────────\n'));
  
  // Асинхронное логирование в файл для не-разработчиков
  if (!isDeveloper) {
    const logEntry = `
\n${'='.repeat(80)}\n
${time} | 
${first_name} [${username || 'unknown'}]: ${userMessage}
\nSorhy [${modelName}] ➤ ${reply}
\n${'='.repeat(80)}\n
`;
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    fs.appendFile('logs/sorhy-log.txt', logEntry, (err) => {
      if (err) console.error('Ошибка записи лога:', err);
    });
  }
}

/**
 * Проверка нужности ответа в группе
 */
function shouldRespondInGroup(msg) {
  const isGroup = msg.chat.type.endsWith('group');
  if (!isGroup) return true;
  
  const botWasMentioned = msg.entities?.some(entity =>
    entity.type === 'mention' &&
    msg.text && msg.text.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`
  );
  const isReplyToBot = msg.reply_to_message?.from?.id === botId;
  
  return botWasMentioned || isReplyToBot;
}

/**
 * Получение текста сообщения
 */
function getMessageText(msg) {
  let userMessage = msg.text;
  const isGroup = msg.chat.type.endsWith('group');
  const botWasMentioned = msg.entities?.some(entity =>
    entity.type === 'mention' &&
    msg.text?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`
  );
  
  if (isGroup && botWasMentioned) {
    userMessage = userMessage.replace(`@${botUsername}`, '').trim();
  }
  
  return userMessage;
}

/**
 * Генерация AI ответа
 */
async function generateAIResponse(chatId, userMessage) {
  const user = await userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: user.model,
    messages,
    temperature: MODEL_TEMP,
    top_p: MODEL_TOP_P,
    max_tokens: 1000
  });
  
  const reply = response.choices[0].message.content;
  
  // Добавляем в историю
  user.addToHistory(userMessage, reply, MAX_HISTORY_LENGTH, MAX_HISTORY_CHARS);
  
  // Асинхронно сохраняем пользователя
  userManager.saveUser(chatId, user).catch(err => {
    console.error(chalk.red(`Ошибка сохранения пользователя ${chatId}:`), err);
  });
  
  return reply;
}

/**
 * Генерация AI ответа с изображением
 */
async function generateAIResponseWithImage(chatId, userMessage, imageBase64) {
  const user = await userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const imageMessage = {
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageBase64}`
    }
  };
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history.map(h => ({ role: h.role, content: h.content })),
    { 
      role: 'user', 
      content: [
        imageMessage,
        { type: "text", text: userMessage }
      ]
    }
  ];

  const response = await openai.chat.completions.create({
    model: user.model,
    messages,
    temperature: MODEL_TEMP,
    top_p: MODEL_TOP_P,
    max_tokens: 1000
  });
  
  const reply = response.choices[0].message.content;
  
  // Сохраняем в историю без изображения
  user.addToHistory(`[IMAGE] ${userMessage}`, reply, MAX_HISTORY_LENGTH, MAX_HISTORY_CHARS);
  
  // Асинхронно сохраняем
  userManager.saveUser(chatId, user).catch(err => {
    console.error(chalk.red(`Ошибка сохранения пользователя ${chatId}:`), err);
  });
  
  return reply;
}

/**
 * Получение base64 изображения
 */
async function getImageBase64(fileInfo) {
  try {
    const fileLink = await bot.getFileLink(fileInfo.file_id);
    const response = await fetch(fileLink);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error('Ошибка при получении base64 изображения:', error);
    throw error;
  }
}

/**
 * Проверка поддержки изображений моделью
 */
function modelSupportsImages(modelName) {
  return modelName === process.env.MODEL_PRO || modelName === process.env.MODEL_X;
}

// Обработчик callback query
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  if (data.startsWith('lang_')) {
    const langCode = data.split('_')[1];
    const language = LANGUAGES[langCode];
    
    if (language) {
      const user = await userManager.getUser(chatId);
      user.language = language;
      user.updateActivity();
      await userManager.saveUser(chatId, user);
      
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'languageChanged'));
      
      if (user.history.length === 0) {
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage'));
      }
    }
  }
});

// Основной обработчик сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isDeveloper = userId === DEVELOPER_ID;
  
  // Проверяем cooldown (разработчик освобожден от ограничений)
  if (!isDeveloper) {
    const cooldownCheck = checkCooldown(userId);
    if (cooldownCheck.blocked) {
      console.log(chalk.yellow(`⏰ Пользователь ${msg.from.first_name} [${msg.from.username}] заблокирован на ${cooldownCheck.remainingTime}с`));
      
      // Отправляем предупреждение о cooldown (можно убрать если не хочешь показывать пользователю)
      const user = await userManager.getUser(chatId);
      const cooldownMessages = {
        'ru': `⏱️ Подождите ${cooldownCheck.remainingTime} секунд перед отправкой следующего сообщения.`,
        'en': `⏱️ Please wait ${cooldownCheck.remainingTime} seconds before sending the next message.`,
        'uz': `⏱️ Keyingi xabar yuborish uchun ${cooldownCheck.remainingTime} soniya kuting.`
      };
      
      const cooldownMessage = cooldownMessages[user.language] || cooldownMessages['en'];
      
      // Отправляем уведомление только если прошло больше 3 секунд с последнего уведомления
      const lastNotification = userCooldowns.get(`notification_${userId}`) || 0;
      const now = Date.now();
      
      if (now - lastNotification > 3000) {
        userCooldowns.set(`notification_${userId}`, now);
        await bot.sendMessage(chatId, cooldownMessage, {
          reply_to_message_id: msg.message_id
        });
      }
      return;
    }
  }
  
  const user = await userManager.getUser(chatId);
  
  // Проверяем язык
  if (!user.language && (!msg.text || msg.text !== '/start')) {
    await bot.sendMessage(
      chatId, 
      'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
      createLanguageKeyboard()
    );
    return;
  }
  
  if (!shouldRespondInGroup(msg)) return;
  
  const userModel = user.model;
  const modelName = userModel.split('/').pop();
  
  let userMessage = '';
  let imageData = null;
  
  if (msg.photo) {
    if (!modelSupportsImages(userModel)) {
      return bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'imageNotSupported'), {
        reply_to_message_id: msg.message_id
      });
    }
    
    const photo = msg.photo[msg.photo.length - 1];
    try {
      imageData = await getImageBase64(photo);
      userMessage = msg.caption || 'What do you see in this image?';
    } catch (err) {
      console.error('Ошибка при обработке изображения:', err);
      return bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'errorMessage'));
    }
  } else if (msg.text) {
    userMessage = getMessageText(msg);
    
    
    if (await commandHandler.handleCommand(chatId, userMessage)) {
      return;
    }
  } else {
    return bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'onlyTextAndImages'));
  }
  
  try {
    // Устанавливаем cooldown для пользователя (только после всех проверок)
    if (!isDeveloper) {
      setCooldown(userId);
    }
    
    // Обновляем активность пользователя
    user.updateActivity();

    await bot.sendChatAction(chatId, 'typing');
    
    let reply;
    
    if (imageData) {
      reply = await generateAIResponseWithImage(chatId, userMessage, imageData);
    } else {
      reply = await generateAIResponse(chatId, userMessage);
    }
    
    await bot.sendMessage(chatId, escapeMarkdown(reply), {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });
    
    logMessage({
      first_name: msg.from.first_name,
      username: msg.from.username,
      userMessage: imageData ? `[IMAGE] ${userMessage}` : userMessage,
      reply,
      isDeveloper,
      modelName
    });
    
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'errorMessage'));
  }
});

// Express сервер
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.static('public'));

app.get('/ping', (req, res) => res.send('pong'));

app.get('/admin/logs/', (req, res) => {
  const accessKey = req.query.key;

  if (accessKey !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied! You are not Hanzo!');
  }

  const logPath = path.join(__dirname, 'logs', 'sorhy-log.txt');

  if (fs.existsSync(logPath)) {
    res.download(logPath, 'sorhy-log.txt');
  } else {
    res.status(404).send('Log file not found.');
  }
});

app.get('/admin/stats/', async (req, res) => {
  const accessKey = req.headers['x-access-key'];
  
  if (accessKey !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied!');
  }
  
  try {
    const stats = await userManager.getStats();
    const memoryUsage = process.memoryUsage();
    
    const fullStats = {
      database: {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        cachedUsers: stats.cachedUsers,
        isConnected: stats.isConnected
      },
      system: {
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        uptime: Math.floor(process.uptime()) + ' секунд',
        antispam: {
          activeCooldowns: userCooldowns.size,
          cooldownTime: COOLDOWN_TIME / 1000 + ' секунд'
        }
      }
    };
    
    res.json(fullStats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(chalk.green(`⚡ Сервер запущен на порту ${PORT}`));
  console.log(chalk.blue(`🛡️ Антиспам система активна (cooldown: ${COOLDOWN_TIME/1000}с)`));
});

// Корректное завершение работы с отключением от MongoDB
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Получен сигнал завершения SIGINT...'));
  await userManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Получен сигнал завершения SIGTERM...'));
  await userManager.disconnect();
  process.exit(0);
});

// Запускаем инициализацию
initializeApp().catch(error => {
  console.error(chalk.red('❌ Критическая ошибка запуска:'), error);
  process.exit(1);
});