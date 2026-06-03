# Sorhy AI na steroidax

# ТЗ: Telegram AI Bot Platform v2.0

> **Версия:** 2.0 | **Дата:** Апрель 2026 | **Команда:** 2–3 разработчика
> 

---

## Суть проекта

Многофункциональная AI-платформа на базе Telegram-бота с монетизацией, Mini App, веб-админкой и агентным AI-ядром. Бот работает в личке и группах, умеет вызывать инструменты самостоятельно через нативный tool calling LLM, поддерживает freemium модель с рекламой для бесплатных пользователей и расширенные возможности для платных.

**Позиционирование:** Не просто бот — SaaS-платформа, которую можно развернуть на любую аудиторию.

---

## Архитектура проекта (High Level)

```
┌──────────────────────────────────────────────────────────┐
│                     КЛИЕНТСКИЙ СЛОЙ                      │
│  Telegram Bot  │  Telegram Mini App  │  Web Admin Panel  │
└────────┬───────┴──────────┬──────────┴────────┬──────────┘
         │                  │                   │
┌────────▼──────────────────▼───────────────────▼───────────┐
│                      API GATEWAY                          │
│              Fastify (REST + Webhook + WS)                │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│                    БИЗНЕС-ЛОГИКА                          │
│  AI Engine  │  Billing  │  Moderation  │  Downloader      │
│  Agent Loop │  AdEngine │  Cron        │  Auth/RBAC       │
└──────┬──────┴─────┬─────┴──────┬───────┴───────┬──────────┘
       │            │            │               │
┌──────▼────────────▼────────────▼───────────────▼──────────┐
│                    СЛОЙ ДАННЫХ                            │
│        MongoDB (persistent)  │  Redis (cache/sessions)    │
└───────────────────────────────────────────────────────────┘
```

---

## Технологический стек

| Слой | Технология | Зачем |
| --- | --- | --- |
| Монорепо | Turborepo | Шарим типы, модули, конфиги |
| Bot framework | Grammy + TypeScript (strict) | Стандарт де-факто |
| API сервер | Fastify | Быстрый, типизированный |
| AI | OpenRouter (нативный tool calling) | Мультипровайдер |
| DB | MongoDB + Mongoose | Гибкие схемы |
| Cache/Sessions | Redis | Сессии, rate-limit, очереди |
| Downloader | yt-dlp (CLI wrapper) | Медиа из любых платформ |
| Web Search | Tavily API | Агентный поиск |
| Cron | node-cron | Напоминания, задачи |
| Mini App | Next.js 15 (App Router) | TG WebApp |
| Admin Panel | Next.js 15 (App Router) | Отдельное приложение |
| Billing | Telegram Stars + Stripe | Двойной охват |
| Deploy | Railway (Mono + аддоны) | Redis + Mongo из коробки |
| Валидация ENV | Zod | Падаем на старте, не в рантайме |

---

## 📁 Структура монорепо (Turborepo)

```
apps/
├── bot/                        # Grammy + Fastify (основной бот)
├── web/                        # Mini App (Next.js 15)
└── admin/                      # Веб-админка (Next.js 15)

packages/
├── db/                         # MongoDB схемы + подключение (Mongoose)
├── redis/                      # Redis клиент + утилиты
├── ai/                         # OpenRouter wrapper + agent engine
├── billing/                    # Subscription, plans, payments
├── types/                      # Shared TypeScript типы и интерфейсы
├── config/                     # Zod ENV схемы, константы
└── utils/                      # Общие утилиты (crypto, time, etc.)

turbo.json
package.json
.env.example
```

---

## 📦 Детальная структура `apps/bot`

```
apps/bot/src/
├── server.ts                   # Fastify entry point
├── bot/
│   ├── index.ts                # Bot init, webhook setup, middleware chain
│   ├── middleware/
│   │   ├── session.ts          # Grammy sessions → Redis
│   │   ├── rateLimit.ts        # Anti-spam (free: 10 req/min, pro: 60 req/min)
│   │   ├── auth.ts             # isAdmin, isSuperAdmin, isPro
│   │   ├── planGate.ts         # Feature gates по плану
│   │   └── logger.ts           # Structured logging
│   ├── handlers/
│   │   ├── commands/
│   │   │   ├── start.ts
│   │   │   ├── help.ts
│   │   │   ├── settings.ts
│   │   │   ├── admin.ts        # /ban /kick /warn /mute /unmute
│   │   │   ├── ask.ts          # /ask — явный AI запрос в группе
│   │   │   ├── agent.ts        # /agent — явный запуск агента
│   │   │   ├── roleplay.ts     # /roleplay start|stop|status
│   │   │   ├── remind.ts       # /remind — создание напоминаний
│   │   │   └── download.ts     # /download — явная загрузка по URL
│   │   ├── chat/
│   │   │   ├── private.ts      # AI в личке (всегда отвечает)
│   │   │   └── group.ts        # AI в группе (@mention / reply / /ask)
│   │   ├── callbacks/
│   │   │   ├── menu.ts         # Главное меню
│   │   │   ├── settings.ts     # Настройки пользователя
│   │   │   ├── billing.ts      # Подписка, оплата
│   │   │   └── admin.ts        # Групповые настройки
│   │   └── media/
│   │       └── download.ts     # Автоопределение URL в сообщении
│   └── keyboards/
│       ├── main.ts
│       ├── settings.ts
│       ├── billing.ts
│       └── admin.ts
└── modules/                    # Импортируется из packages/
```

---

## 🧠 AI Engine (packages/ai)

### Концепция

Агент работает через **нативный tool calling** LLM. Не самописный intent classifier — сам LLM решает, какой инструмент вызвать. Мы регистрируем tools в формате провайдера (OpenAI-совместимый) и передаём их в запрос.

### Agent Loop

```
Входящее сообщение
       │
       ▼
  Сборка контекста
  (история из MongoDB + системный промпт + user plan)
       │
       ▼
  LLM запрос с tool_definitions
       │
       ▼
  stop_reason === "tool_use"?
  ├── ДА → Execute tool → Append tool_result → повторить LLM запрос
  └── НЕТ → Финальный ответ пользователю
```

### Tool Definitions

Каждый инструмент — отдельный файл с интерфейсом:

```tsx
interface Tool {
  definition: OpenRouterToolDefinition;  // JSON Schema описание для LLM
  execute: (params: unknown) => Promise<string>;  // Выполнение
}
```

| Tool | Файл | Описание |
| --- | --- | --- |
| web_search | tools/search.ts | Tavily API поиск |
| get_weather | tools/weather.ts | Погода по городу |
| run_code | tools/code.ts | Выполнение кода (sandbox) |
| calculate | tools/calc.ts | Математика без галлюцинаций |
| download_media | tools/download.ts | Вызов yt-dlp |
| get_datetime | tools/datetime.ts | Текущие дата/время |

### Memory (История чатов)

- Хранится в MongoDB (`Conversation` модель)
- Для личных чатов: `userId` → последние N сообщений
- Для групп: `groupId + threadId` → контекст ветки
- Ограничение контекста: free — 20 сообщений, pro — 100 сообщений
- Сброс: команда `/clear`

