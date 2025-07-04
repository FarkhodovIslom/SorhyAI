export const LANGUAGES = {
  ENG: 'English',
  RUS: 'Russian',
  UZB: 'Uzbek'
};

export const localization = {
  ENG: {
    startMessage: 'Hi 👋 I am SorhyAI. How can I help you today?',
    selectLanguage: 'Please select your preferred language:',
    languageChanged: 'Language switched to English ✅',
    resetHistory: 'Chat history cleared ✅',
    modelAlreadyInUse: 'Model Sorhy-{model} already in use ✔️',
    modelSwitched: 'Switched to Sorhy-{model} {emoji}',
    imageNotSupported: 'Image processing is available only with Sorhy-X models. Please switch your model or send text only.',
    onlyTextAndImages: 'I can only process text messages and images! 📄🖼️',
    errorMessage: 'Sorhy is little bit tired 😥. Switch to another model or try again later.',
    helpMessage: `
      <b>Hi! I am SorhyAI, your personal assistant. Here are some commands you can use:</b>
      
      /start – <b>🔅 Launch the bot </b>
      /reset – 🔄 Reset conversation history
      /model_lite – 🫧 Switch to Sorhy Lite
      /model_pro – 🔥 Switch to Sorhy Pro
      /model_x – 🦾 Switch to Sorhy X
      /language – 🌐 Change language
      /help – ❓ Get help 
      
      Ask me anything, and I will try to help as I can!
    `,
    unknownCommand: 'Unknown command. Use /help to see available commands.'
  },
  RUS: {
    startMessage: 'Привет 👋 Я SorhyAI. Чем могу помочь?',
    selectLanguage: 'Пожалуйста, выберите предпочитаемый язык:',
    languageChanged: 'Язык изменен на русский ✅',
    resetHistory: 'История чата очищена ✅',
    modelAlreadyInUse: 'Модель Sorhy-{model} уже используется ✔️',
    modelSwitched: 'Переключено на Sorhy-{model} {emoji}',
    imageNotSupported: 'Обработка изображений доступна только с моделями Sorhy-X. Пожалуйста, переключите модель или отправьте только текст.',
    onlyTextAndImages: 'Я могу обрабатывать только текстовые сообщения и изображения! 📄🖼️',
    errorMessage: 'Sorhy немного устала 😥. Переключитесь на другую модель или попробуйте позже.',
    helpMessage: `
      <b>Привет! Я SorhyAI, ваша персональная помощница. Вот команды, которые вы можете использовать:</b>
      
      /start – <b>🔅 Запустить бота </b>
      /reset – 🔄 Сбросить историю разговора
      /model_lite – 🫧 Переключиться на Sorhy Lite
      /model_pro – 🔥 Переключиться на Sorhy Pro
      /model_x – 🦾 Переключиться на Sorhy X
      /language – 🌐 Изменить язык
      /help – ❓ Получить помощь 
      
      Спрашивайте меня о чем угодно, и я постараюсь помочь!
    `,
    unknownCommand: 'Неизвестная команда. Используйте /help для просмотра доступных команд.'
  },
  UZB: {
    startMessage: 'Salom 👋 Men SorhyAI. Sizga qanday yordam bera olaman?',
    selectLanguage: 'Iltimos, o\'zingiz xohlagan tilni tanlang:',
    languageChanged: 'Til o\'zbekchaga o\'zgartirildi ✅',
    resetHistory: 'Chat tarixi tozalandi ✅',
    modelAlreadyInUse: 'Sorhy-{model} modeli allaqachon ishlatilmoqda ✔️',
    modelSwitched: 'Sorhy-{model} {emoji} ga o\'tkazildi',
    imageNotSupported: 'Rasm bilan ishlash faqat Sorhy-X modelli bilan mavjud. Iltimos, modelni o\'zgartiring yoki faqat matn yuboring.',
    onlyTextAndImages: 'Men faqat matn va rasmlarni o\'qiy olaman! 📄🖼️',
    errorMessage: 'Sorhy biroz charchadi 😥. Boshqa modelga o\'ting yoki keyinroq qayta urinib ko\'ring.',
    helpMessage: `
      <b>Salom! Men SorhyAI, shaxsiy yordamchingizman. Mana ba'zi foydalanishingiz mumkin bo'lgan buyruqlar:</b>
      
      /start – <b>🔅 Botni ishga tushirish </b>
      /reset – 🔄 Suhbat tarixini tozalash
      /model_lite – 🫧 Sorhy Lite ga o'tish
      /model_pro – 🔥 Sorhy Pro ga o'tish
      /model_x – 🦾 Sorhy X ga o'tish
      /language – 🌐 Tilni o'zgartirish
      /help – ❓ Yordam olish 
      
      Mendan xohlagan narsangizni so'rang, va men qo\'limdan kelgancha yordam beraman!
    `,
    unknownCommand: 'Nomalum komanda. Mavjud komandalarni ko\'rish uchun /help dan foydalaning'
  }
};

export function getUserLanguage(chatId, userLanguages) {
  if (userLanguages instanceof Map) {
    return userLanguages.get(chatId) || LANGUAGES.RUS;
  } else if (typeof userLanguages === 'object' && userLanguages !== null) {
    return userLanguages[chatId] || LANGUAGES.RUS;
  }
  return LANGUAGES.RUS;
};

export function getLocalized(chatId, userLanguages = new Map(), key, replacements = {}) {
  const langCode = Object.keys(LANGUAGES).find(code => 
    LANGUAGES[code] === getUserLanguage(chatId, userLanguages)
  ) || 'RUS';

  let text = localization[langCode][key] || localization.ENG[key];

  // Заменяем все плейсхолдеры
  Object.entries(replacements).forEach(([placeholder, value]) => {
    text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
  });

  return text;
};

export function createLanguageKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'English 🇬🇧', callback_data: 'lang_ENG' },
          { text: 'Русский 🇷🇺', callback_data: 'lang_RUS' },
          { text: 'O\'zbek 🇺🇿', callback_data: 'lang_UZB' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
};