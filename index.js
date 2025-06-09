import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import chalk from 'chalk';
import fs from 'fs';
import express from 'express';
import path from 'path';
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
  MONGO_URI
} from './config/config.js';

// Импортируем наш новый менеджер пользователей
import { UserDataManager } from './database/userManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.OPENROUTER_API_KEY) {
  console.error(chalk.red('❌ Missing environment variable: OPENROUTER_API_KEY'));
  process.exit(1);
}

if (!process.env.TGBOT_API_KEY || !process.env.TGBOT_API_KEY) {
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
const bot = new TelegramBot(process.env.TGBOT_API_KEY2, { polling: true });

// Инициализация менеджера пользователей с MongoDB
const userManager = new UserDataManager(
  process.env.MONGODB_URI || MONGO_URI,
  process.env.DB_NAME || 'sorhy'
);

// Переменные бота
let botUsername = '';
let botId = '';
const version = process.env.VERSION;

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
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts
    .map(part => {
      if (part.startsWith('```')) return part;
      return part
        .replace(/_/g, '\\_')
        .replace(/\#/g, '\\#')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/~/g, '\\~')
        .replace(/\-/g, '\\-')
        .replace(/>/g, '\\>')
        .replace(/\+/g, '\\+')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\./g, '\\.')
        .replace(/!/g, '\\!')
        .replace(/`/g, '\\`') // Escape backticks
        .replace(/\[/g, '\\[') // Escape left square bracket again to fix MarkdownV2 issues
        .replace(/\]/g, '\\]'); // Escape right square bracket again
    })
    .join('');
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
function logErrorMessage({error_message, first_name, username, userMessage, reply, modelName = "Unknown"}) {
  const now = new Date();
  const tzOffsetMs = 5 * 60 * 60 * 1000;
  const localTime = new Date(now.getTime() + tzOffsetMs);
  const time = localTime.toLocaleString('uz-UZ');

  const logEntry = `
  ERROR!
\n${'–'.repeat(50)}\n
${time} | 
${first_name} [${username || 'unknown'}]: ${userMessage}
\nSorhy [${modelName}] ➤ ${reply}
\nError: ${error_message}
\n${'–'.repeat(50)}\n
`;
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    fs.appendFile('logs/sorhy-log.txt', logEntry, (err) => {
      if (err) console.error('Ошибка записи лога:', err);
    });
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
 * Обработка команд
 */
async function handleCommand(chatId, command) {
  const user = await userManager.getUser(chatId);
  
  switch (command) {
    case '/start':
      if (!user.language) {
        await bot.sendMessage(
          chatId, 
          'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
          createLanguageKeyboard()
        );
      } else {
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage'));
      }
      return true;
    
    case '/reset':
      user.history = [];
      await userManager.saveUser(chatId, user);
      await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'resetHistory'));
      return true;
    
    case '/model_lite':
      if (user.model === process.env.MODEL_LITE) {
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'lite' }));
      } else {
        user.model = process.env.MODEL_LITE;
        user.updateActivity();
        await userManager.saveUser(chatId, user);
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'Lite', emoji: MODEL_EMOJIS.lite }));
      }
      return true;
    
    case '/model_pro':
      if (user.model === process.env.MODEL_PRO) {
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'pro' }));
      } else {
        user.model = process.env.MODEL_PRO;
        user.updateActivity();
        await userManager.saveUser(chatId, user);
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'Pro', emoji: MODEL_EMOJIS.pro }));
      }
      return true;
    
    case '/model_x':
      if (user.model === process.env.MODEL_X) {
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'x' }));
      } else {
        user.model = process.env.MODEL_X;
        user.updateActivity();
        await userManager.saveUser(chatId, user);
        await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'X', emoji: MODEL_EMOJIS.x }));
      }
      return true;
    
    case '/language':
      await bot.sendMessage(
        chatId,
        getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage'),
        createLanguageKeyboard()
      );
      return true;
    
    case '/help':
      await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage'), { parse_mode: 'HTML' });
      return true;
      
    case '/stats':
      // Команда только для разработчика
      if (chatId === DEVELOPER_ID) {
        const stats = await userManager.getStats();
        const memUsage = process.memoryUsage();
        const uptime = Math.floor(process.uptime() / 60); // в минутах
        
        const statsMessage = `
📊 <b>Статистика бота:</b>

👥 Пользователи:
• Всего в БД: <code>${stats.totalUsers}</code>
• Активных (24ч): <code>${stats.activeUsers}</code>
• В кэше: <code>${stats.cachedUsers}</code>

💻 Система:
• RAM: <code>${Math.round(memUsage.heapUsed / 1024 / 1024)}MB</code>
• Uptime: <code>${uptime} мин</code>
• MongoDB: <code>${stats.isConnected ? '✅ Подключена' : '❌ Отключена'}</code>
        `;
        
        await bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
      }
      return true;
      
    default:
      if (command.startsWith('/')) {
        await bot.sendMessage(chatId, 'Unknown command. Use /help to see available commands.');
        return true;
      }
      return false;
  }
}

/**
 * Генерация AI ответа
 */
async function generateAIResponse(chatId, userMessage) {
  const user = await userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history.map(h => ({ role: h.role, content: h.content })), // Убираем timestamp для API
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: user.model,
    messages,
    temperature: 0.8,
    top_p: 0.8,
    presence_penalty: 0.8,
    frequency_penalty: 0.8,
    max_tokens: 2000
  });
  
  const reply = response.choices[0].message.content;
  
  // Добавляем в историю
  user.addToHistory(userMessage, reply, MAX_HISTORY_LENGTH, MAX_HISTORY_CHARS);
  
  // Асинхронно сохраняем пользователя (не блокируем ответ)
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
    temperature: 0.8,
    top_p: 0.8,
    presence_penalty: 0.8,
    frequency_penalty: 0.8,
    max_tokens: 2000
  });
  
  const reply = response.choices[0].message.content;
  
  // Сохраняем в историю без изображения (экономим память)
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
  
  const user = await userManager.getUser(chatId);
  
  // Проверяем язык
  if (!user.language && (!msg.text || msg.text !== '/start')) {
    await bot.sendMessage(
      chatId, 
      'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
      createLanguageKeyboard()
    );
    return; // Return after sending language selection
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
    if (await handleCommand(chatId, userMessage)) return;
  } else {
    return bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'onlyTextAndImages'));
  }
  
  try {
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
      parse_mode: 'MarkdownV2',
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
    logErrorMessage({
      error_message: err,
      first_name: msg.from.first_name,
      username: msg.from.username,
      userMessage: imageData ? `[IMAGE] ${userMessage}` : userMessage,
      reply
    })
    await bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'errorMessage'));
  }
});

// Express сервер
const app = express();

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
        uptime: Math.floor(process.uptime()) + ' секунд'
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