### Roleplay режим

```tsx
interface RoleplaySession {
  userId: string;
  systemPrompt: string;       // Кастомный персонаж
  characterName: string;
  active: boolean;
  createdAt: Date;
}
```

- Хранится в Redis (сессия) и MongoDB (персистентно для про)
- `/roleplay start <описание персонажа>`
- `/roleplay stop`
- `/roleplay status` — текущий персонаж

### Выбор модели (Pro фича)

```tsx
const AVAILABLE_MODELS = {
  free: ['google/gemini-flash-3'],           // Дешёвая быстрая модель
  pro: [
    'anthropic/claude-sonnet-4-5',
    'openai/gpt-4o',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-70b-instruct',
  ]
}
```

### BYOK (Bring Your Own Key)

- Юзер вводит свой API ключ через Mini App или команду
- Ключ **шифруется AES-256-GCM** перед сохранением в MongoDB
- При запросе: расшифровываем → используем → не логируем
- BYOK доступен только для Pro юзеров
- При BYOK запросы идут напрямую к провайдеру, не через OpenRouter

---

## 💰 Монетизация

### Планы

| Фича | Free | Pro |
| --- | --- | --- |
| AI чат | ✅ (20 сообщ/день) | ✅ (безлимит) |
| Выбор модели | ❌ (только базовая) | ✅ (GPT-4o, Claude, etc.) |
| Агентные задачи | ❌ | ✅ |
| Cron / напоминания | ❌ | ✅ |
| История чата | 20 сообщ | 100 сообщ |
| Downloader | 5/день | Безлимит |
| BYOK | ❌ | ✅ |
| Реклама | ✅ (показывается) | ❌ |
| Roleplay | Базовый | Расширенный + persist |
| Приоритет очереди | Обычный | High priority |

### Цены (примерные, настраиваются в админке)

- Pro Monthly: $5 / месяц
- Pro Annual: $40 / год

### Платёжные системы

**Telegram Stars (в боте):**

- Нативный Telegram API: `sendInvoice` + `PreCheckoutQuery` + `SuccessfulPayment`
- Telegram берёт 30% — учитываем в ценообразовании
- Мгновенная активация после `SuccessfulPayment`

**Stripe (веб + Mini App):**

- Stripe Checkout для разовых платежей
- Stripe Subscriptions для recurring
- Webhook `/stripe/webhook` для подтверждения платежей
- При успехе — обновляем `User.plan` в MongoDB

**Payme / Click (для UZ рынка):**

- REST API интеграция
- Callback endpoint для подтверждения

### Subscription модель в БД

```tsx
interface UserSubscription {
  plan: 'free' | 'pro';
  billingProvider: 'telegram_stars' | 'stripe' | 'payme' | 'click';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd: boolean;
}
```

---

## 📢 Рекламная система

### Концепция

Рекламодатель → регистрируется в веб-админке → создаёт рекламную кампанию → указывает бюджет и таргетинг → реклама показывается бесплатным юзерам в боте и Mini App.

### Схема работы

```
Рекламодатель создаёт кампанию
       │
       ▼
  AdCampaign { budget, targetLang, targetGroups, message, imageUrl }
       │
       ▼
  Impression Engine — решает когда показать рекламу юзеру:
  - После каждых N AI-ответов (настраивается, дефолт: 5)
  - Только free-пользователям
  - С учётом таргетинга
       │
       ▼
  Показ рекламы в чате (InlineKeyboard с меткой "Реклама")
       │
       ▼
  Логируем AdImpression + AdClick в MongoDB
```

### Модели

```tsx
// AdCampaign
interface AdCampaign {
  advertiserId: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;           // в USD
  spent: number;
  cpm: number;              // стоимость за 1000 показов
  targeting: {
    languages?: string[];
    groupTypes?: string[];
  };
  creative: {
    text: string;
    imageUrl?: string;
    buttonText: string;
    buttonUrl: string;
  };
  startDate: Date;
  endDate: Date;
}

// AdImpression
interface AdImpression {
  campaignId: string;
  userId: string;
  chatId: string;
  shownAt: Date;
  clicked: boolean;
  clickedAt?: Date;
}
```

### Рекламодательский кабинет (в веб-админке)

- Регистрация рекламодателя
- Создание и управление кампаниями
- Загрузка креативов
- Статистика: показы, клики, CTR, потраченный бюджет
- Пополнение баланса через Stripe

---

## 👥 Разделение зон ответственности

> **Правило:** один модуль — один владелец. Нет "общих файлов" без явного согласования.
> 

### Dev 1 — Core & Infra

**Владеет:** `apps/bot/src/server.ts`, `apps/bot/src/bot/index.ts`, `packages/db`, `packages/redis`, `packages/config`, деплой Railway, CI/CD.

**Задачи:** Фазы 0, 1, 3 (кроме ai-mod.ts), 8.

### Dev 2 — AI Engineer

**Владеет:** `packages/ai/`, `apps/bot/src/handlers/chat/`, `apps/bot/src/modules/moderation/ai-mod.ts`.

**Задачи:** Фазы 2, 4.

### Dev 3 — Features & Frontend

**Владеет:** `apps/web/` (Mini App), `apps/admin/` (Admin Panel), `apps/bot/src/modules/downloader/`, `apps/bot/src/modules/cron/`, биллинг интеграции.

**Задачи:** Фазы 5, 6, 7, 9, 10.

---

## 📊 Схемы MongoDB

### User

```tsx
const UserSchema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  language: { type: String, default: 'ru' },

  subscription: {
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    status: { type: String, enum: ['active', 'canceled', 'past_due'], default: 'active' },
    billingProvider: String,
    currentPeriodEnd: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },

  settings: {
    aiModel: { type: String, default: 'google/gemini-flash-1.5' },
    responseStyle: { type: String, enum: ['default', 'concise', 'detailed'], default: 'default' },
    language: { type: String, default: 'ru' },
  },

  byok: [{
    provider: String,                  // 'openai' | 'anthropic' | 'google'
    encryptedKey: String,              // AES-256-GCM зашифрованный ключ
    iv: String,                        // Initialization vector
    isActive: Boolean,
  }],

  usage: {
    dailyMessages: { type: Number, default: 0 },
    dailyDownloads: { type: Number, default: 0 },
    lastResetAt: Date,
  },

  warns: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: 0 },

  adStats: {
    impressionsCount: { type: Number, default: 0 },
    lastAdShownAt: Date,
  },

  createdAt: { type: Date, default: Date.now },
});
```

### Group

```tsx
const GroupSchema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  title: String,

  settings: {
    aiEnabled: { type: Boolean, default: true },
    aiTrigger: { type: String, enum: ['mention', 'reply', 'always'], default: 'mention' },
    language: { type: String, default: 'ru' },
    welcomeMessage: String,
    aiSystemPrompt: String,            // Кастомный системный промпт для группы
  },

  moderation: {
    automodEnabled: { type: Boolean, default: false },
    aiModEnabled: { type: Boolean, default: false },
    bannedWords: [String],
    warnThreshold: { type: Number, default: 3 },   // Варнов до бана
    spamProtection: { type: Boolean, default: true },
  },

  admins: [String],                    // telegramId администраторов

  adSettings: {
    adsEnabled: { type: Boolean, default: true },
    adFrequency: { type: Number, default: 5 },     // Каждые N AI ответов
  },

  createdAt: { type: Date, default: Date.now },
});
```

