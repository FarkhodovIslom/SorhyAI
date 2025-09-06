// localization/keys.js

/**
 * UI localization keys
 */
export const LOCALIZATION_KEYS = {
  // Interface buttons
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

  'closeBtn': {
    'en': 'Close',
    'ru': 'Закрыть',
    'uz': 'Yopish'
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


  // Command messages
  'selectLanguageWelcome': {
    'multi': 'Please select your language / Пожалуйста, выберите язык / Iltimos, tilingizni tanlang:'
  },
  
  'startMessage': {
    'en': '👋 Hey there! I\'m Sorhy AI Bot!\n\nLooking for a all-in-one chat buddy? You\'ve found the right AI! I love deep conversations, casual banter, creative brainstorming, even coding!\n\n💬 Chat Modes:\n🟢 Lite - Quick & witty responses\n🔵 Pro - Deeper conversations + can see images you share\n🟣 X - Most thoughtful discussions & solving complex problems\n\nSo... what\'s up? Drop me a message or use /settings to customize how we chat! 😊',
    'ru': '👋 Привет! Я Sorhy AI Bot!\n\nИщешь All-in-one чатбота? Ты по адресу! Обожаю глубокие разговоры, непринужденную болтовню, креативные идеи или даже могу помочь с кодом!\n\n💬 Мои модели:\n🟢 Lite - Быстрый и легковесный\n🔵 Pro - Глубокие беседы + могу видеть твои картинки\n🟣 X - Самые вдумчивые диалоги и глубокий анализ кода, сложных задач и тд.\n\nТак... как дела? Пиши что на душе или жми /settings для настройки! 😊',
    'uz': '👋 Salom! Men Sorhy AI Bot!\n\nAll-in-one Chatbot qidiryapsizmi? To\'g\'ri joyda siz! Men chuqur suhbatlar, erkin gaplashish, ijodiy g\'oyalar haqida va hatto kodham yoza olaman!.\n\n💬 Mening modellarim:\n🟢 Lite - Tez va Yengil\n🔵 Pro - Chuqur suhbatlar + rasmlaringizni ko\'ra olaman\n🟣 X - Chuqur dialoglar va qiyin algoritm va masalalarni tushunish\n\nXo\'sh... nima haqida gaplashamiz? Parametrlar uchun /settings dan foydalaning! 😊'
  },

  'helpMessage': {
    'en': '🛠️ <b>Commands & Stuff:</b>\n\n/settings - Customize your chat experience\n/start - Restart our conversation\n/reset - Fresh start (bye bye my memory! 😄)\n/language - Switch languages\n/help - You\'re looking at it! 😆\n\n<b>Switch Models:</b>\n/model_lite - Fast and lighweight 🏃‍♂️\n/model_pro - Smart + sees your pics 📸\n/model_x - Most powerful model\n\n<b>What I can do:</b>\n• Chat about literally anything\n• Look at your images and tell you what\'s up\n• Talk in multiple languages\n• Coding, bug fixing and problem solving!\n\nJust drop me a line and let\'s get this conversation rolling! 💬',
    'ru': '🛠️ <b>Команды и всякое:</b>\n\n/settings - Настрой бота под себя\n/start - Перезапустить меня\n/reset - Начать с чистого листа (стереть мою память 😄)\n/language - Сменить язык\n/help - Ты это сейчас читаешь! 😆\n\n<b>Переключение моделей:</b>\n/model_lite - Легкая и быстрая 🏃‍♂️\n/model_pro - Умная + видит твои картинки 📸\n/model_x - Самый мощный\n\n<b>Что я умею:</b>\n• Болтать вообще о чем угодно\n• Смотреть на твои фотки и рассказывать что там\n• Говорить на разных языках\n• Кодить и даже багфиксы!\n\nПросто пиши что в голову придет, и погнали общаться! 💬',
    'uz': '🛠️ <b>Buyruqlar va boshqalar:</b>\n\n/settings - Chatni o\'zingizga moslang\n/start - Botni qayta boshlash\n/reset - Chat tarixini tozalash (хotiramni tozalash 😄)\n/language - Tilni almashtirish\n/help - Hozir shuni o\'qiyapsiz! 😆\n\n<b>Modellarni almashtirish:</b>\n/model_lite - Tezroq va yengilroq 🏃‍♂️\n/model_pro - Aqlli + rasmlaringizni ko\'radi 📸\n/model_x - Eng kuchli model\n\n<b>Nima qila olaman:</b>\n• Har qanday narsa haqida gaplashish\n• Rasmlarni ko\'ra olaman \n• Turli tillarda gaplasha olaman\n• Coding va bug fixing!\n\nXohlaganingizni yozing va keling suhbatlashamiz! 💬'
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


  // Notification and status
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
    'en': '⌛ Sorry, an error occurred. Please try again later or contact with us @Farkhodov_2077',
    'ru': '⌛ Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами @Farkhodov_2077',
    'uz': '⌛ Kechirasiz, xatolik yuz berdi. Keyinroq urinib ko\'ring biz bilan bog\'laning @Farkhodov_2077'
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
    'ru': 'Что ты видишь на этом изображении?',
    'uz': 'Bu rasmda nimani ko\'ryapsan?'
  },

  'settingsTitle': {
    'en': '⚙️ Settings',
    'ru': '⚙️ Настройки',
    'uz': '⚙️ Parametrlar'
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
    'uz': '📊 Chat tarixi: {count}'
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