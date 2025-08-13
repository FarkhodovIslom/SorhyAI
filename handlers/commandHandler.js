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
import { ErrorHandler } from '../utils/errorHandler.js';

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
    
    // Инициализация обработчиков ошибок
    this.errorHandler = new ErrorHandler();
    
    this.setupGrammyCommands();
    this.setupCallbackHandlers();
    
    // Подключаем композер к боту
    this.bot.use(this.commandComposer);
  }

  /**
   * Получение пользователя с кэшированием
   */
  async getUser(chatId) {
    try {
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
    } catch (error) {
      this.errorHandler.handle(error, 'getUser', { chatId });
      throw error;
    }
  }

  /**
   * Сохранение пользователя с обновлением кэша
   */
  async saveUser(chatId, user) {
    try {
      await this.userManager.saveUser(chatId, user);
      this.userCache.set(chatId, user);
    } catch (error) {
      this.errorHandler.handle(error, 'saveUser', { chatId });
      throw error;
    }
  }

  /**
   * Универсальный метод отправки сообщений
   */
  async sendMessage(chatId, text, options = {}, ctx = null) {
    try {
      if (ctx) {
        return await ctx.reply(text, options);
      } else {
        return await this.bot.api.sendMessage(chatId, text, options);
      }
    } catch (error) {
      this.errorHandler.handle(error, 'sendMessage', { chatId, text });
      throw error;
    }
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
        this.errorHandler.handle(fallbackError, 'editMessage', { text });
        throw fallbackError;
      }
    }
  }

  /**
   * Настройка команд для Grammy
   */
  setupGrammyCommands() {
    // Команда /start
    this.commandComposer.command('start', this.withErrorHandling(async (ctx) => {
      await this.handleStart(ctx.chat.id, ctx);
    }));
    
    // Команда /reset
    this.commandComposer.command('reset', this.withErrorHandling(async (ctx) => {
      await this.handleReset(ctx.chat.id, ctx);
    }));
    
    // Команды для моделей
    Object.keys(MODELS).forEach(modelKey => {
      const modelName = modelKey.toLowerCase();
      this.commandComposer.command(`model_${modelName}`, this.withErrorHandling(async (ctx) => {
        await this.handleModelSwitch(modelKey, ctx.chat.id, ctx);
      }));
    });
    
    // Команда /language
    this.commandComposer.command('language', this.withErrorHandling(async (ctx) => {
      await this.handleLanguage(ctx.chat.id, ctx);
    }));
    
    // Команда /settings
    this.commandComposer.command('settings', this.withErrorHandling(async (ctx) => {
      await this.handleSettings(ctx.chat.id, ctx);
    }));
    
    // Команда /help
    this.commandComposer.command('help', this.withErrorHandling(async (ctx) => {
      await this.handleHelp(ctx.chat.id, ctx);
    }));
    
    // Команда /stats (только для разработчика)
    this.commandComposer.command('stats', onlyDeveloper, this.withErrorHandling(async (ctx) => {
      await this.handleStats(ctx.chat.id, ctx);
    }));
  }

  /**
   * Wrapper для обработки ошибок
   */
  withErrorHandling(handler) {
    return async (ctx) => {
      try {
        await handler(ctx);
      } catch (error) {
        this.errorHandler.handle(error, 'commandHandler', {
          chatId: ctx.chat.id,
          command: ctx.message?.text
        });
        
        const user = await this.getUser(ctx.chat.id);
        await this.sendMessage(
          ctx.chat.id,
          getLocalized(ctx.chat.id, new Map([[ctx.chat.id, user.language]]), 'errorOccurred'),
          {},
          ctx
        );
      }
    };
  }

  /**
   * Настройка обработчиков callback query
   */
  setupCallbackHandlers() {
    // Основные настройки
    this.commandComposer.callbackQuery(/^settings_/, this.withErrorHandling(async (ctx) => {
      const action = ctx.callbackQuery.data;
      const chatId = ctx.chat.id;
      
      await ctx.answerCallbackQuery();
      
      const actionHandlers = {
        'settings_language': () => this.handleSettingsLanguage(chatId, ctx),
        'settings_model': () => this.handleSettingsModel(chatId, ctx),
        'settings_reset': () => this.handleSettingsReset(chatId, ctx),
        'settings_help': () => this.handleSettingsHelp(chatId, ctx),
        'settings_back': () => this.handleSettings(chatId, ctx)
      };
      
      const handler = actionHandlers[action];
      if (handler) {
        await handler();
      }
    }));

    // Выбор модели
    this.commandComposer.callbackQuery(/^model_/, this.withErrorHandling(async (ctx) => {
      const action = ctx.callbackQuery.data;
      const chatId = ctx.chat.id;
      const modelName = action.split('_')[1];
      
      await ctx.answerCallbackQuery();
      
      // Найти соответствующий ключ модели
      const modelKey = Object.keys(MODELS).find(key => 
        key.toLowerCase() === modelName.toLowerCase()
      );
      
      if (modelKey) {
        await this.handleModelSwitch(modelKey, chatId, ctx, true);
      }
    }));

    // Выбор языка
    this.commandComposer.callbackQuery(/^lang_/, this.withErrorHandling(async (ctx) => {
      const chatId = ctx.chat.id;
      const langCode = ctx.callbackQuery.data.split('_')[1];
      const language = LANGUAGES[langCode];
      
      if (language) {
        const user = await this.getUser(chatId);
        user.language = language;
        user.updateActivity();
        await this.saveUser(chatId, user);
        
        const successMessage = getLocalized(chatId, new Map([[chatId, language]]), 'languageChanged');
        await ctx.answerCallbackQuery(successMessage);
        await this.handleSettings(chatId, ctx);
      }
    }));
  }

  /**
   * Универсальный обработчик переключения моделей
   */
  async handleModelSwitch(modelKey, chatId, ctx = null, fromSettings = false) {
    try {
      const user = await this.getUser(chatId);
      const modelValue = MODELS[modelKey];
      const modelDisplayName = this.keyboardService.getModelDisplayName(modelValue);
      
      if (user.model === modelValue) {
        if (fromSettings) {
          const message = getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadySelected');
          await ctx.answerCallbackQuery(message);
          return;
        }
        
        await this.sendMessage(
          chatId, 
          getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { 
            model: modelDisplayName 
          }),
          {},
          ctx
        );
        return;
      }

      // Переключаем модель
      user.model = modelValue;
      user.updateActivity();
      await this.saveUser(chatId, user);
      
      if (fromSettings) {
        const message = getLocalized(chatId, new Map([[chatId, user.language]]), 'modelChanged', {
          model: modelDisplayName
        });
        await ctx.answerCallbackQuery(message);
        await this.handleSettings(chatId, ctx);
      } else {
        await this.sendMessage(
          chatId, 
          getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { 
            model: modelDisplayName
          }),
          {},
          ctx
        );
      }
    } catch (error) {
      this.errorHandler.handle(error, 'handleModelSwitch', { modelKey, chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /start
   */
  async handleStart(chatId, ctx = null) {
    try {
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
    } catch (error) {
      this.errorHandler.handle(error, 'handleStart', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /settings
   */
  async handleSettings(chatId, ctx = null) {
    try {
      const user = await this.getUser(chatId);
      
      const settingsText = getLocalized(chatId, new Map([[chatId, user.language]]), 'settingsMessage', {
        currentModel: this.keyboardService.getModelDisplayName(user.model),
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
    } catch (error) {
      this.errorHandler.handle(error, 'handleSettings', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик настройки языка
   */
  async handleSettingsLanguage(chatId, ctx) {
    try {
      const user = await this.getUser(chatId);
      
      const text = getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage');
      
      await this.editMessage(ctx, text, {
        reply_markup: createLanguageKeyboard(true) // true для добавления кнопки "Назад"
      });
    } catch (error) {
      this.errorHandler.handle(error, 'handleSettingsLanguage', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик настройки модели
   */
  async handleSettingsModel(chatId, ctx) {
    try {
      const user = await this.getUser(chatId);
      
      const text = getLocalized(chatId, new Map([[chatId, user.language]]), 'selectModel', {
        currentModel: this.keyboardService.getModelDisplayName(user.model)
      });

      await this.editMessage(ctx, text, {
        parse_mode: 'HTML',
        reply_markup: this.keyboardService.createModelKeyboard(user.model, user.language)
      });
    } catch (error) {
      this.errorHandler.handle(error, 'handleSettingsModel', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик сброса истории из настроек
   */
  async handleSettingsReset(chatId, ctx) {
    try {
      const user = await this.getUser(chatId);
      user.history = [];
      await this.saveUser(chatId, user);
      
      const message = getLocalized(chatId, new Map([[chatId, user.language]]), 'historyCleared');
      await ctx.answerCallbackQuery(message);
      await this.handleSettings(chatId, ctx);
    } catch (error) {
      this.errorHandler.handle(error, 'handleSettingsReset', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик помощи из настроек
   */
  async handleSettingsHelp(chatId, ctx) {
    try {
      const user = await this.getUser(chatId);
      
      const helpText = getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage');
      
      const backButton = getLocalized(chatId, new Map([[chatId, user.language]]), 'backToSettings');
      
      await this.editMessage(ctx, helpText, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text(backButton, 'settings_back')
      });
    } catch (error) {
      this.errorHandler.handle(error, 'handleSettingsHelp', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /reset
   */
  async handleReset(chatId, ctx = null) {
    try {
      const user = await this.getUser(chatId);
      user.history = [];
      await this.saveUser(chatId, user);
      
      await this.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'resetHistory'),
        {},
        ctx
      );
    } catch (error) {
      this.errorHandler.handle(error, 'handleReset', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /language
   */
  async handleLanguage(chatId, ctx = null) {
    try {
      const user = await this.getUser(chatId);
      
      await this.sendMessage(
        chatId,
        getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage'),
        { reply_markup: createLanguageKeyboard() },
        ctx
      );
    } catch (error) {
      this.errorHandler.handle(error, 'handleLanguage', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /help
   */
  async handleHelp(chatId, ctx = null) {
    try {
      const user = await this.getUser(chatId);
      
      await this.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage'), 
        { parse_mode: 'HTML' },
        ctx
      );
    } catch (error) {
      this.errorHandler.handle(error, 'handleHelp', { chatId });
      throw error;
    }
  }

  /**
   * Обработчик команды /stats (только для разработчика)
   */
  async handleStats(chatId, ctx = null) {
    try {
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
    } catch (error) {
      this.errorHandler.handle(error, 'handleStats', { chatId });
      throw error;
    }
  }

  /**
   * Legacy методы для обратной совместимости
   */
  
  async handleModelLite(chatId, ctx = null, fromSettings = false) {
    return this.handleModelSwitch('LITE', chatId, ctx, fromSettings);
  }

  async handleModelPro(chatId, ctx = null, fromSettings = false) {
    return this.handleModelSwitch('PRO', chatId, ctx, fromSettings);
  }

  async handleModelX(chatId, ctx = null, fromSettings = false) {
    return this.handleModelSwitch('X', chatId, ctx, fromSettings);
  }

  /**
   * Legacy метод для обратной совместимости
   * @param {number} chatId - ID чата
   * @param {string} command - Команда
   * @returns {boolean} - true если команда обработана
   */
  async handleCommand(chatId, command) {
    try {
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

      // Обработка команд моделей
      Object.keys(MODELS).forEach(modelKey => {
        const command = `/model_${modelKey.toLowerCase()}`;
        commandHandlers[command] = () => this.handleModelSwitch(modelKey, chatId, legacyCtx);
      });

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
    } catch (error) {
      this.errorHandler.handle(error, 'handleCommand', { chatId, command });
      return true; // Возвращаем true, чтобы показать, что команда была "обработана"
    }
  }

  /**
   * Получить список всех доступных команд
   */
  getAvailableCommands() {
    const baseCommands = ['/start', '/reset', '/language', '/settings', '/help'];
    const modelCommands = Object.keys(MODELS).map(key => `/model_${key.toLowerCase()}`);
    
    return [...baseCommands, ...modelCommands, '/stats'];
  }

  /**
   * Добавить новую команду
   * @param {string} command - Команда 
   * @param {Function} handler - Обработчик команды
   */
  addCommand(command, handler) {
    const cmdName = command.startsWith('/') ? command.slice(1) : command;
    
    this.commandComposer.command(cmdName, this.withErrorHandling(async (ctx) => {
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