### Conversation

```tsx
const ConversationSchema = new Schema({
  userId: { type: String, required: true },
  chatId: { type: String, required: true },          // userId для лички, groupId для группы

  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'tool'] },
    content: Schema.Types.Mixed,                      // string | ToolUseBlock[]
    toolName: String,                                 // для role === 'tool'
    toolCallId: String,
    createdAt: { type: Date, default: Date.now },
  }],

  roleplay: {
    active: { type: Boolean, default: false },
    systemPrompt: String,
    characterName: String,
  },

  updatedAt: { type: Date, default: Date.now },
});

// Индекс для быстрого доступа
ConversationSchema.index({ userId: 1, chatId: 1 });
```

### CronTask

```tsx
const CronTaskSchema = new Schema({
  userId: { type: String, required: true },
  chatId: { type: String, required: true },

  type: { type: String, enum: ['once', 'recurring'] },
  expression: String,                                // cron expression (для recurring)
  executeAt: Date,                                   // для one-time

  message: { type: String, required: true },
  timezone: { type: String, default: 'Asia/Tashkent' },

  status: { type: String, enum: ['active', 'paused', 'completed', 'failed'], default: 'active' },
  executedCount: { type: Number, default: 0 },
  lastExecutedAt: Date,
  nextExecuteAt: Date,

  createdAt: { type: Date, default: Date.now },
});
```

### AdCampaign и AdImpression

(Описаны выше в разделе Рекламная система)

### ModerationLog

```tsx
const ModerationLogSchema = new Schema({
  groupId: String,
  targetUserId: String,
  moderatorId: String,                               // userId модератора или 'bot' для автомода
  action: { type: String, enum: ['warn', 'mute', 'kick', 'ban', 'unban', 'unmute'] },
  reason: String,
  expiresAt: Date,                                   // для mute
  createdAt: { type: Date, default: Date.now },
});
```

---

## 🔐 Feature Gate Middleware

Единая точка контроля доступа. Не разбрасываем проверки по всему коду.

```tsx
// packages/billing/src/gates.ts

export const PLAN_FEATURES = {
  aiChat: { free: true, pro: true },
  agentTasks: { free: false, pro: true },
  modelSelection: { free: false, pro: true },
  cronTasks: { free: false, pro: true },
  byok: { free: false, pro: true },
  highPriorityQueue: { free: false, pro: true },
  extendedHistory: { free: false, pro: true },
  roleplayPersist: { free: false, pro: true },
  adsShown: { free: true, pro: false },
};

export function requirePlan(feature: keyof typeof PLAN_FEATURES) {
  return async (ctx: BotContext, next: NextFunction) => {
    const user = ctx.user; // загружается в middleware
    const plan = user.subscription.plan;

    if (!PLAN_FEATURES[feature][plan]) {
      await ctx.reply(UPGRADE_MESSAGE, { reply_markup: upgradeKeyboard() });
      return;
    }

    return next();
  };
}
```

---

## 🚦 Rate Limiting

```tsx
// Redis-based rate limiting

const RATE_LIMITS = {
  free: {
    messages: { limit: 10, windowMs: 60_000 },      // 10 сообщ/мин
    downloads: { limit: 5, windowMs: 86_400_000 },  // 5 загрузок/день
    dailyAi: { limit: 20, windowMs: 86_400_000 },   // 20 AI запросов/день
  },
  pro: {
    messages: { limit: 60, windowMs: 60_000 },
    downloads: { limit: 999, windowMs: 86_400_000 },
    dailyAi: { limit: 999, windowMs: 86_400_000 },
  },
};
```

---

## 📱 Mini App (apps/web)

Next.js 15 приложение, доступное через TG WebApp API.

### Страницы и функционал

```
/                   # Главная — AI чат интерфейс
/chat               # Чат с историей (аналог личной переписки с ботом)
/agent              # Агентный режим с прогрессом выполнения
/settings           # Настройки пользователя
  /settings/model   # Выбор AI модели (Pro)
  /settings/byok    # Ввод своих API ключей (Pro)
  /settings/style   # Стиль ответов
/billing            # Подписка и оплата
  /billing/plans    # Сравнение планов
  /billing/payment  # Оплата через Stripe
/history            # История диалогов
/reminders          # Управление напоминаниями (Pro)
/download           # Загрузчик медиа
```

### Технические особенности Mini App

```tsx
// Инициализация Telegram WebApp SDK
import WebApp from '@twa-dev/sdk';

useEffect(() => {
  WebApp.ready();
  WebApp.expand();
  // Получаем initData для аутентификации
  const initData = WebApp.initData;
  // Верифицируем на бэке через HMAC-SHA256
}, []);
```

### Аутентификация Mini App → Backend

1. Mini App получает `initData` от Telegram
2. Отправляет на `/api/auth/telegram`
3. Backend верифицирует HMAC-SHA256 подпись с `BOT_TOKEN`
4. Возвращает JWT токен для дальнейших запросов

---

## 🖥 Веб-Админка (apps/admin)

Отдельное Next.js приложение для владельцев бота и рекламодателей.

### Роли

| Роль | Доступ |
| --- | --- |
| SuperAdmin | Всё |
| Moderator | Юзеры, группы, логи модерации |
| Advertiser | Только рекламный кабинет |

### Разделы

```
/dashboard          # Общая статистика (DAU, MAU, Revenue, AI tokens)
/users              # Управление пользователями
  /users/[id]       # Профиль юзера, изменение плана, варны
/groups             # Управление группами
/moderation         # Логи модерации, репорты
/billing            # Финансы
  /billing/revenue  # График доходов
  /billing/subs     # Активные подписки
/ads                # Рекламный кабинет
  /ads/campaigns    # Список кампаний
  /ads/[id]         # Статистика кампании
  /ads/create       # Создание кампании
/settings           # Системные настройки
  /settings/plans   # Цены планов
  /settings/models  # Доступные AI модели
  /settings/limits  # Лимиты для планов
```

### Аутентификация Admin Panel

- NextAuth v5 с Credentials Provider
- SuperAdmin создаётся через ENV переменную при первом запуске
- JWT с ролью в payload
- Все API роуты защищены middleware проверкой роли

---

## ⬇️ Downloader Module

### Архитектура

```
URL в сообщении
      │
      ▼
platforms.ts — определяем платформу
(YouTube / Instagram / TikTok / Twitter / VK / SoundCloud)
      │
      ▼
queue.ts — добавляем в Redis очередь
(Pro пользователи — high_priority queue)
      │
      ▼
ytdlp.ts — spawn yt-dlp с параметрами
      │
  ┌───┴───┐
Видео   Аудио   (выбор через inline кнопки)
  └───┬───┘
      │
      ▼
Валидация размера < 50MB
      │
      ▼
Telegram sendVideo / sendAudio
      │
      ▼
finally: удаляем temp файл
```

