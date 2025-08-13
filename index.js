import 'dotenv/config';
import { Bot, GrammyError, HttpError, session } from 'grammy';
import { limit } from '@grammyjs/ratelimiter';
import OpenAI from 'openai';
import chalk from 'chalk';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { generateSystemPrompt } from './prompt/systemPrompt.js';
import { getLocalized, createLanguageKeyboard } from './localization/localization.js';
import { 
  PORT,
  DEVELOPER_ID,
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_CHARS,
  MONGO_URI,
  MODEL_TEMP,
  MODEL_TOP_P
} from './config/config.js';
import { UserDataManager } from './database/userManager.js';
import { CommandHandler } from './handlers/commandHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment validation
const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'TGBOT_API_KEY2', 
  'DEV_ACCESS_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(chalk.red(`❌ Missing environment variable: ${envVar}`));
    process.exit(1);
  }
}

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const bot = new Bot(process.env.TGBOT_API_KEY2);
const userManager = new UserDataManager(
  process.env.MONGODB_URI || MONGO_URI,
  process.env.DB_NAME || 'sorhy'
);

// Bot state
let botUsername = '';
let botId = '';
const version = process.env.VERSION;

// const rateLimiter = limit({
//   timeFrame: 10000,
//   limit: 1,
//   keyGenerator: (ctx) => ctx.from?.id === DEVELOPER_ID ? `dev_${ctx.from.id}` : ctx.from?.id.toString(),
//   onLimitExceeded: async (ctx) => {
//     const user = await userManager.getUser(ctx.chat.id);
//     const baseMessage = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, user.language]]), 'cooldownMessage');
    
//     // Отправляем сообщение с таймером
//     const sentMessage = await ctx.reply(`${baseMessage} (10s)`, { 
//       reply_to_message_id: ctx.message?.message_id 
//     });
    
//     let countdown = 9;
    
//     // Обновляем каждую секунду
//     const countdownInterval = setInterval(async () => {
//       try {
//         await ctx.api.editMessageText(
//           ctx.chat.id, 
//           sentMessage.message_id, 
//           `${baseMessage} (${countdown}s)`
//         );
//         countdown--;
        
//         if (countdown < 0) {
//           clearInterval(countdownInterval);
//           // Удаляем сообщение
//           setTimeout(async () => {
//             try {
//               await ctx.api.deleteMessage(ctx.chat.id, sentMessage.message_id);
//             } catch (error) {
//               console.log(chalk.yellow('Could not delete cooldown message:', error.description));
//             }
//           }, 1000);
//         }
//       } catch (error) {
//         // Если не можем редактировать, просто останавливаем таймер
//         clearInterval(countdownInterval);
//       }
//     }, 1000);
//   },
//   skip: (ctx) => {
//     if (ctx.from?.id === DEVELOPER_ID) return true;
//     if (ctx.callbackQuery) return true;
//     if (ctx.message?.text && ctx.message.text.startsWith('/')) return true;
//     if (ctx.message?.text && ['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(ctx.message.text)) return true;
//     return false;
//   }
// });

// Middleware setup
bot.use(async (ctx, next) => {
  if (ctx.chat && ctx.from) {
    const user = await userManager.getUser(ctx.chat.id);
    ctx.user = user;
    user.updateActivity();
    
    // Сохраняем пользователя при изменении языка
    if (ctx.message?.text && ['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(ctx.message.text)) {
      await userManager.saveUserImmediate(ctx.chat.id);
    }
  }
  await next();
});

// Custom rate limiter middleware
bot.use(async (ctx, next) => {
  // Пропускаем разработчика
  if (ctx.from?.id === DEVELOPER_ID) {
    return await next();
  }
  
  // Пропускаем callback queries (inline keyboard)
  if (ctx.callbackQuery) {
    return await next();
  }
  
  // Пропускаем команды
  if (ctx.message?.text && ctx.message.text.startsWith('/')) {
    return await next();
  }
  
  // Пропускаем команды изменения языка
  if (ctx.message?.text && ['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(ctx.message.text)) {
    return await next();
  }
  
  // Применяем rate limit только к обычным сообщениям
  if (ctx.message) {
    const userId = ctx.from.id.toString();
    const now = Date.now();
    
    // Простой in-memory rate limiter
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    
    const lastMessageTime = global.rateLimitStore.get(userId) || 0;
    const timeDiff = now - lastMessageTime;
    
    if (timeDiff < 10000) { // 10 секунд
      const user = await userManager.getUser(ctx.chat.id);
      const message = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, user.language]]), 'cooldownMessage');
      
      // Отправляем сообщение с автоудалением
      const sentMessage = await ctx.reply(message, { 
        reply_to_message_id: ctx.message?.message_id 
      });
      
      // Удаляем через 10 секунд
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, sentMessage.message_id);
        } catch (error) {
          console.log(chalk.yellow('Could not delete cooldown message:', error.description));
        }
      }, 10000);
      
      return; // Не продолжаем обработку
    }
    
    // Обновляем время последнего сообщения
    global.rateLimitStore.set(userId, now);
  }
  
  await next();
});

