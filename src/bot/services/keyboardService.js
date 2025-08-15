// services/keyboardService.js
import { InlineKeyboard } from 'grammy';
import { MODEL_EMOJIS, MODELS } from '../config/config.js';
import { getLocalized } from '../localization/localization.js';

/**
 * Сервис для создания клавиатур
 */
export class KeyboardService {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Создание клавиатуры настроек
   */
  createSettingsKeyboard(user) {
    const keyboard = new InlineKeyboard();
    const userLangMap = new Map([[user.chatId || 0, user.language]]);
    
    // Кнопка смены языка
    const changeLanguageBtn = getLocalized(user.chatId || 0, userLangMap, 'changeLanguageBtn');
    keyboard.text(`🌐 ${changeLanguageBtn}`, 'settings_language').row();
    
    // Кнопки моделей
    const modelBtn = getLocalized(user.chatId || 0, userLangMap, 'modelBtn');
    const currentModel = this.getModelDisplayName(user.model);
    keyboard.text(`🤖 ${modelBtn}: ${currentModel}`, 'settings_model').row();
    
    // Кнопка сброса истории
    const clearHistoryBtn = getLocalized(user.chatId || 0, userLangMap, 'clearHistoryBtn');
    keyboard.text(`🗑️ ${clearHistoryBtn}`, 'settings_reset').row();
    
    // Кнопка помощи
    const helpBtn = getLocalized(user.chatId || 0, userLangMap, 'helpBtn');
    keyboard.text(`❓ ${helpBtn}`, 'settings_help').row();
    
    // Кнопка закрыть
    const closeBtn = getLocalized(user.chatId || 0, userLangMap, 'closeBtn');
    keyboard.text(`❌ ${closeBtn}`, 'settings_close').row();
    
    return keyboard;
  }

  /**
   * Создание клавиатуры выбора модели
   */
  createModelKeyboard(currentModel, language) {
    const keyboard = new InlineKeyboard();
    const userLangMap = new Map([[0, language]]);
    
    Object.entries(MODELS).forEach(([modelKey, modelValue]) => {
      const isActive = currentModel === modelValue;
      const modelName = this.getModelName(modelKey);
      const emoji = MODEL_EMOJIS[modelKey.toLowerCase()];
      const checkmark = isActive ? ' ✅' : '';
      
      const text = `${emoji} ${modelName}${checkmark}`;
      keyboard.text(text, `model_${modelKey.toLowerCase()}`).row();
    });
    
    // Кнопка "Назад"
    const backBtn = getLocalized(0, userLangMap, 'backBtn');
    keyboard.text(`🔙 ${backBtn}`, 'settings_back').row();
    
    return keyboard;
  }

  /**
   * Получение отображаемого имени модели
   */
  getModelDisplayName(modelValue) {
    for (const [modelKey, value] of Object.entries(MODELS)) {
      if (value === modelValue) {
        const emoji = MODEL_EMOJIS[modelKey.toLowerCase()];
        const name = this.getModelName(modelKey);
        return `${emoji} ${name}`;
      }
    }
    return 'Unknown';
  }

  /**
   * Получение имени модели без эмодзи
   */
  getModelName(modelKey) {
    const modelNames = {
      'LITE': 'Lite',
      'PRO': 'Pro', 
      'X': 'X'
    };
    return modelNames[modelKey] || modelKey;
  }

  /**
   * Получение отображаемого имени языка
   */
  getLanguageDisplayName(language) {
    const langNames = {
      'en': '🇺🇸 English',
      'ru': '🇷🇺 Русский', 
      'uz': '🇺🇿 O\'zbekcha'
    };
    return langNames[language] || language;
  }

  /**
   * Создание клавиатуры подтверждения
   */
  createConfirmationKeyboard(language, confirmAction, cancelAction = 'settings_back') {
    const keyboard = new InlineKeyboard();
    const userLangMap = new Map([[0, language]]);
    
    const confirmBtn = getLocalized(0, userLangMap, 'confirmBtn');
    const cancelBtn = getLocalized(0, userLangMap, 'cancelBtn');
    
    keyboard
      .text(`✅ ${confirmBtn}`, confirmAction)
      .text(`❌ ${cancelBtn}`, cancelAction);
      
    return keyboard;
  }

  /**
   * Создание пустой клавиатуры для удаления
   */
  createEmptyKeyboard() {
    return new InlineKeyboard();
  }
}