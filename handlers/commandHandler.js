// handlers/commandHandler.js
import { 
  DEVELOPER_ID,
  MODEL_EMOJIS
} from '../config/config.js';
import { 
  getLocalized,
  createLanguageKeyboard
} from '../localization/localization.js';

/**
 * Класс для обработки команд бота
 */
export class CommandHandler {
  constructor(bot, userManager) {
    this.bot = bot;
    this.userManager = userManager;
    
    // Мапа всех доступных команд
    this.commands = new Map([
      ['/start', this.handleStart.bind(this)],
      ['/reset', this.handleReset.bind(this)],
      ['/model_lite', this.handleModelLite.bind(this)],
      ['/model_pro', this.handleModelPro.bind(this)],
      ['/model_x', this.handleModelX.bind(this)],
      ['/language', this.handleLanguage.bind(this)],
      ['/help', this.handleHelp.bind(this)],
      ['/stats', this.handleStats.bind(this)]
    ]);
  }

  /**
   * Основной метод обработки команд
   * @param {number} chatId - ID чата
   * @param {string} command - Команда
   * @returns {boolean} - true если команда обработана, false если неизвестная команда
   */
  async handleCommand(chatId, command) {
    const handler = this.commands.get(command);
    
    if (handler) {
      await handler(chatId);
      return true;
    }
    
    // Если команда начинается с /, но неизвестна
    if (command.startsWith('/')) {
      await this.bot.sendMessage(chatId, 'Unknown command. Use /help to see available commands.');
      return true;
    }
    
    return false;
  }

  /**
   * Обработчик команды /start
   */
  async handleStart(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    if (!user.language) {
      await this.bot.sendMessage(
        chatId, 
        'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:',
        createLanguageKeyboard()
      );
    } else {
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'startMessage')
      );
    }
  }

  /**
   * Обработчик команды /reset
   */
  async handleReset(chatId) {
    const user = await this.userManager.getUser(chatId);
    user.history = [];
    await this.userManager.saveUser(chatId, user);
    
    await this.bot.sendMessage(
      chatId, 
      getLocalized(chatId, new Map([[chatId, user.language]]), 'resetHistory')
    );
  }

  /**
   * Обработчик команды /model_lite
   */
  async handleModelLite(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    if (user.model === process.env.MODEL_LITE) {
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'lite' })
      );
    } else {
      user.model = process.env.MODEL_LITE;
      user.updateActivity();
      await this.userManager.saveUser(chatId, user);
      
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { 
          model: 'Lite', 
          emoji: MODEL_EMOJIS.lite 
        })
      );
    }
  }

  /**
   * Обработчик команды /model_pro
   */
  async handleModelPro(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    if (user.model === process.env.MODEL_PRO) {
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'pro' })
      );
    } else {
      user.model = process.env.MODEL_PRO;
      user.updateActivity();
      await this.userManager.saveUser(chatId, user);
      
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { 
          model: 'Pro', 
          emoji: MODEL_EMOJIS.pro 
        })
      );
    }
  }

  /**
   * Обработчик команды /model_x
   */
  async handleModelX(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    if (user.model === process.env.MODEL_X) {
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelAlreadyInUse', { model: 'x' })
      );
    } else {
      user.model = process.env.MODEL_X;
      user.updateActivity();
      await this.userManager.saveUser(chatId, user);
      
      await this.bot.sendMessage(
        chatId, 
        getLocalized(chatId, new Map([[chatId, user.language]]), 'modelSwitched', { 
          model: 'X', 
          emoji: MODEL_EMOJIS.x 
        })
      );
    }
  }

  /**
   * Обработчик команды /language
   */
  async handleLanguage(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    await this.bot.sendMessage(
      chatId,
      getLocalized(chatId, new Map([[chatId, user.language]]), 'selectLanguage'),
      createLanguageKeyboard()
    );
  }

  /**
   * Обработчик команды /help
   */
  async handleHelp(chatId) {
    const user = await this.userManager.getUser(chatId);
    
    await this.bot.sendMessage(
      chatId, 
      getLocalized(chatId, new Map([[chatId, user.language]]), 'helpMessage'), 
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Обработчик команды /stats (только для разработчика)
   */
  async handleStats(chatId) {
    // Проверяем права доступа
    if (chatId !== DEVELOPER_ID) {
      return;
    }
    
    const stats = await this.userManager.getStats();
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
    
    await this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
  }

  /**
   * Получить список всех доступных команд
   */
  getAvailableCommands() {
    return Array.from(this.commands.keys());
  }

  /**
   * Добавить новую команду
   * @param {string} command - Команда 
   * @param {Function} handler - Обработчик команды
   */
  addCommand(command, handler) {
    this.commands.set(command, handler.bind(this));
  }

  /**
   * Удалить команду
   * @param {string} command - Команда для удаления
   */
  removeCommand(command) {
    return this.commands.delete(command);
  }
}