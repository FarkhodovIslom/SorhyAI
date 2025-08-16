import { Bot, GrammyError, HttpError, session } from 'grammy';
import OpenAI from 'openai';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { generateSystemPrompt } from './prompt/systemPrompt.js';
import { getLocalized, createLanguageKeyboard } from './localization/localization.js';
import { 
  DEVELOPER_ID,
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_CHARS,
  MODEL_TEMP,
  MODEL_TOP_P
} from './config/config.js';
import { CommandHandler } from './handlers/commandHandler.js';
import { logMessage } from '../core/utils/logger.js';

/**
 * Creates and configures the Telegram bot
 */
export function createBot(userManager) {
  // Initialize services
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const bot = new Bot(process.env.TGBOT_API_KEY);

  // Bot state
  let botUsername = '';
  let botId = '';
  const version = process.env.VERSION;

  // Middleware setup
  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.from) {
      const user = await userManager.getUser(ctx.chat.id);
      ctx.user = user;
      user.updateActivity();
      
      // Save user on language change
      if (ctx.message?.text && ['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(ctx.message.text)) {
        await userManager.saveUserImmediate(ctx.chat.id);
      }
    }
    await next();
  });

  // Custom rate limiter middleware
  bot.use(async (ctx, next) => {
    // Skip developer
    if (ctx.from?.id === DEVELOPER_ID) {
      return await next();
    }
    
    // Skip callback queries (inline keyboard)
    if (ctx.callbackQuery) {
      return await next();
    }
    
    // Skip commands
    if (ctx.message?.text && ctx.message.text.startsWith('/')) {
      return await next();
    }
    
    // Skip language change commands
    if (ctx.message?.text && ['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'].includes(ctx.message.text)) {
      return await next();
    }
    
    // ДОБАВЛЯЕМ: Skip сообщения в группах, где бот не должен отвечать
    if (ctx.message && ctx.chat?.type?.endsWith('group')) {
      const messageText = ctx.message?.text || ctx.message?.caption || '';
      const botWasMentioned = ctx.entities()
        ?.some(entity => entity.type === 'mention' && 
              messageText?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`) || false;
      const isReplyToBot = ctx.message?.reply_to_message?.from?.id === botId;
      const isAnonymousBotMessage = ctx.message?.sender_chat?.id === botId;
      
      // Если в группе и бот не упомянут - пропускаем rate limit
      if (!botWasMentioned && !isReplyToBot && !isAnonymousBotMessage) {
        return await next();
      }
    }
    
    // Apply rate limit только к сообщениям, на которые бот будет отвечать
    if (ctx.message) {
      const userId = ctx.from.id.toString();
      const now = Date.now();
      
      // Simple in-memory rate limiter
      if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
      }
      
      const lastMessageTime = global.rateLimitStore.get(userId) || 0;
      const timeDiff = now - lastMessageTime;
      
      if (timeDiff < 10000) { // 10 seconds
        const user = await userManager.getUser(ctx.chat.id);
        const message = getLocalized(ctx.chat.id, new Map([[ctx.chat.id, user.language]]), 'cooldownMessage');
        
        // Send message with auto-delete
        const sentMessage = await ctx.reply(message, { 
          reply_to_message_id: ctx.message?.message_id 
        });
        
        // Delete after 10 seconds
        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, sentMessage.message_id);
          } catch (error) {
            console.log(chalk.yellow('Could not delete cooldown message:', error.description));
          }
        }, 10000);
        
        return; // Don't continue processing
      }
      
      // Update last message time
      global.rateLimitStore.set(userId, now);
    }
    
    await next();
  });

  bot.use(session({ initial: () => ({}) }));

  // Initialize command handler
  const commandHandler = new CommandHandler(bot, userManager);

  // Language selection handler - WITHOUT rate limiting
  bot.hears(['🇺🇿 O\'zbek', '🇷🇺 Русский', '🇺🇸 English'], async (ctx) => {
    const languageMap = {
      '🇺🇿 O\'zbek': 'uz',
      '🇷🇺 Русский': 'ru',
      '🇺🇸 English': 'en'
    };
    
    const selectedLanguage = languageMap[ctx.message.text];
    ctx.user.language = selectedLanguage;
    
    // Force save user
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
   * Determines if bot should respond in group chats
   */
  function shouldRespondInGroup(ctx) {
    if (!ctx.chat?.type?.endsWith('group')) return true;
    const messageText = ctx.message?.text || ctx.message?.caption || '';
    
    const botWasMentioned = ctx.entities()
      ?.some(entity => entity.type === 'mention' && 
            messageText?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`) || false;
    
    const isReplyToBot = ctx.message?.reply_to_message?.from?.id === botId;
    
    const isAnonymousBotMessage = ctx.message?.sender_chat?.id === botId;
    
    return botWasMentioned || isReplyToBot || isAnonymousBotMessage;
  }

  /**
   * Extracts clean message text, removing bot mentions in groups
   */
  function getMessageText(ctx) {
    let userMessage = ctx.message?.text || ctx.message?.caption || '';
    const isGroup = ctx.chat?.type?.endsWith('group') || false;
    const messageText = ctx.message?.text || ctx.message?.caption || '';
    const botWasMentioned = ctx.entities()
      ?.some(entity => entity.type === 'mention' && 
            messageText?.slice(entity.offset, entity.offset + entity.length) === `@${botUsername}`) || false;
    
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
    if (!shouldRespondInGroup(ctx)) return;
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
   * Initializes the bot
   */
  async function initializeBot() {
    try {
      const botInfo = await bot.api.getMe();
      botUsername = botInfo.username;
      botId = botInfo.id;
      console.log(chalk.green(`🤖 Bot @${botUsername} (${botId}) active!`));
    } catch (error) {
      console.error(chalk.red('❌ Bot initialization error:'), error);
      throw error;
    }
  }

  return {
    bot,
    initializeBot
  };
}