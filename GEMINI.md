# GEMINI.md

## Project Overview
**SorhyAI** is a production-grade AI Telegram SaaS platform designed as a polyglot monorepo. It aims to integrate AI agent capabilities (via tool calling), media downloading, group moderation, and multi-channel monetization (Telegram Stars, Stripe).

The project is currently in its **Foundation Phase (Phase 0)**, focusing on core infrastructure and shared packages.

### Tech Stack
- **Monorepo Management:** [Turborepo](https://turbo.build/) with [pnpm](https://pnpm.io/) workspaces.
- **Runtime:** Node.js (18+).
- **Language:** TypeScript (Strict mode).
- **Backend Infrastructure:** 
  - **Bot Framework:** [Grammy](https://grammy.dev/) (Planned).
  - **API Server:** [Fastify](https://www.fastify.io/) (Planned).
- **Frontend Framework:** Next.js 15 (Planned for Mini App and Admin Dashboard).
- **Persistence & Caching:**
  - **Database:** MongoDB (via Mongoose).
  - **Cache/Session:** Redis.
- **AI Integration:** OpenRouter (Planned) for multi-model access and native tool calling.
- **Validation:** [Zod](https://zod.dev/) for fail-fast environment variable validation.

### Architecture
The workspace is organized into `apps/` and `packages/`:

- **`packages/`**: Core shared modules.
  - `@sorhy/db`: MongoDB models (`User`, `Conversation`, `Group`) and connection logic.
  - `@sorhy/redis`: Redis client, rate-limiting, and session storage utilities.
  - `@sorhy/config`: Zod-validated environment configuration.
  - `@sorhy/types`: Shared TypeScript interfaces and types.
  - `@sorhy/utils`: Common utility functions.
- **`apps/`**: (To be implemented)
  - `bot`: The primary Telegram bot and Fastify API server.
  - `web`: Telegram Mini App (Next.js 15).
  - `admin`: Platform administration dashboard (Next.js 15).

---

## Getting Started

### Prerequisites
- **Node.js**: 18.0.0 or higher.
- **pnpm**: 9.x or higher.
- **MongoDB**: Active instance or URI.
- **Redis**: Active instance or URL.

### Installation
```bash
pnpm install
```

### Environment Configuration
1. Copy `.env.example` to `.env`.
2. Populate the required variables (`BOT_TOKEN`, `MONGODB_URI`, `REDIS_URL`, `OPENROUTER_API_KEY`, `ENCRYPTION_KEY`).
3. **Note:** The project uses a fail-fast approach; missing or invalid variables in `packages/config` will prevent the application from starting.

### Common Commands
- `pnpm dev`: Runs development servers for all apps/packages.
- `pnpm build`: Builds the entire monorepo.
- `pnpm lint`: Runs ESLint across all workspaces.
- `pnpm check-types`: Performs TypeScript type checking.
- `pnpm format`: Formats code using Prettier.

---

## Development Guidelines

### Monorepo Workflow
- **Package Addition:** Add new shared logic under `packages/` and applications under `apps/`.
- **Dependencies:** Use `pnpm` for all dependency management. Prefer `workspace:*` for internal package references.
- **Task Orchestration:** Use root scripts (which call `turbo`) to ensure tasks are run with proper caching and dependency ordering.

### Coding Standards
- **Strict Typing:** Avoid `any`. Use the shared types in `@sorhy/types` whenever possible.
- **Environment Safety:** Never access `process.env` directly outside of `@sorhy/config`. Always import the validated `env` object.
- **Database Access:** Use the models exported from `@sorhy/db` to ensure consistent schema application.

### Important Structural Notes
- **Placeholder Files:** Root-level directories such as `src/`, `app/`, `lib/`, and `internal/` currently contain placeholder or decoy files (hash comments). Active development is focused within the `packages/` directory and will eventually expand into the `apps/` directory.
- **Feature Gating:** Plans and feature access should be managed via the `PLAN_FEATURES` configuration (to be implemented in `@sorhy/billing`).

---

## Project Status & Roadmap
The project is following a phased implementation plan (see `PLAN.md`):
- **Phase 0 (Current):** Foundation, DB, Redis, Config.
- **Phase 1:** UI & Navigation.
- **Phase 2:** AI Core & Agent Loop.
- **Phase 3-14:** Moderation, Credits, Billing, Media Downloader, Mini App, and Admin Panel.
