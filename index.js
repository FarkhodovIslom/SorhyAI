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
  SAVE_INTERVAL,
  CLEANUP_INTERVAL,
  INACTIVE_THRESHOLD,
  DATA_DIR,
  USERS_FILE,
  MODEL_EMOJIS
} from './config/config.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Убеждаемся что папка data существует
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Инициализация Telegram бота
const bot = new TelegramBot(process.env.TGBOT_TEST_API_KEY, { polling: true });

// Структура данных пользователя в памяти
class UserData {
  constructor(chatId) {
    this.chatId = chatId;
    this.model = process.env.MODEL_PRO;
    this.language = null;
    this.history = [];
    this.lastActivity = Date.now();
    this.isDirty = false; // Флаг для отслеживания изменений
  }

  // Добавляем сообщение в историю с оптимизацией
  addToHistory(userMsg, assistantMsg) {
    this.history.push(
      { role: 'user', content: userMsg },
      { role: 'assistant', content: assistantMsg }
    );
    
    // Обрезаем по количеству сообщений
    if (this.history.length > MAX_HISTORY_LENGTH) {
      this.history = this.history.slice(-MAX_HISTORY_LENGTH);
    }
    
    // Обрезаем по размеру если слишком большая история
    this.truncateHistoryBySize();
    
    this.lastActivity = Date.now();
    this.isDirty = true;
  }

  // Обрезаем историю по размеру символов
  truncateHistoryBySize() {
    let totalChars = JSON.stringify(this.history).length;
    
    while (totalChars > MAX_HISTORY_CHARS && this.history.length > 2) {
      this.history.splice(0, 2); // Удаляем первые 2 сообщения (пара user-assistant)
      totalChars = JSON.stringify(this.history).length;
    }
  }

  // Обновляем активность
  updateActivity() {
    this.lastActivity = Date.now();
    this.isDirty = true;
  }

  // Проверяем неактивность
  isInactive() {
    return Date.now() - this.lastActivity > INACTIVE_THRESHOLD;
  }

  // Конвертируем в формат для сохранения (без лишних данных)
  toJSON() {
    return {
      chatId: this.chatId,
      model: this.model,
      language: this.language,
      history: this.history.slice(-5), // Сохраняем только последние 5 пар сообщений
      lastActivity: this.lastActivity
    };
  }

  // Создаем из сохраненных данных
  static fromJSON(data) {
    const user = new UserData(data.chatId);
    user.model = data.model || process.env.MODEL_PRO;
    user.language = data.language || null;
    user.history = data.history || [];
    user.lastActivity = data.lastActivity || Date.now();
    return user;
  }
}

// Менеджер данных пользователей
class UserDataManager {
  constructor() {
    this.users = new Map(); // Активные пользователи в RAM
    this.loadUsers();
    this.startPeriodicSave();
    this.startPeriodicCleanup();
  }

  // Загружаем пользователей из файла
  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        console.log(chalk.green(`Загружено ${Object.keys(data).length} пользователей из файла`));
        
        // Загружаем только недавно активных пользователей в RAM
        const now = Date.now();
        let loadedCount = 0;
        
        for (const [chatId, userData] of Object.entries(data)) {
          if (now - userData.lastActivity < INACTIVE_THRESHOLD) {
            this.users.set(parseInt(chatId), UserData.fromJSON(userData));
            loadedCount++;
          }
        }
        