bot.use(session({ initial: () => ({}) }));


// Rate limiter применяется ТОЛЬКО к обычным сообщениям
// bot.use(rateLimiter);
// bot.use(session({ initial: () => ({}) }));

// Initialize command handler
const commandHandler = new CommandHandler(bot, userManager);

// Language selection handler - БЕЗ rate limiting
bot.hears(['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'], async (ctx) => {
  const languageMap = {
    '🇺🇿 O\'zbek': 'uz',
    '🇷🇺 Русский': 'ru',
    '🇺🇸 English': 'en'
  };
  
  const selectedLanguage = languageMap[ctx.message.text];
  ctx.user.language = selectedLanguage;
  
  // Принудительно сохраняем пользователя
  await userManager.saveUserImmediate(ctx.chat.id);
  
  const welcomeMessage = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, selectedLanguage]]), 'welcomeMessage');
  await ctx.reply(welcomeMessage, { reply_markup: { remove_keyboard: true } });
});

// Language check middleware
bot.use(async (ctx, next) => {
  if (!ctx.user?.language && ctx.message?.text !== '/start' && !ctx.callbackQuery) {
    const message = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, 'en']]), 'selectLanguagePrompt');
    await ctx.reply(message, createLanguageKeyboard());
    return;
  }
  await next();
});

/**
 * Escapes special characters for Markdown formatting
 */
function escapeMarkdown(text) {
  const hasComplexMarkdown = /[*_`\[\]()~>#+\-=|{}\.!\\]/g.test(text);
  if (!hasComplexMarkdown) return text;
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/~/g, '\\~');
}

/**
 * Logs user interactions with formatted output
 */
function logMessage({ first_name, username, userMessage, reply, isDeveloper, modelName = 'Unknown' }) {
  const now = new Date();
  const tzOffsetMs = 5 * 60 * 60 * 1000; // UTC+5 timezone
  const localTime = new Date(now.getTime() + tzOffsetMs);
  const time = localTime.toLocaleString('uz-UZ');

  // Console logging with colored output
  const separator = '─'.repeat(44);
  console.log(chalk.red(`┌${separator}`));
  console.log(`${chalk.red('│')} ${chalk.cyan.bold(time)} ${isDeveloper ? chalk.magenta('[DEV]') : ''}`);
  console.log(`${chalk.red('│')} ${chalk.green(`${first_name} [${username || 'unknown'}]:`)} ${chalk.white(userMessage.slice(0, 100))}${userMessage.length > 100 ? '...' : ''}`);
  console.log(`${chalk.red('│')} ${chalk.yellow(`Sorhy [${modelName}] ➤`)} ${chalk.white(reply.slice(0, 100))}${reply.length > 100 ? '...' : ''}`);
  console.log(chalk.red(`└${separator}\n`));
  
  // File logging for non-developers only
  if (!isDeveloper) {
    const logEntry = `\n${'='.repeat(80)}\n${time} | ${first_name} [${username || 'unknown'}]: ${userMessage}\nSorhy [${modelName}] ➤ ${reply}\n${'='.repeat(80)}\n`;
    
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    fs.appendFile('logs/sorhy-log.txt', logEntry, (err) => {
      if (err) console.error(chalk.red('Logging error:'), err);
    });
  }
}

/**
 * Determines if bot should respond in group chats
 */
function shouldRespondInGroup(ctx) {
  if (!ctx.chat.type.endsWith('group')) return true;
  
  const botWasMentioned = ctx.entities()
    .some(entity => entity.type === 'mention' && 
           ctx.message.text?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`);
  
  const isReplyToBot = ctx.message?.reply_to_message?.from?.id === botId;
  
  return botWasMentioned || isReplyToBot;
}

/**
 * Extracts clean message text, removing bot mentions in groups
 */
