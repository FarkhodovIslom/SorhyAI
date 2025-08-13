import path from 'path';
import { fileURLToPath } from 'url';

// Константы
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_HISTORY_LENGTH = 75; // Максимум сообщений в истории
const MAX_HISTORY_CHARS = 12000; // Максимум символов в истории
const SAVE_INTERVAL = 30000; // Сохранение каждые 30 секунд
const CLEANUP_INTERVAL = 300000; // Очистка неактивных чатов каждые 5 минут
const INACTIVE_THRESHOLD = 3600000; // Час неактивности для удаления из RAM
const MONGO_URI = 'mongodb+srv://hanzo:hanzodev@cluster0.ykoev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/'; 
const MODEL_TEMP = 1;
const MODEL_TOP_P = 1;

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Emoji для моделей
const MODEL_EMOJIS = {
  lite: '🫧',
  pro: '🔥',
  x: '🦾'
};

// Экспорты с константой
// Основные настройки
export const DEVELOPER_ID = parseInt(process.env.DEVELOPER_ID) || 0;

// Конфигурация моделей
export const MODELS = {
  'LITE': process.env.MODEL_LITE ,
  'PRO': process.env.MODEL_PRO,
  'X': process.env.MODEL_X
};


// Настройки по умолчанию
export const DEFAULT_SETTINGS = {
  model: MODELS.LITE,
  language: 'en',
  maxHistoryLength: 20,
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000 // 1 минута
  }
};

// Настройки базы данных
export const DB_CONFIG = {
  connectionTimeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Настройки кэширования
export const CACHE_CONFIG = {
  userCacheTTL: 5 * 60 * 1000, // 5 минут
  maxCacheSize: 1000,
  cleanupInterval: 10 * 60 * 1000 // 10 минут
};

// Настройки логирования
export const LOG_CONFIG = {
  logToConsole: true,
  logToFile: process.env.NODE_ENV === 'production',
  notifyDeveloper: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export {
  PORT,
  __filename,
  __dirname,
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_CHARS,
  SAVE_INTERVAL,
  CLEANUP_INTERVAL,
  INACTIVE_THRESHOLD,
  DATA_DIR,
  USERS_FILE,
  MODEL_EMOJIS,
  MONGO_URI,
  MODEL_TEMP,
  MODEL_TOP_P
};