        console.log(chalk.blue(`В RAM загружено ${loadedCount} активных пользователей`));
      }
    } catch (error) {
      console.error(chalk.red('Ошибка загрузки пользователей:'), error);
    }
  }

  // Сохраняем пользователей в файл
  saveUsers() {
    try {
      let existingData = {};
      
      // Читаем существующие данные если файл есть
      if (fs.existsSync(USERS_FILE)) {
        existingData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      }

      // Обновляем только измененных пользователей
      let savedCount = 0;
      for (const [chatId, userData] of this.users.entries()) {
        if (userData.isDirty) {
          existingData[chatId] = userData.toJSON();
          userData.isDirty = false;
          savedCount++;
        }
      }

      if (savedCount > 0) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(existingData, null, 2));
        console.log(chalk.green(`Сохранено ${savedCount} пользователей`));
      }
      
      // Показываем статистику RAM
      const ramUsage = process.memoryUsage();
      console.log(chalk.cyan(`RAM: ${Math.round(ramUsage.heapUsed / 1024 / 1024)}MB, Активных чатов: ${this.users.size}`));
      
    } catch (error) {
      console.error(chalk.red('Ошибка сохранения пользователей:'), error);
    }
  }

  // Получаем пользователя (загружаем из файла если нужно)
  getUser(chatId) {
    if (!this.users.has(chatId)) {
      // Пытаемся загрузить из файла
      if (fs.existsSync(USERS_FILE)) {
        try {
          const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
          if (data[chatId]) {
            this.users.set(chatId, UserData.fromJSON(data[chatId]));
            console.log(chalk.yellow(`Пользователь ${chatId} загружен из файла в RAM`));
          } else {
            this.users.set(chatId, new UserData(chatId));
          }
        } catch (error) {
          this.users.set(chatId, new UserData(chatId));
        }
      } else {
        this.users.set(chatId, new UserData(chatId));
      }
    }
    
    return this.users.get(chatId);
  }

  // Очищаем неактивных пользователей из RAM
  cleanupInactiveUsers() {
    const beforeSize = this.users.size;
    let cleanedCount = 0;

    for (const [chatId, userData] of this.users.entries()) {
      if (userData.isInactive()) {
        // Сохраняем перед удалением если есть изменения
        if (userData.isDirty) {
          try {
            let existingData = {};
            if (fs.existsSync(USERS_FILE)) {
              existingData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            }
            existingData[chatId] = userData.toJSON();
            fs.writeFileSync(USERS_FILE, JSON.stringify(existingData, null, 2));
          } catch (error) {
            console.error(chalk.red(`Ошибка сохранения пользователя ${chatId}:`), error);
          }
        }
        
        this.users.delete(chatId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(chalk.magenta(`Очищено из RAM: ${cleanedCount} неактивных пользователей (было ${beforeSize}, стало ${this.users.size})`));
    }
  }

  // Периодическое сохранение
  startPeriodicSave() {
    setInterval(() => {
      this.saveUsers();
    }, SAVE_INTERVAL);
  }

  // Периодическая очистка
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, CLEANUP_INTERVAL);
  }

  // Корректное завершение работы
  shutdown() {
    console.log(chalk.blue('Сохранение данных перед завершением...'));
    this.saveUsers();
    console.log(chalk.green('Данные сохранены!'));
  }
}

// Инициализируем менеджер данных
const userManager = new UserDataManager();

// Переменные бота
let botUsername = '';
let botId = '';
const version = process.env.VERSION;


/**
 * Экранирует специальные символы для Markdown - БЕЗ ИЗМЕНЕНИЙ
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
        .replace(/!/g, '\\!');
    })
    .join('');
}

/**
 * Логирование - ОПТИМИЗИРОВАНО для меньшего использования RAM
 */
function logMessage({ first_name, username, userMessage, reply, isDeveloper, modelName = 'Unknown' }) {
  const now = new Date();
  const tzOffsetMs = 5 * 60 * 60 * 1000;
  const localTime = new Date(now.getTime() + tzOffsetMs)
  const time = localTime.toLocaleString('uz-UZ');

  console.log(chalk.red('┌────────────────────────────────────────────'));
  console.log(`${chalk.red('│')} ${chalk.cyan.bold(time)} ${isDeveloper ? chalk.magenta('[DEV]') : ''}`);
  console.log(`${chalk.red('│')} ${chalk.green(`${first_name} [${username || 'unknown'}]:`)} ${chalk.white(userMessage.slice(0, 100))}${userMessage.length > 100 ? '...' : ''}`);
  console.log(`${chalk.red('│')} ${chalk.yellow(`Sorhy [${modelName}] ➤`)} ${chalk.white(reply.slice(0, 100))}${reply.length > 100 ? '...' : ''}`);
  console.log(chalk.red('└────────────────────────────────────────────\n'));
  
  // Сохраняем логи только для важных сообщений и не разработчика
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
    
    // Асинхронная запись чтобы не блокировать
    fs.appendFile('logs/sorhy-log.txt', logEntry, (err) => {
      if (err) console.error('Ошибка записи лога:', err);
    });
  }
}

/**
 * Получение модели пользователя - ОПТИМИЗИРОВАНО
 */
function getUserModel(chatId) {
  const user = userManager.getUser(chatId);
  return user.model;
}

/**
 * Проверка нужности ответа в группе - БЕЗ ИЗМЕНЕНИЙ
 */