### Ключевые правила

```tsx
// ytdlp.ts
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB строго

const args = [
  url,
  '--max-filesize', '50m',          // Лимит размера
  '--no-playlist',                   // Только одно видео
  '-o', tempFilePath,                // Явный путь
  '--socket-timeout', '30',          // Таймаут
];

// Всегда в finally!
try {
  await spawn('yt-dlp', args);
  await bot.api.sendVideo(chatId, new InputFile(tempFilePath));
} finally {
  await fs.unlink(tempFilePath).catch(() => {}); // Удаляем всегда
}
```

### Redis Queue

```tsx
// Две очереди: обычная и high priority
const QUEUES = {
  normal: 'download:queue:normal',
  priority: 'download:queue:priority',
};

// Concurrency: не более 3 параллельных загрузок
const MAX_CONCURRENT = 3;
```

---

## ⏰ Cron Module

### Команды

```
/remind 30m сделать PR
/remind 2h позвонить клиенту
/remind daily 09:00 стендап
/remind weekly mon 10:00 ревью кода
/tasks — список активных напоминаний
/tasks cancel <id> — отменить напоминание
```

### Парсер времени

```tsx
// Примеры входных форматов
'30m'           → executeAt: now + 30 minutes
'2h'            → executeAt: now + 2 hours
'1d'            → executeAt: now + 1 day
'daily 09:00'   → expression: '0 9 * * *'
'weekly mon 10' → expression: '0 10 * * 1'
```

### Инициализация

При старте бота — загружаем все активные CronTask из MongoDB и регистрируем в node-cron. При создании новой задачи — добавляем в БД и сразу регистрируем.

---

## 🛡 Модерация

### Команды (только для admin группы)

```
/warn @user [причина]      — предупреждение (+1 варн)
/warns @user               — посмотреть варны юзера
/mute @user [время]        — замутить (дефолт: 1 час)
/unmute @user              — размутить
/kick @user                — выгнать из группы
/ban @user [причина]       — забанить
/unban @user               — разбанить
```

### Автомод (правила группы)

- Список запрещённых слов (настраивается в меню)
- Анти-спам: > 5 сообщений за 10 секунд → предупреждение
- Анти-флуд: одинаковые сообщения подряд → удаление

### AI-модератор (Pro группы)

```tsx
// ai-mod.ts
// Асинхронный анализ — не блокирует основной поток

async function analyzeMessage(message: string, groupSettings: GroupSettings) {
  if (!groupSettings.moderation.aiModEnabled) return;

  const result = await aiClient.analyze({
    prompt: TOXICITY_DETECTION_PROMPT,
    message,
  });

  if (result.isToxic && result.confidence > 0.85) {
    await moderationActions.warn(userId, groupId, 'AI: ' + result.reason);
  }
}
```

---

## 🔄 Webhook и Async архитектура

### Критически важно

Telegram ждёт `200 OK` в течение **5 секунд**. Любая долгая операция (AI, загрузка, агент) должна выполняться **в фоне**.

```tsx
// server.ts
fastify.post('/webhook', async (req, reply) => {
  reply.code(200).send('ok');              // Мгновенный ответ Telegram

  // Фоновая обработка — НЕ await здесь
  processUpdate(req.body).catch(err => {
    logger.error('Update processing failed', err);
  });
});
```

### Статусы "печатает"

```tsx
// Пока AI думает — показываем "typing..."
await bot.api.sendChatAction(ctx.chat.id, 'typing');
// Для длинных задач — повторяем каждые 4 сек
const typingInterval = setInterval(() => {
  bot.api.sendChatAction(ctx.chat.id, 'typing').catch(() => {});
}, 4000);
try {
  const result = await longOperation();
  await ctx.reply(result);
} finally {
  clearInterval(typingInterval);
}
```

---

## 🗺 Дорожная карта по фазам

### Фаза 0 — Foundation (Dev 1) `~2-3 часа`

- [ ]  Turborepo монорепо: инициализация, workspace конфиги
- [ ]  `packages/config` — Zod схема для всех ENV переменных
- [ ]  `packages/db` — MongoDB подключение + все схемы
- [ ]  `packages/redis` — Redis клиент + утилиты
- [ ]  `apps/bot/src/server.ts` — Fastify + webhook endpoint
- [ ]  Grammy sessions через Redis (`@grammyjs/storage-redis`)
- [ ]  Middleware chain: session → logger → rateLimit → auth → planGate
- [ ]  Деплой на Railway (bot app + Redis addon + Mongo addon)
- [ ]  Health check endpoint `/health`
- [ ]  `/start` — базовый текст

**✅ Результат:** Бот живёт на Railway, принимает апдейты, сессии в Redis, данные в Mongo.

---

### Фаза 1 — UI & Navigation (Dev 1) `~2 часа`

- [ ]  Главное inline-меню (`keyboards/main.ts`)
- [ ]  `/start` — красивое приветствие + меню
- [ ]  `/help` — список команд с форматированием
- [ ]  Настройки пользователя (язык, стиль ответов)
- [ ]  Коллбеки навигации

**✅ Результат:** Бот выглядит как продукт.

---

### Фаза 2 — AI Core (Dev 2) `~3-4 часа`

- [ ]  `packages/ai/src/client.ts` — OpenRouter wrapper с retry (exponential backoff)
- [ ]  `packages/ai/src/memory.ts` — история в MongoDB
- [ ]  `packages/ai/src/tools/` — все tool definitions
- [ ]  Agent Loop с нативным tool calling
- [ ]  `handlers/chat/private.ts` — AI в личке
- [ ]  `handlers/chat/group.ts` — AI по @mention/reply/ask
- [ ]  `/clear` — сброс истории
- [ ]  Roleplay базовый
- [ ]  Показ "typing..." во время генерации

**✅ Результат:** Полноценный AI собеседник с памятью и инструментами.

---

### Фаза 3 — Moderation (Dev 1 + Dev 2) `~2-3 часа`

- [ ]  **Dev 1:** `/ban`, `/kick`, `/warn`, `/mute`, `/unmute`, `/warns`
- [ ]  **Dev 1:** Логирование в `ModerationLog`
- [ ]  **Dev 1:** Автомод по словам и анти-спам
- [ ]  **Dev 1:** Настройки модерации в меню группы
- [ ]  **Dev 2:** `ai-mod.ts` — асинхронный AI анализ токсичности

**✅ Результат:** Бот полноценно управляет группой.

---

### Фаза 4 — Billing & Feature Gates (Dev 3) `~3 часа`

- [ ]  `packages/billing/` — subscription логика, plan checks
- [ ]  Feature gate middleware (`requirePlan()`)
- [ ]  Telegram Stars интеграция (`sendInvoice` flow)
- [ ]  Stripe интеграция (Checkout + webhook)
- [ ]  Callback кнопки "Upgrade to Pro" с меню планов
- [ ]  Автоматическая активация/деактивация по вебхукам

**✅ Результат:** Работает монетизация, фичи режутся по плану.

---

### Фаза 5 — Downloader (Dev 3) `~3 часа`