function getMessageText(ctx) {
  let userMessage = ctx.message?.text || '';
  const isGroup = ctx.chat.type.endsWith('group');
  const botWasMentioned = ctx.entities()
    .some(entity => entity.type === 'mention' && 
           ctx.message.text?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`);
  
  if (isGroup && botWasMentioned) {
    userMessage = userMessage.replace(`@${botUsername}`, '').trim();
  }
  
  return userMessage;
}

/**
 * Generates AI response for text messages
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
  
  // Update conversation history
  user.addToHistory(userMessage, reply, MAX_HISTORY_LENGTH, MAX_HISTORY_CHARS);
  
  // Add to save queue
  userManager.saveUser(chatId, user).catch(err => {
    console.error(chalk.red(`User save error ${chatId}:`), err);
  });
  
  return reply;
}

/**
 * Generates AI response for messages with images
 */
async function generateAIResponseWithImage(chatId, userMessage, imageBase64) {
  const user = await userManager.getUser(chatId);
  const SYSTEM_PROMPT = generateSystemPrompt(user.language || 'en', version);
  
  const imageMessage = {
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
  };
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...user.history.map(h => ({ role: h.role, content: h.content })),
    { 
      role: 'user', 
      content: [imageMessage, { type: "text", text: userMessage }]
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
  
  // Save to history without image data
  user.addToHistory(`[IMAGE] ${userMessage}`, reply, MAX_HISTORY_LENGTH, MAX_HISTORY_CHARS);
  
  userManager.saveUser(chatId, user).catch(err => {
    console.error(chalk.red(`User save error ${chatId}:`), err);
  });
  
  return reply;
}

/**
 * Converts Telegram image to base64 format
 */
async function getImageBase64(fileInfo) {
  try {
    const file = await bot.api.getFile(fileInfo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error(chalk.red('Image processing error:'), error);
    throw error;
  }
}

/**
 * Checks if model supports image processing
 */
function modelSupportsImages(modelName) {
  return modelName === process.env.MODEL_PRO || modelName === process.env.MODEL_X;
}

// Photo message handler
bot.on(':photo', async (ctx) => {
  if (!shouldRespondInGroup(ctx)) return;
  
  const { chat: { id: chatId }, from: { id: userId, first_name, username }, user } = ctx;
  const isDeveloper = userId === DEVELOPER_ID;
  
  if (!modelSupportsImages(user.model)) {
    const message = getLocalized(chatId, new Map([[chatId, user.language]]), 'imageNotSupported');
    return ctx.reply(message, { reply_to_message_id: ctx.message.message_id });
  }
  
  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const imageData = await getImageBase64(photo);
    const userMessage = ctx.message.caption || getLocalized(chatId, new Map([[chatId, user.language]]), 'defaultImageQuery');
    
    await ctx.replyWithChatAction('typing');
    
    const reply = await generateAIResponseWithImage(chatId, userMessage, imageData);
    
    await ctx.reply(escapeMarkdown(reply), {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
    
    const modelName = user.model.split('/').pop();
    logMessage({ first_name, username, userMessage: `[IMAGE] ${userMessage}`, reply, isDeveloper, modelName });
    
  } catch (err) {
    console.error(chalk.red('Photo processing error:'), err);
    const errorMessage = getLocalized(chatId, new Map([[chatId, user.language]]), 'errorMessage');
    await ctx.reply(errorMessage);
  }
});

// Text message handler
bot.on('message:text', async (ctx) => {
  if (!shouldRespondInGroup(ctx)) return;
  
  const userMessage = getMessageText(ctx);
  
  // Skip commands (handled by CommandHandler)
  if (userMessage.startsWith('/')) return;
  
  // Skip language selection (handled above)
  if (['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(userMessage)) return;
  
  try {
    const { chat: { id: chatId }, from: { id: userId, first_name, username }, user } = ctx;
    const isDeveloper = userId === DEVELOPER_ID;
    const modelName = user.model.split('/').pop();
    
    await ctx.replyWithChatAction('typing');
    
    const reply = await generateAIResponse(chatId, userMessage);
    
    await ctx.reply(escapeMarkdown(reply), {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
    
    logMessage({ first_name, username, userMessage, reply, isDeveloper, modelName });
    
  } catch (err) {
    console.error(chalk.red('Message processing error:'), err);
    const errorMessage = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, ctx.user.language]]), 'errorMessage');
    await ctx.reply(errorMessage);
  }
});

// Handler for unsupported message types
bot.on('message', async (ctx) => {
  if (!ctx.message.text && !ctx.message.photo) {
    const message = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, ctx.user.language]]), 'onlyTextAndImages');
    await ctx.reply(message);
  }
});

// Error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(chalk.red(`Error handling update ${ctx.update.update_id}:`));
  const e = err.error;
  
  if (e instanceof GrammyError) {
    console.error(chalk.red("Request error:"), e.description);
  } else if (e instanceof HttpError) {
    console.error(chalk.red("Telegram connection error:"), e);
  } else {
    console.error(chalk.red("Unknown error:"), e);
  }
});

/**
 * Parse log file into structured data
 */
function parseLogs() {
  const logPath = path.join(__dirname, 'logs', 'sorhy-log.txt');
  
  if (!fs.existsSync(logPath)) {
    return { logs: [], stats: { total: 0, today: 0 } };
  }
  
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const entries = content.split('='.repeat(80)).filter(entry => entry.trim());
    
    const logs = entries.map(entry => {
      const lines = entry.trim().split('\n');
      if (lines.length < 3) return null;
      
      const firstLine = lines[0];
      const userLine = lines[1];
      const botLine = lines[2];
      
      const timeMatch = firstLine.match(/^(.+?) \|/);
      const userMatch = userLine.match(/^(.+?) \[(.+?)\]: (.+)$/);
      const botMatch = botLine.match(/^Sorhy \[(.+?)\] ➤ (.+)$/);
      
      if (!timeMatch || !userMatch || !botMatch) return null;
      
      return {
        time: timeMatch[1],
        user: `${userMatch[1]} [${userMatch[2]}]`,
        userMessage: userMatch[3],
        botMessage: botMatch[2],
        model: botMatch[1]
      };
    }).filter(Boolean);
    
    const today = new Date().toDateString();
    const todayCount = logs.filter(log => 
      log.time && new Date(log.time).toDateString() === today
    ).length;
    
    return {
      logs: logs.reverse(), // Newest first
      stats: {
        total: logs.length,
        today: todayCount,
        activeUsers: new Set(logs.map(l => l.user)).size
      }
    };
  } catch (error) {
    console.error(chalk.red('Error parsing logs:'), error);
    return { logs: [], stats: { total: 0, today: 0 } };
  }
}

/**
 * Initializes the application
 */
async function initializeApp() {
  console.log(chalk.blue('🚀 Starting Telegram Bot...'));
  
  // Connect to MongoDB
  const mongoConnected = await userManager.connect();
  if (!mongoConnected) {
    console.error(chalk.red('❌ MongoDB connection failed. Bot may be unstable.'));
  }
  
  // Initialize bot
  try {
    const botInfo = await bot.api.getMe();
    botUsername = botInfo.username;
    botId = botInfo.id;
    console.log(chalk.green(`🤖 Bot @${botUsername} (${botId}) active!`));
  } catch (error) {
    console.error(chalk.red('❌ Bot initialization error:'), error);
    process.exit(1);
  }
  
  // Start bot
  await bot.start();
}

// Express server setup
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', (req, res) => res.send('pong'));

// Admin routes
app.get('/admin/logs/', (req, res) => {
  if (req.query.key !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied! You are not Hanzo!');
  }

  const logPath = path.join(__dirname, 'logs', 'sorhy-log.txt');
  if (fs.existsSync(logPath)) {
    res.download(logPath, 'sorhy-log.txt');
  } else {
    res.status(404).send('Log file not found.');
  }
});

// NEW: EJS logs page
app.get('/admin/logs/view', (req, res) => {
  if (req.query.key !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied! You are not Hanzo!');
  }
  
  res.render('index', { accessKey: process.env.DEV_ACCESS_KEY });
});

// NEW: JSON API for logs
app.get('/admin/logs/json', (req, res) => {
  if (req.query.key !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).json({ error: 'Access denied!' });
  }
  
  const data = parseLogs();
  res.json(data);
});

// NEW: Clear logs endpoint
app.post('/admin/logs/clear', (req, res) => {
  if (req.query.key !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).json({ error: 'Access denied!' });
  }
  
  try {
    const logPath = path.join(__dirname, 'logs', 'sorhy-log.txt');
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error(chalk.red('Error clearing logs:'), error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

app.get('/admin/stats/', async (req, res) => {
  if (req.headers['x-access-key'] !== process.env.DEV_ACCESS_KEY) {
    return res.status(401).send('Access denied!');
  }
  
  try {
    const stats = await userManager.getStats();
    const memoryUsage = process.memoryUsage();
    
    const fullStats = {
      database: stats,
      system: {
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        uptime: Math.floor(process.uptime()) + ' seconds',
        rateLimit: { timeFrame: '10 seconds', limit: '1 message' }
      }
    };
    
    res.json(fullStats);
  } catch (error) {
    console.error(chalk.red('Stats error:'), error);
    res.status(500).json({ error: 'Statistics unavailable' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(chalk.green(`⚡ Server running on port ${PORT}`));
  console.log(chalk.blue(`🛡️ Rate limiting active (1 message / 10 seconds)`));
  console.log(chalk.cyan(`📊 Logs available at: /admin/logs/view?key=${process.env.DEV_ACCESS_KEY}`));
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log(chalk.yellow('\n🛑 Shutdown signal received...'));
  
  await bot.stop();
  await userManager.disconnect();
  
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start application
initializeApp().catch(error => {
  console.error(chalk.red('❌ Critical startup error:'), error);
  process.exit(1);
});