// utils/errorHandler.js

/**
 * Централизованный обработчик ошибок
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.logToConsole = options.logToConsole !== false;
    this.logToFile = options.logToFile || false;
    this.notifyDeveloper = options.notifyDeveloper || false;
    this.bot = options.bot || null;
    this.developerId = options.developerId || null;
  }

  /**
   * Обработка ошибки
   */
  handle(error, context = 'Unknown', metadata = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      metadata
    };

    // Логирование в консоль
    if (this.logToConsole) {
      console.error(`[ERROR] ${context}:`, {
        message: error.message,
        metadata,
        stack: error.stack
      });
    }

    // Логирование в файл (если настроено)
    if (this.logToFile) {
      this.logToFile(errorInfo);
    }

    // Уведомление разработчика (если настроено)
    if (this.notifyDeveloper && this.bot && this.developerId) {
      this.notifyDeveloperAsync(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Асинхронное уведомление разработчика
   */
  async notifyDeveloperAsync(errorInfo) {
    try {
      const message = `🚨 <b>Ошибка в боте:</b>

<b>Контекст:</b> <code>${errorInfo.context}</code>
<b>Время:</b> <code>${errorInfo.timestamp}</code>
<b>Сообщение:</b> <code>${errorInfo.message}</code>

<b>Метаданные:</b>
<pre>${JSON.stringify(errorInfo.metadata, null, 2)}</pre>`;

      await this.bot.api.sendMessage(this.developerId, message, {
        parse_mode: 'HTML'
      });
    } catch (notificationError) {
      console.error('Failed to notify developer:', notificationError);
    }
  }

  /**
   * Проверка, является ли ошибка критической
   */
  isCriticalError(error) {
    const criticalErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'MongoNetworkError',
      'MongoTimeoutError'
    ];

    return criticalErrors.some(criticalError => 
      error.message.includes(criticalError) || 
      error.code === criticalError
    );
  }

  /**
   * Создание пользовательского сообщения об ошибке
   */
  createUserErrorMessage(error, language = 'en') {
    const errorMessages = {
      'en': {
        generic: '❌ An error occurred. Please try again later.',
        network: '🌐 Network error. Please check your connection.',
        timeout: '⏱️ Request timeout. Please try again.',
        rateLimit: '🚫 Too many requests. Please wait a moment.'
      },
      'ru': {
        generic: '❌ Произошла ошибка. Попробуйте позже.',
        network: '🌐 Ошибка сети. Проверьте подключение.',
        timeout: '⏱️ Превышено время ожидания. Попробуйте еще раз.',
        rateLimit: '🚫 Слишком много запросов. Подождите немного.'
      },
      'uz': {
        generic: '❌ Xatolik yuz berdi. Keyinroq urinib ko\'ring.',
        network: '🌐 Tarmoq xatosi. Ulanishni tekshiring.',
        timeout: '⏱️ Kutish vaqti tugadi. Qayta urinib ko\'ring.',
        rateLimit: '🚫 Juda ko\'p so\'rovlar. Biroz kuting.'
      }
    };

    const messages = errorMessages[language] || errorMessages['en'];

    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      return messages.timeout;
    }
    
    if (error.message.includes('network') || error.code === 'ECONNREFUSED') {
      return messages.network;
    }
    
    if (error.message.includes('rate limit') || error.status === 429) {
      return messages.rateLimit;
    }

    return messages.generic;
  }

  /**
   * Логирование в файл
   */
  async logToFileAsync(errorInfo) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const logDir = 'logs';
      const logFile = path.join(logDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
      
      // Создаем директорию если не существует
      try {
        await fs.access(logDir);
      } catch {
        await fs.mkdir(logDir, { recursive: true });
      }
      
      const logEntry = `${JSON.stringify(errorInfo)}\n`;
      await fs.appendFile(logFile, logEntry);
    } catch (fileError) {
      console.error('Failed to log to file:', fileError);
    }
  }
}