- [ ]  `ytdlp.ts` — spawn wrapper с лимитом 50MB и finally cleanup
- [ ]  `platforms.ts` — определение платформы по URL regex
- [ ]  `queue.ts` — Redis очередь с приоритетами
- [ ]  Inline кнопки: видео / аудио / отмена
- [ ]  Поддержка: YouTube, Instagram, TikTok, Twitter/X, VK, SoundCloud

**✅ Результат:** Кидаешь ссылку — получаешь файл.

---

### Фаза 6 — Pro Features (Dev 2) `~2 часа`

- [ ]  Выбор AI модели для Pro юзеров
- [ ]  BYOK — ввод, шифрование, использование своих ключей
- [ ]  Расширенная история (100 сообщений)
- [ ]  Roleplay с персистентностью (Pro)
- [ ]  High priority в очереди загрузок

**✅ Результат:** Pro план реально отличается от Free.

---

### Фаза 7 — Cron & Reminders (Dev 3) `~2 часа`

- [ ]  `scheduler.ts` — node-cron менеджер
- [ ]  Парсер времени для `/remind`
- [ ]  `/tasks` — CRUD напоминаний
- [ ]  Восстановление активных тасок при старте
- [ ]  Timezone поддержка

**✅ Результат:** Бот помнит за тебя (только Pro).

---

### Фаза 8 — Mini App (Dev 3) `~4-5 часов`

- [ ]  Next.js 15 проект в `apps/web/`
- [ ]  TG WebApp SDK интеграция + аутентификация через initData
- [ ]  AI чат интерфейс (страница `/chat`)
- [ ]  Настройки пользователя (`/settings`)
- [ ]  Billing страница (`/billing`) — выбор плана, Stripe Checkout
- [ ]  BYOK форма для Pro (`/settings/byok`)
- [ ]  История диалогов (`/history`)
- [ ]  Downloader страница (`/download`)

**✅ Результат:** Полноценный веб-интерфейс внутри Telegram.

---

### Фаза 9 — Admin Panel (Dev 3) `~4-5 часов`

- [ ]  Next.js 15 проект в `apps/admin/`
- [ ]  NextAuth v5 с ролями
- [ ]  Dashboard со статистикой
- [ ]  Управление пользователями (просмотр, план, бан)
- [ ]  Управление группами
- [ ]  Рекламный кабинет (создание кампаний, статистика)
- [ ]  Финансовый раздел (доходы, подписки)
- [ ]  Системные настройки (лимиты, цены, модели)

**✅ Результат:** Полный контроль над платформой.

---

### Фаза 10 — Ad Engine (Dev 2) `~2 часа`

- [ ]  `AdCampaign` и `AdImpression` модели
- [ ]  Impression Engine — решает когда показать рекламу
- [ ]  Показ рекламы через InlineKeyboard с меткой
- [ ]  Трекинг кликов
- [ ]  Интеграция с балансом рекламодателя

**✅ Результат:** Монетизация через рекламу работает.

---

### Фаза 11 — Polish & Production (Dev 1) `~2 часа`

- [ ]  Graceful shutdown (завершаем активные задачи)
- [ ]  Webhook secret token
- [ ]  Error handling — красивые сообщения юзеру + структурированные логи
- [ ]  README с полным описанием
- [ ]  Zod валидация всех ENV на старте (уже в Фазе 0, финальная проверка)
- [ ]  Load testing базовых сценариев

**✅ Результат:** Продакшн-готовая платформа.

---

## 🌐 ENV переменные

```
# Bot
BOT_TOKEN=
WEBHOOK_URL=https://your-app.railway.app
WEBHOOK_SECRET=                         # random string для верификации

# AI
OPENROUTER_API_KEY=

# Database
MONGODB_URI=
REDIS_URL=

# Search
TAVILY_API_KEY=

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TELEGRAM_STARS_ENABLED=true

# Payments UZ
PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=

# Encryption (BYOK keys)
ENCRYPTION_KEY=                         # 32-byte hex для AES-256

# Admin
ADMIN_JWT_SECRET=
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=

# Server
PORT=3000
NODE_ENV=production
```

---

## 🔀 Git Workflow

1. Никто не пушит в `main` напрямую — руки оторву.
2. Ветки: `feature/yt-downloader`, `bugfix/ai-loop-timeout`, `feat/billing-stripe`.
3. Все изменения через Pull Requests.
4. Approve хотя бы от одного другого участника.
5. Squash merge в `main`.

### Ветки по фазам

```
main
├── dev/core          # Dev 1 (infra, moderation)
├── dev/ai            # Dev 2 (AI engine, agents)
└── dev/features      # Dev 3 (frontend, downloader, billing)
```

Мёрджим в `main` только после завершения фазы и ревью.

---

## ⚠️ Жёсткие архитектурные правила

1. **Async хуки:** Fastify отвечает `200 OK` инстантно. Вся логика — в фоне.
2. **OOM защита:** `yt-dlp` только с `-max-filesize 50m` и `finally { unlink }`.
3. **Хранение:** Сессии Grammy → **Redis**. История AI, подписки, логи → **MongoDB**.
4. **Шифрование:** BYOK ключи только AES-256-GCM, никогда в открытом виде.
5. **Feature gates:** Только через `requirePlan()` middleware, не `if (user.plan === 'pro')` вручную по коду.
6. **Один владелец файла:** Конфликты в гите = архитектурная ошибка. Спорные файлы делятся на интерфейс + реализацию.
7. **Типы только из packages/types:** Не дублируем интерфейсы в каждом приложении.
8. **Retry для внешних API:** OpenRouter, Stripe, Tavily — exponential backoff, min 3 попытки.

---

*Документ актуален на момент написания. Обновляется при изменении архитектурных решений.*

---

# 📜 ТЗ: Telegram AI Bot Platform v2.1

> **Версия:** 2.1 | **Дата:** Апрель 2026 | **Изменения от v2.0:** Токены, Рефералка, Голос, Файлы, AI Персонажи
> 

---

## 🆕 Что изменилось в v2.1

| Фича | Статус |
| --- | --- |
| Система кредитов (токены) | ✅ Заменяет лимиты по сообщениям |
| Реферальная программа | ✅ Новый модуль |
| Голосовые сообщения ↔ AI | ✅ Новый модуль |
| Работа с файлами + генерация | ✅ Новый модуль |
| Публичные AI персонажи | ✅ Только в Mini App |
| Групповая подписка | ⏳ Future |

---

## 💎 Система кредитов (Credits)

### Концепция

Заменяем тупые лимиты "20 сообщений/день" на кредитную систему. Психологически работает лучше, гибче монетизируется, позволяет продавать пополнения без подписки.

### Начисление

| Событие | Кредиты |
| --- | --- |
| Регистрация (welcome bonus) | +200 |
| Ежедневный бонус (free) | +50 |
| Ежедневный бонус (pro) | +500 |
| Реферал привёл друга | +100 |
| Друг купил Pro | +300 |
| 7-дневный streak | +150 |
| 30-дневный streak | +500 |

### Стоимость операций

