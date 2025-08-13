// localization/localization.js
import { InlineKeyboard } from 'grammy';
import { LOCALIZATION_KEYS } from './keys.js';

export const LANGUAGES = {
  'en': 'en',
  'ru': 'ru', 
  'uz': 'uz'
};

/**
 * Получение локализованного текста
 * @param {number} chatId - ID чата
 * @param {Map} userLanguages - Карта пользователей и их языков
 * @param {string} key - Ключ локализации
 * @param {Object} params - Параметры для подстановки
 * @returns {string} - Локализованный текст
 */
export function getLocalized(chatId, userLanguages, key, params = {}) {
  const userLanguage = userLanguages.get(chatId) || 'en';
  const localizedStrings = LOCALIZATION_KEYS[key];
  
  if (!localizedStrings) {
    console.warn(`Localization key not found: ${key}`);
    return `[Missing: ${key}]`;
  }
  
  // Специальная обработка для мультиязычных сообщений
  if (userLanguage === 'multi') {
    const text = localizedStrings['multi'];
    return text ? interpolateParams(text, params) : `[Missing multi: ${key}]`;
  }
  
  const text = localizedStrings[userLanguage] || localizedStrings['en'] || `[Missing: ${key}]`;
  return interpolateParams(text, params);
}

/**
 * Подстановка параметров в текст
 * @param {string} text - Текст с плейсхолдерами
 * @param {Object} params - Параметры для подстановки
 * @returns {string} - Текст с подставленными параметрами
 */
function interpolateParams(text, params) {
  if (!params || Object.keys(params).length === 0) {
    return text;
  }
  
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return result;
}

/**
 * Создание клавиатуры выбора языка
 * @param {boolean} includeBack - Включить кнопку "Назад"
 * @returns {InlineKeyboard} - Клавиатура выбора языка
 */
export function createLanguageKeyboard(includeBack = false) {
  const keyboard = new InlineKeyboard();
  
  // Языковые кнопки
  keyboard
    .text('🇺🇸 English', 'lang_en')
    .text('🇷🇺 Русский', 'lang_ru').row()
    .text('🇺🇿 O\'zbekcha', 'lang_uz').row();
  
  // Кнопка "Назад" если нужна
  if (includeBack) {
    keyboard.text('🔙 Назад', 'settings_back').row();
  }
  
  return keyboard;
}

/**
 * Получение списка доступных языков
 * @returns {Array} - Массив объектов с информацией о языках
 */
export function getAvailableLanguages() {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'uz', name: 'O\'zbekcha', flag: '🇺🇿' }
  ];
}

/**
 * Проверка, поддерживается ли язык
 * @param {string} langCode - Код языка
 * @returns {boolean} - true если язык поддерживается
 */
export function isLanguageSupported(langCode) {
  return Object.keys(LANGUAGES).includes(langCode);
}

/**
 * Получение языка по умолчанию для региона
 * @param {string} countryCode - Код страны
 * @returns {string} - Код языка
 */
export function getDefaultLanguageForCountry(countryCode) {
  const countryLanguageMap = {
    'RU': 'ru',
    'UZ': 'uz',
    'KZ': 'ru',
    'KG': 'ru',
    'TJ': 'ru',
    'BY': 'ru',
    'UA': 'ru'
  };
  
  return countryLanguageMap[countryCode] || 'en';
}

/**
 * Форматирование числительных с правильными окончаниями
 * @param {number} count - Количество
 * @param {string} language - Язык
 * @param {Object} forms - Формы слова
 * @returns {string} - Форматированная строка
 */
export function formatPlural(count, language, forms) {
  if (language === 'ru') {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5];
    return `${count} ${forms.ru[index]}`;
  }
  
  if (language === 'en') {
    return `${count} ${count === 1 ? forms.en[0] : forms.en[1]}`;
  }
  
  if (language === 'uz') {
    return `${count} ${forms.uz[0]}`;
  }
  
  return `${count} ${forms.en[1]}`;
}