# SorhyAI  
**Персональный ИИ-бот с характером.**  
Работает на базе Cypher Alpha.  

## 📖 Описание проекта
SorhyAI - это персональный ИИ-бот, который предоставляет пользователю возможность взаимодействовать с ИИ в удобной форме. Бот поддерживает множество команд и функций, включая управление пользователями, локализацию и обработку команд. SorhyAI создан для того, чтобы быть вашим личным помощником, который понимает ваши потребности и помогает в повседневных задачах.

### Характеристики:
- **Персонализация**: ИИ адаптируется под ваши предпочтения и стиль общения.
- **Многофункциональность**: Поддержка различных команд и функций.
- **Локализация**: Поддержка нескольких языков для удобства пользователей.
- **Мультимодельность**: Image/Text to Text.

---

## 🐳 Docker Deployment

### Prerequisites
- Docker installed 
- Docker Compose installed

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/FarkhodovIslom/SorhyAI_bot.git
   cd SorhyAI_bot
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file and add your API keys:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   TGBOT_API_KEY=your_telegram_bot_api_key_here
   DEV_ACCESS_KEY=your_developer_access_key_here
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   Or use the convenience script:
   ```bash
   ./docker-start.sh
   ```

### Docker Commands

- **Start in background**: `docker-compose up -d --build`
- **Stop containers**: `docker-compose down`
- **View logs**: `docker-compose logs -f`
- **Rebuild containers**: `docker-compose build --no-cache`

### Environment Variables

Required environment variables:
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `TGBOT_API_KEY` - Your Telegram Bot API key
- `DEV_ACCESS_KEY` - Developer access key

Optional environment variables:
- `MONGODB_URI` - Custom MongoDB connection string
- `MODEL_LITE`, `MODEL_PRO`, `MODEL_X` - Model configurations
- `DEVELOPER_ID` - Developer Telegram ID
- `LOG_LEVEL` - Logging level (default: info)
- `NODE_ENV` - Node environment (default: production)

### Ports
- Application: 3000
- MongoDB: 27017

---

### 📁 Проектная структура

```
SorhyAI_bot/
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── docker-start.sh
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── Procfile
├── start.sh
├── docs/
│   └── command-list-en.txt
├── logs/
│   └── sorhy-log.txt
├── src/
│   ├── index.js
│   ├── bot/
│   │   ├── bot.js
│   │   ├── config/
│   │   │   └── config.js
│   │   ├── handlers/
│   │   │   └── commandHandler.js
│   │   ├── localization/
│   │   │   ├── keys.js
│   │   │   └── localization.js
│   │   ├── prompt/
│   │   │   └── systemPrompt.js
│   │   └── services/
│   │       └── keyboardService.js
│   ├── core/
│   │   ├── database/
│   │   │   └── userManager.js
│   │   └── utils/
│   │       ├── errorHandler.js
│   │       └── logger.js
│   └── server/
│       ├── server.js
│       ├── public/
│       │   ├── assets/
│       │   │   ├── background.png
│       │   │   ├── SorhyAI logo.png
│       │   │   └── SorhyAI_favicon.png
│       │   └── css/
│       │       ├── index.css
│       │       ├── style.css
│       │       └── users.css
│       ├── routes/
│       │   └── admin.routes.js
│       └── views/
│           ├── index.ejs
│           └── users.ejs
```

---
### 📜 Описание файлов
- **.gitignore** - Список файлов и папок, которые не должны попадать в репозиторий.
- **package.json** - Файл с зависимостями и метаданными проекта.
- **README.md** - Документация проекта.
- **docs/** - Папка с документацией, включая список команд.
- **logs/** - Папка для логов бота.
- **src/** - Исходный код бота.
- **src/index.js** - Точка входа в приложение.
- **src/bot/** - Логика бота, включая конфигурацию, обработчики команд, локализацию и сервисы.
  - **bot.js** - Основной файл бота.
  - **config/** - Конфигурационные файлы.
  - **handlers/** - Обработчики команд и событий.
  - **localization/** - Файлы локализации и переводов.
  - **prompt/** - Системные промпты и инструкции.
  - **services/** - Сервисные функции и утилиты.
- **src/core/** - Основные функции, включая управление пользователями и утилиты.
  - **database/** - Управление базой данных пользователей.
  - **utils/** - Вспомогательные утилиты и обработчики ошибок.
- **src/server/** - Серверная часть приложения, включая маршруты и представления.
  - **server.js** - Основной файл сервера.
  - **public/** - Статические файлы веб-интерфейса.
    - **assets/** - Изображения, логотипы и другие ресурсы.
    - **css/** - Стили и оформление веб-интерфейса.
  - **routes/** - Маршруты API и веб-страниц.
  - **views/** - EJS шаблоны для веб-страниц.

**Автор:** Hanzo Dev  
> *"ИИ должен быть твоим, а не корпораций."*