| Операция | Кредиты | Комментарий |
| --- | --- | --- |
| Обычный AI чат | 5 | Базовый запрос |
| AI чат с историей (>10 сообщ) | 8 | Длинный контекст дороже |
| Агентная задача (один тул вызов) | 15 | Каждый tool_use = +15 |
| Веб-поиск (Tavily) | 10 | За один поиск |
| Анализ файла (PDF/Word/Excel) | 20 | За файл |
| Генерация документа | 25 | PDF/Word/Excel |
| Голосовой ввод (STT) | 10 | За голосовое |
| Голосовой ответ (TTS) | 20 | За синтез речи |
| Скачивание медиа | 15 | За загрузку |
| Генерация изображения | 30 | За картинку |
| Pro модель (GPT-4o, Claude) | +10 доп. | Наценка к базовой стоимости |

### Пополнение (Pay-as-you-go)

| Пакет | Кредиты | Цена |
| --- | --- | --- |
| Starter | 500 | $1 |
| Basic | 1,500 | $2.5 |
| Standard | 4,000 | $5 |
| Pro Pack | 10,000 | $10 |

> Pro подписка = ежедневное начисление + скидка 20% на все операции + доступ к Pro фичам. Pay-as-you-go доступен всем.
> 

### Схема MongoDB

```tsx
const UserSchema = {
  // ... остальные поля
  credits: {
    balance: { type: Number, default: 200 },       // Текущий баланс
    totalEarned: { type: Number, default: 200 },   // За всё время
    totalSpent: { type: Number, default: 0 },
    streak: {
      current: { type: Number, default: 0 },       // Текущий стрик (дней)
      longest: { type: Number, default: 0 },
      lastClaimedAt: Date,
    },
  },
}

// CreditTransaction — лог всех операций
const CreditTransactionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['earn', 'spend', 'purchase', 'refund', 'bonus'],
  },
  amount: Number,                                  // + начисление, - списание
  reason: String,                                  // 'ai_chat', 'agent_task', 'referral', etc.
  balanceAfter: Number,
  metadata: Schema.Types.Mixed,                    // chatId, operationType и т.д.
  createdAt: { type: Date, default: Date.now },
});
```

### Credit Middleware

```tsx
// Единая точка списания — не разбрасывать по коду
export async function spendCredits(
  userId: string,
  cost: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; balance: number }> {
  const user = await User.findOne({ telegramId: userId });

  // Pro скидка 20%
  const finalCost = user.subscription.plan === 'pro'
    ? Math.floor(cost * 0.8)
    : cost;

  if (user.credits.balance < finalCost) {
    return { success: false, balance: user.credits.balance };
  }

  user.credits.balance -= finalCost;
  user.credits.totalSpent += finalCost;
  await user.save();

  await CreditTransaction.create({
    userId, type: 'spend', amount: -finalCost,
    reason, balanceAfter: user.credits.balance, metadata,
  });

  return { success: true, balance: user.credits.balance };
}
```

### UX при нехватке кредитов

```
❌ Недостаточно кредитов для этой операции.
   Нужно: 15 | У тебя: 8

   [🎁 Ежедневный бонус (+50)]  [💳 Купить кредиты]
   [👥 Пригласить друга (+100)] [⭐ Оформить Pro]
```

---

## 👥 Реферальная программа

### Механика

```
Юзер A получает реферальную ссылку:
t.me/bot?start=ref_<userId>

Юзер B переходит по ссылке → /start → регистрируется
       │
       ▼
  Юзер A получает +100 кредитов
  Юзер B получает +100 кредитов (welcome bonus удваивается)
       │
       ▼
  Если Юзер B покупает Pro:
  Юзер A получает +300 кредитов (реферальный бонус)
```

### Команды

```
/ref — показать свою реферальную ссылку + статистика
/ref stats — сколько привёл, сколько заработал
```

### Схема MongoDB

```tsx
const ReferralSchema = new Schema({
  referrerId: { type: String, required: true },    // Кто пригласил
  refereeId: { type: String, required: true },     // Кого пригласили
  status: {
    type: String,
    enum: ['registered', 'converted'],             // converted = купил Pro
    default: 'registered',
  },
  creditsAwarded: { type: Number, default: 0 },    // Сколько начислено рефереру
  createdAt: { type: Date, default: Date.now },
  convertedAt: Date,
});

// В User модели добавляем:
referral: {
  code: String,                                    // Уникальный реф код (= userId base64)
  referredBy: String,                              // telegramId кто пригласил
  totalReferrals: { type: Number, default: 0 },
  totalCreditsEarned: { type: Number, default: 0 },
}
```

### Защита от фрода

- Один IP не может зарегистрировать более 3 аккаунтов (Redis IP tracking)
- Реф бонус начисляется только после первого AI запроса (не просто /start)
- Конверсионный бонус — только после первого успешного платежа через вебхук

### UI в Mini App

Отдельная страница `/referral`:

- Реф ссылка с кнопкой "Поделиться" (TG Share)
- Количество приглашённых
- Кредиты заработанные с рефералов
- Список рефералов с статусами

---

## 🎤 Голосовые сообщения ↔ AI

### Flow

```
Юзер отправляет голосовое (voice/video_note)
       │
       ▼
  bot.on('voice') / bot.on('video_note')
       │
       ▼
  Скачиваем OGG через Telegram API
       │
       ▼
  STT: OpenAI Whisper API
  (транскрибируем в текст)
       │
       ▼
  Передаём текст в AI pipeline (обычный chat flow)
       │
       ▼
  Получаем текстовый ответ от LLM
       │
  ┌────┴────┐
Free      Pro
  │         │
Текст    TTS синтез
  │     (ElevenLabs или OpenAI TTS — выбор юзера)
  │         │
  └────┬────┘
       ▼
  Отправляем ответ
```

### Стоимость в кредитах

- Голосовой ввод (STT): **10 кредитов**
- Голосовой ответ TTS (только Pro): **20 кредитов** дополнительно
- Итого голосовой диалог для Pro: **35 кредитов** за обмен (10 STT + 5 базовый AI + 20 TTS)

### TTS провайдеры

```tsx
// settings/voice.ts
export const TTS_PROVIDERS = {
  openai: {
    name: 'OpenAI TTS',
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    pricePerChar: 0.000015,
  },
  elevenlabs: {
    name: 'ElevenLabs',
    voices: [],                                    // Загружаем динамически из API
    pricePerChar: 0.00003,
  },
} as const;

// В UserSettings
voiceSettings: {
  ttsProvider: { type: String, enum: ['openai', 'elevenlabs'], default: 'openai' },
  ttsVoice: String,
  sttEnabled: { type: Boolean, default: true },
  ttsEnabled: { type: Boolean, default: false },   // По умолчанию — текстовый ответ
}
```

### Файловая структура

```
packages/ai/src/voice/
├── stt.ts           # Speech-to-Text (Whisper)
├── tts.ts           # Text-to-Speech (OpenAI + ElevenLabs)
└── index.ts         # Unified voice interface

apps/bot/src/handlers/
└── voice.ts         # Grammy voice/video_note handler
```

### Реализация STT

