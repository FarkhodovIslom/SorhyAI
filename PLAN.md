# Implementation Plan — Sorhy AI v2.1

## Фаза 0 — Foundation (2–3ч)
- Монорепо, DB, Redis, Fastify, webhook, системные `/start`
- Бот живёт на Railway

## Фаза 1 — UI & Navigation (2ч)
- Главное меню, `/start`, `/help`, настройки
- Колбэки навигации

## Фаза 2 — AI Core (3–4ч)
- OpenRouter клиент
- Агентный loop с tool calling
- История в Mongo
- Roleplay режим

## Фаза 3 — Moderation (2–3ч)
- Команды: `/warn`, `/ban`, `/mute`
- Автомодерация (запрещённые слова, антиспам)
- AI-модератор

## Фаза 4 — Credits System (2–3ч)
- Пакеты credits
- Модели транзакций: `spendCredits/earnCredits`
- Streak бонусы
- Middleware для списаний

## Фаза 5 — Billing & Referral (3–4ч)
- Telegram Stars + Stripe + Payme/Click
- Pro подписка
- Реферальная программа

## Фаза 6 — Voice Module (2–3ч)
- STT: Whisper
- TTS: OpenAI + ElevenLabs
- Voice handler
- Интеграция с credits

## Фаза 7 — Files Module (3–4ч)
- Парсеры: PDF, DOCX, XLSX, OCR
- Генераторы документов
- Интеграция с AI

## Фаза 8 — Downloader (3ч)
- `yt-dlp` wrapper
- Redis очередь
- Паттерны лимитов
- Лимит: 50MB

## Фаза 9 — Pro Features (2ч)
- Выбор моделей
- BYOK (AES-256-GCM шифрование)
- Расширенный roleplay

## Фаза 10 — Cron & Reminders (2ч)
- Персистентные напоминания
- `node-cron`
- Команды: `/remind`, `/tasks`

## Фаза 11 — Mini App (5–6ч)
- Next.js 15
- Страницы: чат, настройки, billing, персонализация, реферальная система, кредиты

## Фаза 12 — Admin Panel (4–5ч)
- Dashboard
- Управление пользователями/группами
- Модерация, реклама, финансы

## Фаза 13 — Ad Engine (2ч)
- AdCampaign, impression engine
- Показы рекламы
- Логика кб/оплаты и статистика

## Фаза 14 — Polish & Production (2ч)
- Логирование
- Мониторинг
- Error handling
- CI/CD
- Финальный деплой
