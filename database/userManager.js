import { MongoClient, ServerApiVersion } from 'mongodb';
import chalk from 'chalk';
import dotenv from 'dotenv';
dotenv.config();

// Модель пользователя
class UserModel {
    constructor (data = {}) {
        this.chatId = data.chatId;
        this.model = data.model || process.env.MODEL_PRO;
        this.language = data.language || null;
        this.history = data.history || [];
        this.lastActivity = data.lastActivity || Date.now();
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    addToHistory (userMsg, assisstantMsg, maxLength = 50, maxChars = 50000) {
        this.history.push(
            {
                role: 'user',
                content: userMsg,
                timestamp: Date.now()
            },
            {
                role: 'assistant',
                content: assisstantMsg,
                timestamp: Date.now()
            }
        );

        if (this.history.length > maxLength) {
            this.history = this.history.slice(-maxLength);
        }
        this.truncateHistoryBySize(maxChars);
        this.updateActivity();
    };

    truncateHistoryBySize (maxChars) {
        let totalChars = JSON.stringify(this.history).length;

        while (totalChars > maxChars && this.history.length > 2) {
            this.history.splice(0, 2);
            totalChars = JSON.stringify(this.history).length;
        }
    }

    updateActivity () {
        this.lastActivity = Date.now();
        this.updatedAt = Date.now();
    }

    isInactive (threshold = 24 * 60 * 60 * 1000) {
        return (Date.now() - this.lastActivity) > threshold;
    }

    toMongoDB() {
        return {
            chatId: this.chatId,
            model: this.model,
            language: this.language,
            history: this.history,
            lastActivity: this.lastActivity,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

export class UserDataManager {
  constructor(mongoUri, dbName = 'telegram_bot') {
    this.mongoUri = mongoUri;
    this.dbName = dbName;
    this.collectionName = 'users';
    this.client = null;
    this.db = null;
    this.collection = null;
    
    // Кэш активных пользователей в RAM
    this.cache = new Map();
    this.maxCacheSize = 1000; // Максимум пользователей в кэше
    this.cacheTimeout = 30 * 60 * 1000; // 30 минут
    
    // Флаги и таймеры
    this.isConnected = false;
    this.saveTimer = null;
    this.cleanupTimer = null;
    
    console.log(chalk.blue('🔄 Инициализация UserDataManager с MongoDB...'));
  }

  /**
   * Подключение к MongoDB
   */
  async connect() {
    try {
      this.client = new MongoClient(this.mongoUri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      
      // Создаем индексы для оптимизации
      await this.createIndexes();
      
      this.isConnected = true;
      console.log(chalk.green('✅ MongoDB подключена успешно!'));
      
      // Запускаем периодические задачи
      this.startPeriodicTasks();
      
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Ошибка подключения к MongoDB:'), error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Создание индексов для оптимизации
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ chatId: 1 }, { unique: true });
      await this.collection.createIndex({ lastActivity: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log(chalk.cyan('📊 Индексы MongoDB созданы'));
    } catch (error) {
      console.error(chalk.red('Ошибка создания индексов:'), error);
    }
  }

  /**
   * Получение пользователя (из кэша или БД)
   */
  async getUser(chatId) {
    // Проверяем кэш
    if (this.cache.has(chatId)) {
      const cachedUser = this.cache.get(chatId);
      cachedUser.updateActivity();
      return cachedUser;
    }

    // Если нет в кэше, ищем в БД
    try {
      const userData = await this.collection.findOne({ chatId });
      
      let user;
      if (userData) {
        user = new UserModel(userData);
        console.log(chalk.yellow(`👤 Пользователь ${chatId} загружен из MongoDB`));
      } else {
        user = new UserModel({ chatId });
        console.log(chalk.green(`🆕 Создан новый пользователь ${chatId}`));
      }

      // Добавляем в кэш
      this.addToCache(chatId, user);
      return user;
    } catch (error) {
      console.error(chalk.red(`Ошибка получения пользователя ${chatId}:`), error);
      // В случае ошибки создаем нового пользователя
      const user = new UserModel({ chatId });
      this.addToCache(chatId, user);
      return user;
    }
  }

  /**
   * Сохранение пользователя в БД
   */
  async saveUser(chatId, user) {
    if (!this.isConnected) {
      console.error(chalk.red('❌ MongoDB не подключена!'));
      return false;
    }

    try {
      const userData = user.toMongoDB();
      
      await this.collection.updateOne(
        { chatId },
        { $set: userData },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Ошибка сохранения пользователя ${chatId}:`), error);
      return false;
    }
  }

  /**
   * Добавление пользователя в кэш
   */
  addToCache(chatId, user) {
    // Если кэш переполнен, удаляем самого старого
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(chatId, user);
  }

  /**
   * Периодическое сохранение кэшированных пользователей
   */
  async saveAllCached() {
    if (!this.isConnected || this.cache.size === 0) return;

    console.log(chalk.blue(`💾 Сохранение ${this.cache.size} пользователей из кэша...`));
    
    let savedCount = 0;
    const batchOps = [];

    for (const [chatId, user] of this.cache) {
      const userData = user.toMongoDB();
      
      batchOps.push({
        updateOne: {
          filter: { chatId },
          update: { $set: userData },
          upsert: true
        }
      });
    }

    try {
      if (batchOps.length > 0) {
        const result = await this.collection.bulkWrite(batchOps);
        savedCount = result.upsertedCount + result.modifiedCount;
        console.log(chalk.green(`✅ Сохранено ${savedCount} пользователей в MongoDB`));
      }
    } catch (error) {
      console.error(chalk.red('Ошибка batch сохранения:'), error);
    }

    // Показываем статистику
    const stats = await this.getStats();
    console.log(chalk.cyan(`📊 Статистика: ${stats.totalUsers} в БД, ${this.cache.size} в кэше`));
  }

  /**
   * Очистка неактивных пользователей из кэша
   */
  cleanupCache() {
    const before = this.cache.size;
    let cleanedCount = 0;

    for (const [chatId, user] of this.cache) {
      if (user.isInactive(this.cacheTimeout)) {
        this.cache.delete(chatId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(chalk.magenta(`🧹 Очистка кэша: удалено ${cleanedCount} неактивных (было ${before}, стало ${this.cache.size})`));
    }
  }

  /**
   * Получение статистики
   */
  async getStats() {
    try {
      const totalUsers = await this.collection.countDocuments();
      const activeUsers = await this.collection.countDocuments({
        lastActivity: { $gte: Date.now() - 24 * 60 * 60 * 1000 }
      });
      
      return {
        totalUsers,
        activeUsers,
        cachedUsers: this.cache.size,
        isConnected: this.isConnected
      };
    } catch (error) {
      console.error(chalk.red('Ошибка получения статистики:'), error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        cachedUsers: this.cache.size,
        isConnected: this.isConnected
      };
    }
  }

  /**
   * Удаление старых неактивных пользователей из БД
   */
  async cleanupInactiveUsers(daysThreshold = 30) {
    if (!this.isConnected) return;

    try {
      const threshold = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
      const result = await this.collection.deleteMany({
        lastActivity: { $lt: threshold }
      });
      
      if (result.deletedCount > 0) {
        console.log(chalk.magenta(`🗑️ Удалено ${result.deletedCount} неактивных пользователей (старше ${daysThreshold} дней)`));
      }
    } catch (error) {
      console.error(chalk.red('Ошибка очистки неактивных пользователей:'), error);
    }
  }

  /**
   * Запуск периодических задач
   */
  startPeriodicTasks() {
    // Сохранение каждые 2 минуты
    this.saveTimer = setInterval(() => {
      this.saveAllCached();
    }, 2 * 60 * 1000);

    // Очистка кэша каждые 5 минут
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);

    // Очистка БД каждые 6 часов
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 6 * 60 * 60 * 1000);

    console.log(chalk.blue('⏰ Периодические задачи запущены'));
  }

  /**
   * Корректное завершение работы
   */
  async disconnect() {
    console.log(chalk.yellow('🔄 Завершение работы UserDataManager...'));
    
    // Останавливаем таймеры
    if (this.saveTimer) clearInterval(this.saveTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    
    // Сохраняем все данные
    await this.saveAllCached();
    
    // Закрываем соединение с MongoDB
    if (this.client) {
      await this.client.close();
      console.log(chalk.green('✅ MongoDB соединение закрыто'));
    }
    
    console.log(chalk.green('✅ UserDataManager завершил работу'));
  }

  
  async ping() {
    try {
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      console.error(chalk.red('MongoDB ping failed:'), error);
      return false;
    }
  }
}