```tsx
// packages/ai/src/voice/stt.ts
export async function transcribeVoice(
  fileBuffer: Buffer,
  language?: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'audio/ogg' }), 'voice.ogg');
  formData.append('model', 'whisper-1');
  if (language) formData.append('language', language);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}` },
    body: formData,
  });

  const data = await response.json();
  return data.text;
}
```

### Настройки в Mini App

Страница `/settings/voice`:

- Включить/выключить TTS ответы
- Выбор провайдера (OpenAI / ElevenLabs)
- Выбор голоса (превью прослушать)
- Язык распознавания

---

## 📄 Работа с файлами

### Поддерживаемые форматы

| Формат | Операции |
| --- | --- |
| PDF | Анализ, Q&A, summary, извлечение таблиц |
| DOCX (Word) | Анализ, редактирование, summary |
| XLSX (Excel) | Анализ данных, графики, Q&A по таблицам |
| TXT / MD | Анализ, редактирование |
| Изображения (JPG/PNG) | OCR + анализ через Vision |
| Аудио | Транскрипция через Whisper |

**Максимальный размер:** 20MB (лимит Telegram)

### Flow анализа файла

```
Юзер отправляет файл в чат
       │
       ▼
  bot.on('document') / bot.on('photo')
       │
       ▼
  Определяем тип файла (MIME type)
       │
       ▼
  Скачиваем через Telegram API → temp хранение
       │
       ▼
  Парсим контент:
  PDF → pdf-parse → текст
  DOCX → mammoth → markdown
  XLSX → xlsx → JSON таблицы
  Изображение → base64 → Vision API
       │
       ▼
  Кладём в контекст AI запроса
  (file content as system context)
       │
       ▼
  Ждём вопрос юзера или сразу делаем summary
       │
       ▼
  Удаляем temp файл (finally)
