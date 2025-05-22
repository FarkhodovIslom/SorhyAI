import path from 'path';
import { fileURLToPath } from 'url';

// Константы
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEVELOPER_ID = 1927786652;
const MAX_HISTORY_LENGTH = 10; // Максимум сообщений в истории
const MAX_HISTORY_CHARS = 5000; // Максимум символов в истории
const SAVE_INTERVAL = 30000; // Сохранение каждые 30 секунд
const CLEANUP_INTERVAL = 300000; // Очистка неактивных чатов каждые 5 минут
const INACTIVE_THRESHOLD = 3600000; // Час неактивности для удаления из RAM

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Emoji для моделей
const MODEL_EMOJIS = {
  lite: '🫧',
  pro: '🔥',
  x: '🦾'
};

export {
  PORT,
  __filename,
  __dirname,
  DEVELOPER_ID,
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_CHARS,
  SAVE_INTERVAL,
  CLEANUP_INTERVAL,
  INACTIVE_THRESHOLD,
  DATA_DIR,
  USERS_FILE,
  MODEL_EMOJIS
};
