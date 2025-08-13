// localization/keys.js

/**
 * Ключи локализации для всех UI-элементов
 */
export const LOCALIZATION_KEYS = {
  // Кнопки интерфейса
  'changeLanguageBtn': {
    'en': 'Change Language',
    'ru': 'Сменить язык',
    'uz': 'Tilni o\'zgartirish'
  },
  
  'modelBtn': {
    'en': 'Model',
    'ru': 'Модель',
    'uz': 'Model'
  },
  
  'clearHistoryBtn': {
    'en': 'Clear History',
    'ru': 'Очистить историю',
    'uz': 'Tarixni tozalash'
  },
  
  'helpBtn': {
    'en': 'Help',
    'ru': 'Помощь',
    'uz': 'Yordam'
  },
  
  'backBtn': {
    'en': 'Back',
    'ru': 'Назад',
    'uz': 'Orqaga'
  },
  
  'confirmBtn': {
    'en': 'Confirm',
    'ru': 'Подтвердить',
    'uz': 'Tasdiqlash'
  },
  
  'cancelBtn': {
    'en': 'Cancel',
    'ru': 'Отмена',
    'uz': 'Bekor qilish'
  },
  
  'backToSettings': {
    'en': 'Back to Settings',
    'ru': 'Назад к настройкам',
    'uz': 'Sozlamalarga qaytish'
  },

  // Сообщения команд
  'selectLanguageWelcome': {
    'multi': 'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:'
  },
  
  'startMessage': {
    'en': '🤖 Welcome to Sorhy AI Bot!\n\nI\'m powered by advanced AI models and ready to help you with any questions or tasks.\n\nAvailable models:\n🟢 Lite - Fast and efficient\n🔵 Pro - Advanced with image support  \n🟣 X - Most powerful with image support\n\nUse /settings to customize your experience!',
    'ru': '🤖 Добро пожаловать в Sorhy AI Bot!\n\nЯ работаю на продвинутых AI моделях и готов помочь вам с любыми вопросами и задачами.\n\nДоступные модели:\n🟢 Lite - Быстрая и эффективная\n🔵 Pro - Продвинутая с поддержкой изображений\n🟣 X - Самая мощная с поддержкой изображений\n\nИспользуйте /settings для настройки!',
    'uz': '🤖 Sorhy AI Bot\'ga xush kelibsiz!\n\nMen ilg\'or AI modellar asosida ishlayman va sizga har qanday savol va vazifalar bilan yordam berishga tayyorman.\n\nMavjud modellar:\n🟢 Lite - Tez va samarali\n🔵 Pro - Rasm qo\'llab-quvvatlash bilan ilg\'or\n🟣 X - Rasm qo\'llab-quvvatlash bilan eng kuchli\n\nSozlamalarni ochish uchun /settings dan foydalaning!'
  },

  'helpMessage': {
    'en': '🔧 <b>Available Commands:</b>\n\n/settings - Open settings menu\n/start - Start the bot\n/reset - Clear conversation history\n/language - Change language\n/help - Show this help\n\n<b>Model Commands:</b>\n/model_lite - Switch to Lite model\n/model_pro - Switch to Pro model  \n/model_x - Switch to X model\n\n<b>Features:</b>\n• Text conversations with AI\n• Image analysis (Pro/X models)\n• Multiple languages support\n• Conversation history\n\nJust send me a message to start chatting!',
    'ru': '🔧 <b>Доступные команды:</b>\n\n/settings - Открыть меню настроек\n/start - Запустить бота\n/reset - Очистить историю разговора\n/language - Изменить язык\n/help - Показать эту справку\n\n<b>Команды моделей:</b>\n/model_lite - Переключиться на модель Lite\n/model_pro - Переключиться на модель Pro\n/model_x - Переключиться на модель X\n\n<b>Возможности:</b>\n• Текстовые разговоры с ИИ\n• Анализ изображений (модели Pro/X)\n• Поддержка нескольких языков\n• Контекстная память\n\nПросто отправьте мне сообщение, чтобы начать общение!',
    'uz': '🔧 <b>Mavjud buyruqlar:</b>\n\n/settings - Sozlamalar menyusini ochish\n/start - Botni ishga tushirish\n/reset - Suhbat tarixini tozalash\n/language - Tilni o\'zgartirish\n/help - Bu yordamni ko\'rsatish\n\n<b>Model buyruqlari:</b>\n/model_lite - Lite modelga o\'tish\n/model_pro - Pro modelga o\'tish\n/model_x - X modelga o\'tish\n\n<b>Imkoniyatlar:</b>\n• AI bilan matnli suhbatlar\n• Rasm tahlili (Pro/X modellari)\n• Ko\'p til qo\'llab-quvvatlash\n• Suhbat tarixi\n\nSuhbatni boshlash uchun menga xabar yuboring!'
  },

  'settingsMessage': {
    'en': '⚙️ <b>Settings</b>\n\n🤖 <b>Current model:</b> {currentModel}\n🌐 <b>Language:</b> {currentLanguage}\n📊 <b>Messages in history:</b> {historyCount}\n\nSelect what you want to change:',
    'ru': '⚙️ <b>Настройки</b>\n\n🤖 <b>Текущая модель:</b> {currentModel}\n🌐 <b>Язык:</b> {currentLanguage}\n📊 <b>Сообщений в истории:</b> {historyCount}\n\nВыберите что хотите изменить:',
    'uz': '⚙️ <b>Sozlamalar</b>\n\n🤖 <b>Joriy model:</b> {currentModel}\n🌐 <b>Til:</b> {currentLanguage}\n📊 <b>Tarixdagi xabarlar:</b> {historyCount}\n\nO\'zgartirmoqchi bo\'lgan narsani tanlang:'
  },

  'selectLanguage': {
    'en': '🌍 Please select your language:',
    'ru': '🌍 Пожалуйста, выберите язык:',
    'uz': '🌍 Iltimos, tilingizni tanlang:'
  },

  'selectModel': {
    'en': '🤖 <b>Model Selection</b>\n\n<b>Current model:</b> {currentModel}\n\n<i>Lite:</i> Fast and economical model\n<i>Pro:</i> Advanced model with image support\n<i>X:</i> Most powerful model with image support\n\nSelect a model:',
    'ru': '🤖 <b>Выбор модели</b>\n\n<b>Текущая модель:</b> {currentModel}\n\n<i>Lite:</i> Быстрая и экономичная модель\n<i>Pro:</i> Продвинутая модель с поддержкой изображений\n<i>X:</i> Самая мощная модель с поддержкой изображений\n\nВыберите модель:',
    'uz': '🤖 <b>Model tanlash</b>\n\n<b>Joriy model:</b> {currentModel}\n\n<i>Lite:</i> Tez va tejamkor model\n<i>Pro:</i> Rasm qo\'llab-quvvatlaydigan ilg\'or model\n<i>X:</i> Rasm qo\'llab-quvvatlaydigan eng kuchli model\n\nModel tanlang:'
  },

  // Уведомления и статусы
  'languageChanged': {
    'en': '🌍 Language changed to English!',
    'ru': '🌍 Язык изменен на русский!',
    'uz': '🌍 Til o\'zbekchaga o\'zgartirildi!'
  },

  'modelChanged': {
    'en': 'Model changed to {model}!',
    'ru': 'Модель изменена на {model}!',
    'uz': 'Model {model}ga o\'zgartirildi!'
  },

  'modelAlreadySelected': {
    'en': 'Model already selected!',
    'ru': 'Модель уже выбрана!',
    'uz': 'Model allaqachon tanlangan!'
  },

  'modelAlreadyInUse': {
    'en': '✅ You are already using the {model} model!',
    'ru': '✅ Вы уже используете модель {model}!',
    'uz': '✅ Siz allaqachon {model} modelidan foydalanmoqdasiz!'
  },

  'modelSwitched': {
    'en': '🤖 Switched to {model} {emoji} model!',
    'ru': '🤖 Переключено на модель {model} {emoji}!',
    'uz': '🤖 {model} {emoji} modelga o\'tkazildi!'
  },

  'historyCleared': {
    'en': 'History cleared!',
    'ru': 'История очищена!',
    'uz': 'Tarix tozalandi!'
  },

  'resetHistory': {
    'en': '🗑️ Conversation history cleared!',
    'ru': '🗑️ История чата очищена!',
    'uz': '🗑️ Chat tarixi tozalandi!'
  },

  'unknownCommand': {
    'en': '❌ Unknown command. Use /help to see available commands.',
    'ru': '❌ Неизвестная команда. Используйте /help для просмотра доступных команд.',
    'uz': '❌ Noma\'lum buyruq. Mavjud buyruqlarni ko\'rish uchun /help dan foydalaning.'
  },

  'errorMessage': {
    'en': '⌛ Sorry, an error occurred. Please try again later.',
    'ru': '⌛ Извините, произошла ошибка. Попробуйте позже.',
    'uz': '⌛ Kechirasiz, xatolik yuz berdi. Keyinroq urinib ko\'ring.'
  },

  'imageNotSupported': {
    'en': '⌛ Current model doesn\'t support images. Please switch to Pro or X model using /settings',
    'ru': '⌛ Текущая модель не поддерживает изображения. Переключитесь на модель Pro или X через /settings',
    'uz': '⌛ Joriy model rasmlarni qo\'llab-quvvatlamaydi. /settings orqali Pro yoki X modelga o\'ting'
  },

  'onlyTextAndImages': {
    'en': '📝 I can only process text messages and images.',
    'ru': '📝 Я могу обрабатывать только текстовые сообщения и изображения.',
    'uz': '📝 Men faqat matnli xabarlar va rasmlarni o\'qiy olaman.'
  },

  'cooldownMessage': {
    'en': '⏱️ Please wait before sending the next message.',
    'ru': '⏱️ Подождите немного перед отправкой следующего сообщения.',
    'uz': '⏱️ Keyingi xabar yuborish uchun biroz kuting.'
  },

  'defaultImageQuery': {
    'en': 'What do you see in this image?',
    'ru': 'Что вы видите на этом изображении?',
    'uz': 'Bu rasmda nimani ko\'ryapsiz?'
  },

  'settingsTitle': {
    'en': '⚙️ Settings',
    'ru': '⚙️ Настройки',
    'uz': '⚙️ Sozlamalar'
  },

  'settingsCurrentModel': {
    'en': '🤖 Current model: {model}',
    'ru': '🤖 Текущая модель: {model}',
    'uz': '🤖 Joriy model: {model}'
  },

  'settingsCurrentLanguage': {
    'en': '🌍 Language: {language}',
    'ru': '🌍 Язык: {language}',
    'uz': '🌍 Til: {language}'
  },

  'settingsHistoryCount': {
    'en': '📊 Messages in history: {count}',
    'ru': '📊 Сообщений в истории: {count}',
    'uz': '📊 Tarixtagi xabarlar: {count}'
  },

  'settingsChooseAction': {
    'en': 'Choose what you want to change:',
    'ru': 'Выберите что хотите изменить:',
    'uz': 'Nima o\'zgartirmoqchi ekanligingizni tanlang:'
  },

  'settingsModelSelection': {
    'en': '🤖 Model Selection',
    'ru': '🤖 Выбор модели',
    'uz': '🤖 Model tanlash'
  },

  'settingsModelDescription': {
    'en': 'Current model: {model}\n\nLite: Fast and economical model\nPro: Advanced model with image support  \nX: Most powerful model with image support\n\nChoose a model:',
    'ru': 'Текущая модель: {model}\n\nLite: Быстрая и эффекивная модель\nPro: Продвинутая модель с поддержкой изображений\nX: Самая мощная модель с поддержкой изображений\n\nВыберите модель:',
    'uz': 'Joriy model: {model}\n\nLite: Tez va tejamkor model\nPro: Rasm qo\'llab-quvvatlash bilan ilg\'or model\nX: Rasm qo\'llab-quvvatlash bilan eng kuchli model\n\nModel tanlang:'
  },

  'botStarting': {
    'en': 'Starting Telegram Bot...',
    'ru': 'Запуск Telegram бота...',
    'uz': 'Telegram Bot ishga tushirilmoqda...'
  },

  'botActive': {
    'en': 'Bot @{username} ({id}) active!',
    'ru': 'Бот @{username} ({id}) активен!',
    'uz': 'Bot @{username} ({id}) faol!'
  },

  'mongoConnectionFailed': {
    'en': 'MongoDB connection failed. Bot may be unstable.',
    'ru': 'Не удалось подключиться к MongoDB. Бот может работать нестабильно.',
    'uz': 'MongoDB ulanishi muvaffaqiyatsiz. Bot beqaror ishlashi mumkin.'
  },

  'serverRunning': {
    'en': 'Server running on port {port}',
    'ru': 'Сервер запущен на порту {port}',
    'uz': 'Server {port} portida ishlamoqda'
  },

  'rateLimitActive': {
    'en': 'Rate limiting active (1 message / 10 seconds)',
    'ru': 'Rate limiting активен (1 сообщение / 10 секунд)',
    'uz': 'Rate limiting faol (10 soniyada 1 xabar)'
  },

  'shutdownReceived': {
    'en': 'Shutdown signal received...',
    'ru': 'Получен сигнал завершения...',
    'uz': 'To\'xtatish signali qabul qilindi...'
  },

  'accessDenied': {
    'en': 'Access denied! You are not Hanzo!',
    'ru': 'Доступ запрещен! Вы не Ханзо!',
    'uz': 'Ruxsat berilmadi! Siz Hanzo emassiz!'
  },

  'logFileNotFound': {
    'en': 'Log file not found.',
    'ru': 'Файл лога не найден.',
    'uz': 'Log fayli topilmadi.'
  },

  'statisticsUnavailable': {
    'en': 'Statistics unavailable',
    'ru': 'Статистика недоступна',
    'uz': 'Statistika mavjud emas'
  },

  'statsMessage': {
    'ru': '📊 <b>Статистика бота:</b>\n\n👥 Пользователи:\n• Всего в БД: <code>{totalUsers}</code>\n• Активных (24ч): <code>{activeUsers}</code>\n• В кэше: <code>{cachedUsers}</code>\n\n💻 Система:\n• RAM: <code>{memoryUsage}MB</code>\n• Uptime: <code>{uptime} мин</code>\n• MongoDB: <code>{dbStatus}</code>\n\n🛡️ Rate Limiting: <code>✅ Активно</code>'
  }
};