import { MongoClient, ServerApiVersion } from 'mongodb';
import chalk from 'chalk';
import dotenv from 'dotenv';
dotenv.config();

class UserModel {
    constructor(data = {}) {
        const now = Date.now();
        
        this.chatId = data.chatId;
        this.model = data.model || process.env.MODEL_PRO;
        this.language = data.language || null;
        this.history = data.history || [];
        this.lastActivity = data.lastActivity || now;
        this.createdAt = data.createdAt || now;
        this.updatedAt = data.updatedAt || now;
    }

    addToHistory(userMsg, assistantMsg, maxLength = 50, maxChars = 50000) {
        this.history.push(
            {
                role: 'user',
                content: userMsg,
                timestamp: Date.now()
            },
            {
                role: 'assistant',
                content: assistantMsg,
                timestamp: Date.now()
            }
        );

        if (this.history.length > maxLength) {
            this.history = this.history.slice(-maxLength);
        }

        this.truncateHistoryBySize(maxChars);
        this.updateActivity();
    }

    truncateHistoryBySize(maxChars) {
        let totalChars = JSON.stringify(this.history).length;
        while (totalChars > maxChars && this.history.length > 2) {
            this.history.splice(0, 2);
            totalChars = JSON.stringify(this.history).length;
        }
    }

    updateActivity() {
        this.lastActivity = Date.now();
        this.updatedAt = Date.now();
    }

    isInactive(threshold = 24 * 60 * 60 * 1000) {
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
        this.maxCacheSize = 1000;
        this.cacheTimeout = 30 * 60 * 1000; // 30 минут
        this.isConnected = false;
        
        // Очередь для сохранения (батчинг)
        this.saveQueue = new Set();
        this.isSaving = false;
        
        // Таймеры
        this.saveTimer = null;
        this.cleanupTimer = null;
        
        console.log(chalk.blue('📄 Инициализация UserDataManager с MongoDB...'));
    }

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
                connectTimeoutMS: 10000,
                socketTimeoutMS: 10000,
            });

            await this.client.connect();
            this.db = this.client.db(this.dbName);
            this.collection = this.db.collection(this.collectionName);
            
            await this.createIndexes();
            this.isConnected = true;
            
            console.log(chalk.green('✅ MongoDB подключена успешно!'));
            this.startPeriodicTasks();
            
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Ошибка подключения к MongoDB:'), error);
            this.isConnected = false;
            return false;
        }
    }

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

    async getUser(chatId) {
        // Проверяем кэш
        if (this.cache.has(chatId)) {
            const cachedUser = this.cache.get(chatId);
            cachedUser.updateActivity();
            return cachedUser;
        }

        try {
            const userData = await this.collection.findOne({ chatId });
            let user;

            if (userData) {
                user = new UserModel(userData);
                console.log(chalk.yellow(`👤 Пользователь ${chatId} загружен из MongoDB`));
            } else {
                user = new UserModel({ chatId });
                console.log(chalk.green(`🆕 Создан новый пользователь ${chatId}`));
                
                // Сразу сохраняем нового пользователя
                await this.saveUser(chatId, user);
            }

            this.addToCache(chatId, user);
            return user;
        } catch (error) {
            console.error(chalk.red(`Ошибка получения пользователя ${chatId}:`), error);
            const user = new UserModel({ chatId });
            this.addToCache(chatId, user);
            
            // Пытаемся сохранить в фоне
            this.saveUser(chatId, user).catch(console.error);
            
            return user;
        }
    }

    async saveUser(chatId, user, immediate = false) {
        if (!this.isConnected) {
            console.error(chalk.red('❌ MongoDB не подключена!'));
            return false;
        }

        try {
            if (immediate) {
                const userData = user.toMongoDB();
                await this.collection.updateOne(
                    { chatId },
                    { $set: userData },
                    { upsert: true }
                );
                return true;
            } else {
                // Добавляем в очередь для batch сохранения
                this.saveQueue.add(chatId);
                return true;
            }
        } catch (error) {
            console.error(chalk.red(`Ошибка сохранения пользователя ${chatId}:`), error);
            return false;
        }
    }

    addToCache(chatId, user) {
        // Очищаем кэш если превышен лимит
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            console.log(chalk.yellow(`🗑️ Удален из кэша: ${oldestKey}`));
        }
        
        this.cache.set(chatId, user);
    }

    async saveAllCached() {
        if (!this.isConnected || this.isSaving || this.cache.size === 0) return;

        this.isSaving = true;
        
        try {
            const batchOps = [];
            const usersToSave = [...this.saveQueue];
            
            for (const chatId of usersToSave) {
                const user = this.cache.get(chatId);
                if (user) {
                    const userData = user.toMongoDB();
                    batchOps.push({
                        updateOne: {
                            filter: { chatId },
                            update: { $set: userData },
                            upsert: true
                        }
                    });
                }
            }

            if (batchOps.length > 0) {
                console.log(chalk.blue(`💾 Сохранение ${batchOps.length} пользователей...`));
                
                const result = await this.collection.bulkWrite(batchOps, { ordered: false });
                const savedCount = result.upsertedCount + result.modifiedCount + result.matchedCount;
                
                console.log(chalk.green(`✅ Сохранено ${savedCount} пользователей в MongoDB`));
                
                // Очищаем очередь
                this.saveQueue.clear();
            }

        } catch (error) {
            console.error(chalk.red('Ошибка batch сохранения:'), error);
        } finally {
            this.isSaving = false;
        }
    }

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
                queuedSaves: this.saveQueue.size,
                isConnected: this.isConnected,
                isSaving: this.isSaving
            };
        } catch (error) {
            console.error(chalk.red('Ошибка получения статистики:'), error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                cachedUsers: this.cache.size,
                queuedSaves: this.saveQueue.size,
                isConnected: this.isConnected,
                isSaving: this.isSaving
            };
        }
    }

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

    startPeriodicTasks() {
        // Сохранение каждые 2 минуты
        this.saveTimer = setInterval(() => {
            this.saveAllCached();
        }, 2 * 60 * 1000);

        // Очистка кэша каждые 5 минут
        this.cleanupTimer = setInterval(() => {
            this.cleanupCache();
        }, 5 * 60 * 1000);

        // Очистка неактивных пользователей каждые 6 часов
        setInterval(() => {
            this.cleanupInactiveUsers();
        }, 6 * 60 * 60 * 1000);

        console.log(chalk.blue('⏰ Периодические задачи запущены'));
    }

    async disconnect() {
        console.log(chalk.yellow('🔄 Завершение работы UserDataManager...'));
        
        if (this.saveTimer) clearInterval(this.saveTimer);
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        
        // Принудительно сохраняем все данные
        await this.saveAllCached();
        
        if (this.client) {
            await this.client.close();
            console.log(chalk.green('✅ MongoDB соединение закрыто'));
        }
        
        console.log(chalk.green('✅ UserDataManager завершил работу'));
    }

    async ping() {
        if (!this.client) return false;
        
        try {
            await this.client.db('admin').command({ ping: 1 });
            return true;
        } catch (error) {
            console.error(chalk.red('MongoDB ping failed:'), error);
            this.isConnected = false;
            return false;
        }
    }

    // Новый метод для принудительного сохранения конкретного пользователя
    async saveUserImmediate(chatId) {
        const user = this.cache.get(chatId);
        if (user) {
            return await this.saveUser(chatId, user, true);
        }
        return false;
    }
}