```

### Генерация документов

Юзер просит сгенерировать документ → AI создаёт контент → конвертируем в нужный формат → отправляем файлом.

```
/generate report — AI генерирует структуру → пользователь уточняет → генерируем PDF
/generate table — описываешь структуру → получаешь XLSX
/generate doc — любой текстовый документ → DOCX
```

Или через Mini App с визуальным редактором:

- Выбираешь тип документа (Отчёт / Таблица / Письмо / Резюме / Контракт)
- AI задаёт уточняющие вопросы
- Генерирует документ
- Скачиваешь или получаешь в боте

### Библиотеки

```tsx
// packages/files/package.json dependencies
{
  "pdf-parse": "^1.1.1",        // PDF → text
  "mammoth": "^1.6.0",          // DOCX → markdown
  "xlsx": "^0.18.5",            // Excel read/write
  "docx": "^8.5.0",             // DOCX generation
  "pdfkit": "^0.14.0",          // PDF generation
}
```

### Файловая структура

```
packages/files/src/
├── parsers/
│   ├── pdf.ts           # PDF → text (pdf-parse)
│   ├── docx.ts          # DOCX → markdown (mammoth)
│   ├── xlsx.ts          # Excel → JSON (xlsx)
│   └── image.ts         # Image → base64 для Vision
├── generators/
│   ├── pdf.ts           # Генерация PDF (pdfkit)
│   ├── docx.ts          # Генерация DOCX (docx-js)
│   └── xlsx.ts          # Генерация Excel (xlsx)
├── storage.ts           # Temp файлы + cleanup
└── index.ts             # Unified interface
```

### Лимиты по планам

|  | Free | Pro |
| --- | --- | --- |
| Файл за раз | ✅ | ✅ |
| Макс размер | 10MB | 20MB |
| Генерация документов | ❌ | ✅ |
| OCR изображений | ❌ | ✅ |
| Кредиты за анализ | 20 | 16 (скидка 20%) |

---

## 🎭 Публичные AI Персонажи (Mini App only)

### Концепция

Юзер создаёт AI персонажа (имя + системный промпт + аватар + описание) и публикует его в общем маркетплейсе внутри Mini App. Другие юзеры могут запустить персонажа и общаться с ним.

### Только в Mini App

Персонажи доступны **исключительно** через Mini App (`/personas`). В боте остаётся только личный roleplay через `/roleplay`.

### Структура персонажа

```tsx
const PersonaSchema = new Schema({
  creatorId: { type: String, required: true },

  name: { type: String, required: true },          // "Философ Сократ"
  description: String,                             // Краткое описание для маркетплейса
  systemPrompt: { type: String, required: true },  // Настоящий промпт (скрыт от других)
  avatarUrl: String,                               // Загружается в S3/Cloudflare R2

  tags: [String],                                  // ['философия', 'история', 'образование']
  language: String,

  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private',
  },

  stats: {
    usageCount: { type: Number, default: 0 },      // Сколько раз запускали
    rating: { type: Number, default: 0 },          // Средний рейтинг (1-5)
    ratingsCount: { type: Number, default: 0 },
  },

  isFeatured: { type: Boolean, default: false },   // Редакторский выбор (ставит SuperAdmin)
  isModerated: { type: Boolean, default: false },  // Прошёл модерацию

  createdAt: { type: Date, default: Date.now },
});
```

### Страницы в Mini App

```
/personas                  # Маркетплейс — лента публичных персонажей
/personas/featured         # Редакторский выбор
/personas/[id]             # Страница персонажа + кнопка "Начать чат"
/personas/[id]/chat        # Чат с персонажем
/personas/create           # Создание нового персонажа
/personas/my               # Мои персонажи (private + public)
```

### Маркетплейс UI

- Карточки персонажей: аватар + имя + описание + теги + рейтинг + количество чатов
- Фильтры: по языку, тегам, популярности
- Поиск по имени и описанию
- "Featured" секция сверху (курирует SuperAdmin)

### Модерация персонажей

Перед публикацией — модерация:

1. Автоматическая: проверка системного промпта на токсичность/NSFW через AI
2. Ручная (если автомод не уверен): SuperAdmin одобряет в админке

```tsx
// В Admin Panel: /admin/personas — очередь на модерацию
interface PersonaModerationItem {
  persona: Persona;
  autoModScore: number;         // 0-1, чем выше тем подозрительнее
  autoModReason?: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

### Монетизация персонажей

- Создание персонажа: **бесплатно**
- Публикация в маркетплейс: требует **Pro подписки**
- Чат с чужим персонажем: стандартная стоимость кредитов

---

## 🔄 Обновлённая таблица планов

| Фича | Free | Pro | Pay-as-you-go |
| --- | --- | --- | --- |
| Ежедневные кредиты | 50 | 500 | По балансу |
| Скидка на операции | — | 20% | — |
| Выбор AI модели | ❌ | ✅ | ❌ |
| Голосовой ввод (STT) | ✅ | ✅ | ✅ |
| Голосовой ответ (TTS) | ❌ | ✅ | ✅ |
| Анализ файлов | до 10MB | до 20MB | до 20MB |
| Генерация документов | ❌ | ✅ | ✅ |
| Агентные задачи | ❌ | ✅ | ✅ |
| Cron / напоминания | ❌ | ✅ | ❌ |
| BYOK | ❌ | ✅ | ❌ |
| Публикация персонажей | ❌ | ✅ | ❌ |
| Реклама | ✅ | ❌ | ❌ |
| История чата | 20 сообщ | 100 сообщ | 50 сообщ |
| Приоритет очереди | Обычный | Высокий | Обычный |
| Streak бонусы | ✅ | ✅ (x2) | ✅ |
| Реферальная программа | ✅ | ✅ | ✅ |

---

## 🗺 Обновлённая дорожная карта

### Фаза 0 — Foundation (Dev 1) `~2-3 часа`

*(без изменений)*

### Фаза 1 — UI & Navigation (Dev 1) `~2 часа`

*(без изменений)*

### Фаза 2 — AI Core (Dev 2) `~3-4 часа`

*(без изменений)*

### Фаза 3 — Moderation (Dev 1 + Dev 2) `~2-3 часа`

*(без изменений)*

### Фаза 4 — Credits System (Dev 1) `~2-3 часа` ← НОВАЯ

- [ ]  `packages/credits/` — модуль кредитов
- [ ]  `CreditTransaction` модель
- [ ]  `spendCredits()` и `earnCredits()` функции
- [ ]  Credits middleware — проверка баланса перед операцией
- [ ]  Streak система (ежедневный бонус)
- [ ]  Callback кнопка "Пополнить баланс" → inline меню пакетов
- [ ]  Отображение баланса в `/start` и `/help`

**✅ Результат:** Вся экономика кредитов работает.

### Фаза 5 — Billing & Referral (Dev 3) `~3-4 часа`

- [ ]  Telegram Stars + Stripe + Payme/Click интеграция
- [ ]  Покупка кредитных пакетов (pay-as-you-go)
- [ ]  Pro подписка (monthly/annual)
- [ ]  **Реферальная программа:**
    - [ ]  `Referral` модель + реф код для каждого юзера
    - [ ]  Deep link `/start ref_CODE` обработка
    - [ ]  Начисление кредитов при регистрации рефери
    - [ ]  Конверсионный бонус при покупке Pro рефери
    - [ ]  Защита от фрода (IP + первый AI запрос)
    - [ ]  Команда `/ref` + страница в Mini App

**✅ Результат:** Монетизация + вирусное распространение.

### Фаза 6 — Voice Module (Dev 2) `~2-3 часа` ← НОВАЯ

- [ ]  `packages/ai/src/voice/stt.ts` — Whisper транскрипция
- [ ]  `packages/ai/src/voice/tts.ts` — OpenAI TTS + ElevenLabs
- [ ]  `apps/bot/src/handlers/voice.ts` — Grammy voice handler
- [ ]  Интеграция с Credits (списание за STT/TTS)
- [ ]  Настройки голоса в UserSettings
- [ ]  Страница `/settings/voice` в Mini App
- [ ]  Превью голосов в Mini App

**✅ Результат:** Полноценный голосовой AI ассистент.

### Фаза 7 — Files Module (Dev 2 + Dev 3) `~3-4 часа` ← НОВАЯ

- [ ]  `packages/files/` — парсеры и генераторы
- [ ]  **Dev 2:** Парсеры (PDF, DOCX, XLSX, Image OCR)
- [ ]  **Dev 2:** Интеграция с AI (файл как контекст)
- [ ]  **Dev 3:** Генераторы (PDF, DOCX, XLSX)
- [ ]  **Dev 3:** Команды `/generate report|table|doc`
- [ ]  Страница генерации документов в Mini App
- [ ]  Интеграция с Credits
- [ ]  Temp файлы cleanup (always finally)

**✅ Результат:** Бот работает с документами.

### Фаза 8 — Downloader (Dev 3) `~3 часа`

*(без изменений, но добавить интеграцию с Credits)*

### Фаза 9 — Pro Features (Dev 2) `~2 часа`

*(без изменений)*

### Фаза 10 — Cron & Reminders (Dev 3) `~2 часа`

*(без изменений)*

### Фаза 11 — Mini App (Dev 3) `~5-6 часов`

Добавляем к v2.0:

- [ ]  Страница `/personas` — маркетплейс персонажей
- [ ]  Страница `/personas/create` — создание персонажа
- [ ]  Страница `/personas/[id]/chat` — чат с персонажем
- [ ]  Страница `/referral` — реф ссылка + статистика
- [ ]  Страница `/credits` — баланс, история транзакций, пополнение
- [ ]  Страница `/settings/voice` — настройки голоса

### Фаза 12 — Admin Panel (Dev 3) `~4-5 часов`

Добавляем к v2.0:

- [ ]  `/admin/personas` — очередь модерации персонажей
- [ ]  `/admin/credits` — статистика экономики кредитов
- [ ]  `/admin/referrals` — статистика реферальной программы
- [ ]  Настройка стоимости операций (без деплоя, из AdminPanel)

### Фаза 13 — Ad Engine (Dev 2) `~2 часа`

*(без изменений)*

### Фаза 14 — Polish & Production (Dev 1) `~2 часа`

*(без изменений)*

---

## 📦 Обновлённая структура монорепо

```
packages/
├── db/              # MongoDB схемы
├── redis/           # Redis клиент
├── ai/              # OpenRouter + Agent + Voice
│   └── src/
│       ├── client.ts
│       ├── memory.ts
│       ├── agents/
│       └── voice/   # ← НОВОЕ (STT + TTS)
├── files/           # ← НОВЫЙ ПАКЕТ (парсеры + генераторы)
├── credits/         # ← НОВЫЙ ПАКЕТ (экономика кредитов)
├── billing/         # Подписки + платежи + рефералы
├── types/           # Shared типы
├── config/          # ENV + константы
└── utils/           # Утилиты
```

---

## 🌐 Обновлённые ENV переменные

```
# (все из v2.0 остаются)

# Voice (новое)
OPENAI_API_KEY=             # Для Whisper STT + OpenAI TTS
ELEVENLABS_API_KEY=         # Для ElevenLabs TTS

# File Storage (новое)
# Для временного хранения файлов при генерации
# Railway ephemeral storage достаточно для temp файлов
# Для постоянного хранения аватаров персонажей:
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_ENDPOINT=
```

---

## ⚠️ Новые архитектурные правила (добавляются к v2.0)

1. **Credits first:** Перед любой платной операцией — `spendCredits()`. При ошибке операции — `refundCredits()`. Нет исключений.
2. **Voice cleanup:** Аудио temp файлы (OGG от TG, MP3 от TTS) — всегда удалять в `finally`.
3. **File cleanup:** Загруженные для анализа файлы — удалять после обработки. Не хранить на сервере.
4. **Persona prompts — приватны:** `systemPrompt` персонажа **никогда** не отдаётся клиенту через API. Только через серверный AI вызов.
5. **Реф фрод защита:** Реферальный бонус начисляется только после триггера (первый AI запрос / первый платёж). Не при простой регистрации. Второй вариант: После каждого приглашенного сам юзер получает 10% скидки на подписку. Если приглашает 10 юзеров (платящих) - юзер получает подписку бесплатно.

---

*Версия 2.1 — финальный scope перед началом разработки.*