function shouldRespondInGroup(msg) {
  const isGroup = msg.chat.type.endsWith('group');
  if (!isGroup) return true;
  
  const botWasMentioned = msg.entities?.some(entity =>
    entity.type === 'mention' &&
    msg.text?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`
  );
  const isReplyToBot = msg.reply_to_message?.from?.id === botId;
  
  return botWasMentioned || isReplyToBot;
}

/**
 * Получение текста сообщения - БЕЗ ИЗМЕНЕНИЙ
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
 * Обработка команд - ОПТИМИЗИРОВАНО
 */
function handleCommand(chatId, command) {
  const user = userManager.getUser(chatId);
  
  switch (command) {
    case '/start':
      if (!user.language) {
        bot.sendMessage(
          chatId, 
          'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
          createLanguageKeyboard()
        );
      } else {
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage'));
      }
      return true;
    
    case '/reset':
      user.history = [];
      user.isDirty = true;
      bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'resetHistory'));
      return true;
    
    case '/model_lite':
      if (user.model === process.env.MODEL_LITE) {
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'lite' }));
      } else {
        user.model = process.env.MODEL_LITE;
        user.isDirty = true;
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'Lite', emoji: MODEL_EMOJIS.lite }));
      }
      return true;
    
    case '/model_pro':
      if (user.model === process.env.MODEL_PRO) {
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'pro' }));
      } else {
        user.model = process.env.MODEL_PRO;
        user.isDirty = true;
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'Pro', emoji: MODEL_EMOJIS.pro }));
      }
      return true;
    
    case '/model_x':
      if (user.model === process.env.MODEL_X) {
        bot.sendMessage(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'x' });
      } else {
        user.model = process.env.MODEL_X;
        user.isDirty = true;
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { model: 'X', emoji: MODEL_EMOJIS.x }));
      }
      return true;
    
    case '/language':
      bot.sendMessage(
        chatId,
        getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage'),
        createLanguageKeyboard()
      );
      return true;
    
    case '/help':
      bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage'), { parse_mode: 'HTML' });
      return true;
      
    default:
      if (command.startsWith('/')) return true;
      return false;
  }
}

/**
 * Генерация AI ответа - ОПТИМИЗИРОВАНО
 */
async function generateAIResponse(chatId, userMessage) {
  const user = userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history,
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
  
  // Добавляем в историю через метод класса
  user.addToHistory(userMessage, reply);
  
  return reply;
}

/**
 * Генерация AI ответа с изображением - ОПТИМИЗИРОВАНО
 */
async function generateAIResponseWithImage(chatId, userMessage, imageBase64) {
  const user = userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const imageMessage = {
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageBase64}`
    }
  };
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history,
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
  
  // Сохраняем в историю без изображения (экономим RAM)
  user.addToHistory(`[IMAGE] ${userMessage}`, reply);
  
  return reply;
}

/**
 * Остальные функции БЕЗ ИЗМЕНЕНИЙ
 */
async function getImageBase64(fileInfo) {
  const fileLink = await bot.getFileLink(fileInfo.file_id);
  const response = await fetch(fileLink);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function modelSupportsImages(modelName) {
  return modelName === process.env.MODEL_PRO || modelName === process.env.MODEL_X;
}

// Инициализация бота
bot.getMe().then(botInfo => {
  botUsername = botInfo.username;
  botId = botInfo.id;
  console.log(`🤖 Бот @${botUsername} (${botId}) активен!`);
});

// Обработчик callback query - ОПТИМИЗИРОВАНО
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  if (data.startsWith('lang_')) {
    const langCode = data.split('_')[1];
    const language = LANGUAGES[langCode];
    
    if (language) {
      const user = userManager.getUser(chatId);
      user.language = language;
      user.updateActivity();
      
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'languageChanged'));
      
      if (user.history.length === 0) {
        bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage'));
      }
    }
  }
});

// Основной обработчик сообщений - ОПТИМИЗИРОВАНО
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isDeveloper = userId === DEVELOPER_ID;
  
  const user = userManager.getUser(chatId);
  
  // Проверяем язык
  if (!user.language && (!msg.text || msg.text !== '/start')) {
    return bot.sendMessage(
      chatId, 
      'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
      createLanguageKeyboard()
    );
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
    if (handleCommand(chatId, userMessage)) return;
  } else {
    return bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'onlyTextAndImages'));
  }
  
  try {
    // Обновляем активность пользователя
    user.updateActivity();
    
    let reply;
    
    if (imageData) {
      reply = await generateAIResponseWithImage(chatId, userMessage, imageData);
    } else {
      reply = await generateAIResponse(chatId, userMessage);
    }
    
    bot.sendMessage(chatId, escapeMarkdown(reply), {
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
    bot.sendMessage(chatId, getLocalized(chatId, new Map([[chatId, user.language]]), 'errorMessage'));
  }
});

// Express сервер - БЕЗ ИЗМЕНЕНИЙ
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

// Добавляем эндпоинт для статистики пользователей
app.get('/admin/stats/', (req, res) => {
  const accessKey = req.query.key;
  
  if (accessKey !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied!');
  }
  
  const stats = {
    activeUsersInRAM: userManager.users.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT} ⚡`);
});

// Корректное завершение работы
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nПолучен сигнал завершения...'));
  userManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\nПолучен сигнал SIGTERM...'));
  userManager.shutdown();
  process.exit(0);
});