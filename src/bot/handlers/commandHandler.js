// handlers/commandHandler.js
import { Composer, InlineKeyboard } from 'grammy';
import { 
  DEVELOPER_ID,
  MODEL_EMOJIS,
  MODELS
} from '../config/config.js';
import { 
  getLocalized,
  createLanguageKeyboard,
  LANGUAGES
} from '../localization/localization.js';
import { KeyboardService } from '../services/keyboardService.js';
import { 
  handleError, 
  withErrorHandling, 
  handleTelegramError,
  BotError,
  ValidationError
} from '../../core/utils/errorHandler.js';

/**
 * Middleware для проверки прав разработчика
 */
const onlyDeveloper = (ctx, next) => {
  if (ctx.from.id === DEVELOPER_ID) {
    return next();
  }
  // Игнорируем команду для обычных пользователей
};

/**
 * Класс для обработки команд бота (Grammy версия)
 */
export class CommandHandler {
  constructor(bot, userManager, config = {}) {
    this.bot = bot;
    this.userManager = userManager;
    this.config = config;
    
    // Композер для команд
    this.commandComposer = new Composer();
    
    // Сервис для создания клавиатур
    this.keyboardService = new KeyboardService(config);
    
    // Кэш пользователей для оптимизации
    this.userCache = new Map();
    
    this.setupGrammyCommands();
    this.setupCallbackHandlers();
    
    // Подключаем композер к боту
    this.bot.use(this.commandComposer);
  }

  /**
   * Получение пользователя с кэшированием
   */
  async getUser(chatId) {
    const getUserWithCache = withErrorHandling(async () => {
      if (this.userCache.has(chatId)) {
        return this.userCache.get(chatId);
      }
      
      const user = await this.userManager.getUser(chatId);
      this.userCache.set(chatId, user);
      
      // Очищаем кэш через 5 минут
      setTimeout(() => {
        this.userCache.delete(chatId);
      }, 5 * 60 * 1000);
      
      return user;
    }, { operation: 'getUser', chatId });

    return await getUserWithCache();
  }

  /**
   * Сохранение пользователя с обновлением кэша
   */
  async saveUser(chatId, user) {
    const saveUserWithHandling = withErrorHandling(async () => {
      await this.userManager.saveUser(chatId, user);
      this.userCache.set(chatId, user);
    }, { operation: 'saveUser', chatId });

    return await saveUserWithHandling();
  }

  /**
   * Универсальный метод отправки сообщений
   */
  async sendMessage(chatId, text, options = {}, ctx = null) {
    const sendMessageWithHandling = withErrorHandling(async () => {
      if (ctx) {
        return await ctx.reply(text, options);
      } else {
        return await this.bot.api.sendMessage(chatId, text, options);
      }
    }, { operation: 'sendMessage', chatId, textLength: text?.length });

    return await sendMessageWithHandling();
  }

  /**
   * Метод для редактирования сообщений
   */
  async editMessage(ctx, text, options = {}) {
    try {
      await ctx.editMessageText(text, options);
    } catch (error) {
      // Если не удается отредактировать, отправляем новое сообщение
      try {
        await ctx.reply(text, options);
      } catch (fallbackError) {
        handleError(fallbackError, { 
          operation: 'editMessage', 
          textLength: text?.length,
          fallbackAttempt: true 
        });
        throw fallbackError;
      }
    }
  }

  /**
   * Настройка команд для Grammy
   */
  setupGrammyCommands() {
    // Команда /start
    this.commandComposer.command('start', this.createCommandHandler(async (ctx) => {
      await this.handleStart(ctx.chat.id, ctx);
    }));
    
    // Команда /reset
    this.commandComposer.command('reset', this.createCommandHandler(async (ctx) => {
      await this.handleReset(ctx.chat.id, ctx);
    }));
    

    
    // Команда /language
    this.commandComposer.command('language', this.createCommandHandler(async (ctx) => {
      await this.handleLanguage(ctx.chat.id, ctx);
    }));
    
    // Команда /settings
    this.commandComposer.command('settings', this.createCommandHandler(async (ctx) => {
      await this.handleSettings(ctx.chat.id, ctx);
    }));
    
    // Команда /help
    this.commandComposer.command('help', this.createCommandHandler(async (ctx) => {
      await this.handleHelp(ctx.chat.id, ctx);
    }));
    
    // Команда /stats (только для разработчика)
    this.commandComposer.command('stats', onlyDeveloper, this.createCommandHandler(async (ctx) => {
      await this.handleStats(ctx.chat.id, ctx);
    }));
  }

