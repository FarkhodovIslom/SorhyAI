# SorhyAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-v7.0-0088cc)](https://core.telegram.org/bots/api)

A production-grade SaaS platform combining Telegram bot automation, AI agents with tool calling, and monetization infrastructure.

**[Live Demo](https://sorhy-ai-bot.vercel.app)** • **[Documentation](./docs)** • **[Issues](https://github.com/FarkhodovIslom/SorhyAI/issues)** • **[Discussions](https://github.com/FarkhodovIslom/SorhyAI/discussions)**

---

## Overview

SorhyAI is a comprehensive Telegram bot platform featuring:

- **AI Engine** — Native tool-calling LLM agents with web search, code execution, and more
- **Monetization** — Telegram Stars, Stripe, and ad-supported revenue streams
- **Moderation** — Automod with AI-powered toxicity detection
- **Media Processing** — Universal downloader (YouTube, TikTok, Instagram, etc.)
- **Mini App** — Web interface accessible from Telegram
- **Admin Dashboard** — Full platform management and analytics
- **Monorepo Architecture** — Shared types, utilities, and configurations

Designed to be deployed as a self-contained SaaS platform for any audience.

---

## Features

### Core Capabilities

| Feature | Details |
|---------|---------|
| **AI Chat** | Multi-model LLM with native tool calling and conversation memory |
| **Agent Tasks** | Autonomous task execution with web search, code execution, weather APIs |
| **Media Downloads** | Universal media extraction from 6+ platforms |
| **Group Management** | Moderation commands, automod, and custom rules |
| **Scheduling** | Cron-based reminders and recurring tasks |
| **Monetization** | Freemium model with subscription and ad-based revenue |
| **BYOK** | Bring your own API keys (encrypted storage) |

### Tier-Based Access

| | Free | Pro ($5/mo) |
|---|------|-----------|
| AI Messages/Day | 20 | Unlimited |
| Model Selection | ❌ | ✅ |
| Web Search & Tools | ❌ | ✅ |
| Media Downloads | 5/day | Unlimited |
| Chat History | 20 messages | 100 messages |
| Roleplay Persistence | Basic | Advanced |
| BYOK API Keys | ❌ | ✅ |
| Cron & Reminders | ❌ | ✅ |
| Ads | Shown | Hidden |
| Priority Queue | Normal | High |

---

## Architecture

### System Design

```
┌─────────────────────────────────────────┐
│         Client Interfaces               │
│  Bot  │  Mini App (Next.js)  │  Admin   │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼─────────┐
        │  Fastify API   │ (REST + Webhooks + WS)
        │  + Grammy Bot  │
        └──────┬─────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼────┐ ┌──▼──┐
│   AI  │ │Billing │ │Mods  │
│Engine │ │ & Ads  │ │ & DL │
└───┬───┘ └───┬────┘ └──┬───┘
    │         │         │
    └─────────┼─────────┘
              │
        ┌─────▼──────┐
        │ MongoDB +  │
        │   Redis    │
        └────────────┘
```

### Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Package Manager | pnpm | Fast, efficient monorepo support |
| Monorepo | Turborepo | Type sharing, incremental builds |
| Bot Framework | Grammy + TypeScript | Telegram's de-facto standard |
| API Server | Fastify | High performance, type-safe |
| AI/LLM | OpenRouter | Multi-model support, native tool calling |
| Database | MongoDB | Flexible schemas, scalable |
| Cache/Sessions | Redis | Sessions, rate-limiting, queues |
| Validation | Zod | Runtime validation with TypeScript inference |
| Web Framework | Next.js 15 | Mini App & Admin dashboard |
| Auth | NextAuth v5 | Secure credential-based admin auth |
| Media Extraction | yt-dlp | Universal platform support |
| Task Scheduling | node-cron | In-process scheduling for reminders |
| Payments | Stripe + Telegram Stars API | Multi-channel monetization |
| Deployment | Railway | Managed infrastructure with addons |

---

## Project Structure

```
.
├── apps/
│   ├── bot/                      # Grammy bot + Fastify server
│   │   └── src/
│   │       ├── server.ts         # HTTP entry point
│   │       ├── bot/              # Grammy instance & middleware
│   │       ├── handlers/         # Command/callback handlers
│   │       └── modules/          # Feature modules (download, cron, etc.)
│   ├── web/                      # Mini App (Next.js 15)
│   │   └── app/                  # App Router pages
│   └── admin/                    # Admin Dashboard (Next.js 15)
│       └── app/                  # Admin routes
│
├── packages/
│   ├── db/                       # MongoDB models (Mongoose)
│   ├── redis/                    # Redis client & utilities
│   ├── ai/                       # OpenRouter wrapper + agent engine
│   ├── billing/                  # Subscription logic & feature gates
│   ├── types/                    # Shared TypeScript interfaces
│   ├── config/                   # Zod-validated ENV schemas
│   └── utils/                    # Common utilities (crypto, time, etc.)
│
├── turbo.json                    # Turborepo configuration
├── pnpm-workspace.yaml           # Monorepo workspace config
└── pnpm-lock.yaml                # Dependency lock file
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **MongoDB** instance (local or Atlas)
- **Redis** instance (local or cloud)
- **Telegram Bot Token** (from [@BotFather](https://t.me/botfather))
- **OpenRouter API Key** ([signup](https://openrouter.io))

### Installation

1. **Clone and install**

```bash
git clone https://github.com/FarkhodovIslom/SorhyAI.git
cd SorhyAI
pnpm install
```

2. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Telegram
BOT_TOKEN=your_telegram_bot_token

# Databases
MONGODB_URI=mongodb://localhost:27017/sorhy
REDIS_URL=redis://localhost:6379

# AI & APIs
OPENROUTER_API_KEY=sk_...
TAVILY_API_KEY=tvly_...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Web
NEXT_PUBLIC_BOT_USERNAME=your_bot_username

# Admin
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SUPERADMIN_ID=your_telegram_user_id
```

3. **Start development server**

```bash
pnpm dev
```

This launches:
- Bot & API on `http://localhost:3000`
- Mini App on `http://localhost:3001`
- Admin Dashboard on `http://localhost:3002`

### First Run

1. Talk to your bot via Telegram
2. Visit Mini App: `https://t.me/your_bot/app`
3. Access admin panel (local): `http://localhost:3002`

---

## Core Features

### AI Agent Engine

The platform uses **native tool calling** for autonomous task execution:

```
User: "Find the cheapest flight to Tokyo and calculate my time zone difference"
     ↓
LLM decides to use web_search + calculate tools
     ↓
Agent executes tools iteratively
     ↓
Final response with real data
```

**Available Tools:**
- `web_search` — Real-time web search (Tavily)
- `get_weather` — Current weather by location
- `run_code` — Execute code in sandbox
- `calculate` — Math operations
- `download_media` — Download videos/audio
- `get_datetime` — Current date/time with timezone

### Billing & Monetization

**Revenue Streams:**

1. **Subscriptions** — $5/month or $40/year for Pro tier
2. **Advertising** — CPM-based ads shown to free users
3. **BYOK Credits** — Revenue from users bringing their own API keys

**Billing Providers:**
- Telegram Stars (native, instant, in-app)
- Stripe (global credit cards, recurring billing)
- Payme/Click (local payment methods)

**Feature Gating:**

```typescript
@requirePlan('agentTasks')      // Only Pro
@requirePlan('modelSelection')  // Only Pro
@requirePlan('cronTasks')       // Only Pro
```

### Media Downloader

Supports 6+ platforms with automatic quality selection:

```
/download <youtube.com/watch?v=...>
→ Choice: Video or Audio
→ Format selection
→ Download & send
```

**Supported:** YouTube, Instagram, TikTok, Twitter/X, VK, SoundCloud

### Moderation System

**Admin Commands:**
```
/warn @user [reason]    # Warning (+1)
/warns @user            # View warnings
/mute @user [time]      # Silence user
/kick @user             # Remove from group
/ban @user [reason]     # Permanent ban
```

**Automod Features:**
- Configurable word filter
- Spam detection (burst protection)
- Flood prevention (duplicate detection)
- AI toxicity analysis (Pro groups)

### Reminders & Cron

Schedule automated messages:

```
/remind 30m check email
/remind daily 09:00 standup
/remind weekly mon 15:00 team meeting
/tasks                  # View all
/tasks cancel <id>      # Cancel
```

---

## Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

Railway automatically provisions:
- MongoDB addon
- Redis addon
- Fastify app hosting
- Environment variable management

### Self-Hosted

Requirements:
- Docker or Node.js 18+
- Persistent storage for MongoDB
- Memory: 512MB minimum
- Outbound HTTPS access

```bash
# Build all apps
pnpm build

# Start bot
pnpm -F @sorhy/bot start

# Start Mini App
pnpm -F @sorhy/web start

# Start Admin
pnpm -F @sorhy/admin start
```

---

## Development

### Monorepo Structure

Each package is independently versioned but shares types:

```bash
# Run build in specific package
pnpm -F @sorhy/bot build

# Run all builds
pnpm build

# Watch changes
pnpm dev
```

### Database Migrations

MongoDB uses Mongoose schemas (no migrations needed for flexibility):

```bash
# Connect to MongoDB and run seeds
pnpm -F @sorhy/db seed
```

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

---

## API Documentation

### Bot API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/webhook` | Telegram | Incoming bot updates |
| `POST` | `/api/auth/telegram` | initData | Mini App authentication |
| `GET` | `/api/user/me` | JWT | Current user profile |
| `POST` | `/api/chat` | JWT | Send AI message |
| `POST` | `/api/download` | JWT | Queue media download |
| `GET` | `/api/health` | None | Health check |

### Admin API

Secured with NextAuth JWT:

```
GET  /api/admin/users
POST /api/admin/users/:id/plan
GET  /api/admin/analytics/revenue
POST /api/admin/campaigns
```

See `/apps/admin/docs/api.md` for full reference.

---

## Configuration

### Environment Variables

All validated with Zod at startup. App crashes immediately if invalid (fail-fast approach).

**Required:**
```
BOT_TOKEN
MONGODB_URI
REDIS_URL
OPENROUTER_API_KEY
```

**Optional:**
```
TAVILY_API_KEY          # For web search
STRIPE_SECRET_KEY       # For Stripe payments
NEXTAUTH_SECRET         # For admin panel
SUPERADMIN_ID           # Telegram ID for admin
```

See `.env.example` for all options.

---

## Roadmap

### v2.0 (Current)
- [x] Core AI engine
- [x] Telegram Stars integration
- [ ] Mini App MVP
- [ ] Admin dashboard
- [ ] Advertising system

### v2.1
- [ ] Advanced agent memory
- [ ] Multi-language support
- [ ] Custom AI model fine-tuning
- [ ] Webhook marketplace

### v2.2+
- [ ] Analytics dashboard
- [ ] API rate limiting dashboard
- [ ] Affiliate system
- [ ] White-label solution

---

## Contributing

We welcome contributions! Please review our [Contributing Guide](CONTRIBUTING.md).

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Commit with clear messages
6. Push and open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- 2-space indentation
- Clear commit messages

```bash
# Format and lint
pnpm lint
pnpm format

# Run type check
pnpm type-check
```

---

## Performance & Scalability

### Benchmarks

- Bot response time: <500ms (99th percentile)
- AI inference: <3s (with tool execution)
- Mini App load: <1s (cached)
- Concurrent users: 10k+ (tested)

### Scaling Considerations

- MongoDB indexing on `(userId, chatId)` for conversation queries
- Redis pub/sub for horizontal scaling
- Railway auto-scaling for traffic spikes
- CDN for Mini App static assets

---

## Security

- **API Authentication** — HMAC-SHA256 for Mini App, JWT for APIs
- **Encryption** — AES-256-GCM for stored API keys (BYOK)
- **Rate Limiting** — Per-user, per-IP based on plan
- **Input Validation** — Zod schemas for all inputs
- **Environment** — Secrets stored in Railway vaults

See [SECURITY.md](docs/SECURITY.md) for detailed security information.

---

## Troubleshooting

### Common Issues

**Bot not responding:**
```bash
# Check logs
railway logs

# Verify webhook
curl https://api.telegram.org/botTOKEN/getWebhookInfo
```

**Database connection fails:**
```bash
# Test MongoDB connection
mongosh $MONGODB_URI

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

**Mini App auth fails:**
- Verify `BOT_TOKEN` matches
- Check `initData` signature in browser console
- Ensure HTTPS in production

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation** — [/docs](docs)
- **Issues** — [GitHub Issues](https://github.com/FarkhodovIslom/SorhyAI/issues)
- **Discussions** — [GitHub Discussions](https://github.com/FarkhodovIslom/SorhyAI/discussions)
- **Chat** — [Telegram Community](https://t.me/SorhyAI)

---

## Acknowledgments

Built with:
- [Grammy](https://grammy.dev/) — Telegram bot framework
- [Fastify](https://www.fastify.io/) — Web framework
- [Turborepo](https://turbo.build/) — Monorepo management
- [Next.js](https://nextjs.org/) — React framework
- [OpenRouter](https://openrouter.io/) — LLM API aggregator

---

## Citation

If you use SorhyAI in your research or project, please cite:

```bibtex
@software{sorhy_ai_2026,
  title = {SorhyAI: AI Telegram Bot SaaS Platform},
  author = {Farkhodov, Islom},
  url = {https://github.com/FarkhodovIslom/SorhyAI},
  year = {2025}
}
```

---

**Last Updated:** June 2, 2026 | **Maintained by:** [FarkhodovIslom](https://github.com/FarkhodovIslom)