  /**
   * Создает обработчик команд с улучшенной обработкой ошибок
   */
  createCommandHandler(handler) {
    return async (ctx) => {
      try {
        await handler(ctx);
      } catch (error) {
        // Используем новый Telegram-специфичный обработчик ошибок
        await handleTelegramError(ctx, error);
        
        // Дополнительно отправляем локализованное сообщение об ошибке
        try {
          const user = await this.getUser(ctx.chat.id);
          const errorMessage = getLocalized(
            ctx.chat.id, 
            new Map([[ctx.chat.id, user.language]]), 
            'errorOccurred'
          );
          
          if (!ctx.callbackQuery) {
            await ctx.reply(errorMessage);
          }
        } catch (fallbackError) {
          handleError(fallbackError, { 
            operation: 'sendErrorMessage',
            chatId: ctx.chat.id 
          });
        }
      }
    };
  }

  /**
   * Настройка обработчиков callback query
   */
setupCallbackHandlers() {
    // Основные настройки
    this.commandComposer.callbackQuery(/^settings_/, this.createCallbackHandler(async (ctx) => {
      const action = ctx.callbackQuery.data;
      const chatId = ctx.chat.id;
      
      await ctx.answerCallbackQuery();
      
      const actionHandlers = {
        'settings_language': () => this.handleSettingsLanguage(chatId, ctx),

        'settings_reset': () => this.handleSettingsReset(chatId, ctx),
        'settings_help': () => this.handleSettingsHelp(chatId, ctx),
        'settings_back': () => this.handleSettings(chatId, ctx),
        'settings_close': () => this.handleSettingsClose(chatId, ctx)
      };
      
      const handler = actionHandlers[action];
      if (handler) {
        await handler();
      } else {
        throw new ValidationError(`Unknown settings action: ${action}`, 'action');
      }
    }));



    // Выбор языка
    this.commandComposer.callbackQuery(/^lang_/, this.createCallbackHandler(async (ctx) => {
      const chatId = ctx.chat.id;
      const langCode = ctx.callbackQuery.data.split('_')[1];
      const language = LANGUAGES[langCode];
      
      if (!language) {
        throw new ValidationError(`Unknown language code: ${langCode}`, 'language');
      }

      const user = await this.getUser(chatId);
      user.language = language;
      user.updateActivity();
      await this.saveUser(chatId, user);
      
      const successMessage = getLocalized(chatId, new Map([[chatId, language]]), 'languageChanged');
      await ctx.answerCallbackQuery(successMessage);
      await this.handleSettings(chatId, ctx);
    }));
  }

  /**
   * Создает обработчик callback query с улучшенной обработкой ошибок
   */
  createCallbackHandler(handler) {
    return async (ctx) => {
      try {
        await handler(ctx);
      } catch (error) {
        await handleTelegramError(ctx, error);
        
        // Отвечаем на callback query в случае ошибки
        try {
          await ctx.answerCallbackQuery('❌ Произошла ошибка');
        } catch (answerError) {
          handleError(answerError, { 
            operation: 'answerCallbackQuery',
            chatId: ctx.chat?.id 
          });
        }
      }
    };
  }



  /**
   * Обработчик команды /start
   */
  async handleStart(chatId, ctx = null) {
    const user = await this.getUser(chatId);
    
    if (!user.language) {
      const welcomeText = getLocalized(chatId, new Map([[chatId, 'multi']]), 'selectLanguageWelcome');
      await this.sendMessage(
        chatId, 
        welcomeText,
        { reply_markup: createLanguageKeyboard() },
        ctx
      );
    } else {
      await this.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage'),
        {},
        ctx
      );
    }
  }

  /**
   * Обработчик команды /settings
   */
  async handleSettings(chatId, ctx = null) {
    const user = await this.getUser(chatId);
    
    const settingsText = getLocalized(chatId, new Map([[chatId, user.language]]), 'settingsMessage', {
      currentLanguage: this.keyboardService.getLanguageDisplayName(user.language),
      historyCount: user.history.length
    });

    const options = {
      parse_mode: 'HTML',
      reply_markup: this.keyboardService.createSettingsKeyboard(user)
    };

    if (ctx && ctx.callbackQuery) {
      await this.editMessage(ctx, settingsText, options);
    } else {
      await this.sendMessage(chatId, settingsText, options, ctx);
    }
  }

  /**
   * Обработчик настройки языка
   */
  async handleSettingsLanguage(chatId, ctx) {
    const user = await this.getUser(chatId);
    
    const text = getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage');
    
    await this.editMessage(ctx, text, {
      reply_markup: createLanguageKeyboard(true) // true для добавления кнопки "Назад"
    });
  }



  /**
   * Обработчик сброса истории из настроек
   */
  async handleSettingsReset(chatId, ctx) {
    const user = await this.getUser(chatId);
    user.history = [];
    await this.saveUser(chatId, user);
    
    const message = getLocalized(chatId, new Map([[chatId, user.language]]), 'historyCleared');
    await ctx.answerCallbackQuery(message);
    await this.handleSettings(chatId, ctx);
  }

  /**
   * Обработчик помощи из настроек
   */
  async handleSettingsHelp(chatId, ctx) {
    const user = await this.getUser(chatId);
    
    const helpText = getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage');
    const backButton = getLocalized(chatId, new Map([[chatId, user.language]]), 'backToSettings');
    
    await this.editMessage(ctx, helpText, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(backButton, 'settings_back')
    });
  }

    /**
   * Обработчик закрытия настроек
   */
  async handleSettingsClose(chatId, ctx) {
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Если не удается удалить сообщение, просто отвечаем
      const user = await this.getUser(chatId);
      const closedMessage = getLocalized(chatId, new Map([[chatId, user.language]]), 'settingsClosed');
      await ctx.editMessageText(closedMessage);
    }
  }

  /**
   * Обработчик команды /reset
   */
  async handleReset(chatId, ctx = null) {
    const user = await this.getUser(chatId);
    user.history = [];
    await this.saveUser(chatId, user);
    
    await this.sendMessage(
      chatId, 
      getLocalized(chatId, new Map([[chatId, user.language]]), 'resetHistory'),
      {},
      ctx
    );
  }

  /**
   * Обработчик команды /language
   */
  async handleLanguage(chatId, ctx = null) {
    const user = await this.getUser(chatId);
    
    await this.sendMessage(
      chatId,
      getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage'),
      { reply_markup: createLanguageKeyboard() },
      ctx
    );
  }

  /**
   * Обработчик команды /help
   */
  async handleHelp(chatId, ctx = null) {
    const user = await this.getUser(chatId);
    
    await this.sendMessage(
      chatId, 
      getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage'), 
      { parse_mode: 'HTML' },
      ctx
    );
  }

  /**
   * Обработчик команды /stats (только для разработчика)
   */
  async handleStats(chatId, ctx = null) {
    const stats = await this.userManager.getStats();
    const memUsage = process.memoryUsage();
    const uptime = Math.floor(process.uptime() / 60); // в минутах
    
    const statsMessage = getLocalized(chatId, new Map([[chatId, 'ru']]), 'statsMessage', {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      cachedUsers: stats.cachedUsers,
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime: uptime,
      dbStatus: stats.isConnected ? '✅ Подключена' : '❌ Отключена'
    });
    
    await this.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' }, ctx);
  }



  /**
   * Legacy метод для обратной совместимости
   * @param {number} chatId - ID чата
   * @param {string} command - Команда
   * @returns {boolean} - true если команда обработана
   */
  async handleCommand(chatId, command) {
    const handleLegacyCommand = withErrorHandling(async () => {
      // Создаем минимальный контекст для legacy вызовов
      const legacyCtx = {
        chat: { id: chatId },
        reply: (text, options = {}) => this.bot.api.sendMessage(chatId, text, options)
      };

      const commandHandlers = {
        '/start': () => this.handleStart(chatId, legacyCtx),
        '/reset': () => this.handleReset(chatId, legacyCtx),
        '/language': () => this.handleLanguage(chatId, legacyCtx),
        '/settings': () => this.handleSettings(chatId, legacyCtx),
        '/help': () => this.handleHelp(chatId, legacyCtx),
        '/stats': () => chatId === DEVELOPER_ID ? this.handleStats(chatId, legacyCtx) : null
      };



      const handler = commandHandlers[command];
      
      if (handler) {
        await handler();
        return true;
      }
      
      // Если команда начинается с /, но неизвестна
      if (command.startsWith('/')) {
        const user = await this.getUser(chatId);
        await this.sendMessage(
          chatId, 
          getLocalized(chatId, new Map([[chatId, user.language]]), 'unknownCommand')
        );
        return true;
      }
      
      return false;
    }, { operation: 'handleLegacyCommand', chatId, command });

    try {
      return await handleLegacyCommand();
    } catch (error) {
      // Логируем ошибку и возвращаем true, чтобы показать что команда обработана
      handleError(error, { 
        operation: 'handleLegacyCommand', 
        chatId, 
        command 
      });
      return true;
    }
  }

  /**
   * Получить список всех доступных команд
   */
  getAvailableCommands() {
    const baseCommands = ['/start', '/reset', '/language', '/settings', '/help'];
    return [...baseCommands, '/stats'];
  }

  /**
   * Добавить новую команду
   * @param {string} command - Команда 
   * @param {Function} handler - Обработчик команды
   */
  addCommand(command, handler) {
    const cmdName = command.startsWith('/') ? command.slice(1) : command;
    
    this.commandComposer.command(cmdName, this.createCommandHandler(async (ctx) => {
      await handler(ctx.chat.id, ctx);
    }));
  }

  /**
   * Получить Grammy композер для подключения к боту
   */
  getComposer() {
    return this.commandComposer;
  }

  /**
   * Очистка кэша (для освобождения памяти)
   */
  clearCache() {
    this.userCache.clear();
  }

  /**
   * Получение статистики кэша
   */
  getCacheStats() {
    return {
      cachedUsers: this.userCache.size,
      memoryUsage: process.memoryUsage()
    };
  }
}