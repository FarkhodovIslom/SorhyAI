# Contributing to SorhyAI

First off, thank you for considering contributing to SorhyAI! It's people like you that make SorhyAI such a great platform.

SorhyAI is an open-source AI Telegram SaaS platform designed as a polyglot monorepo. We welcome contributions of all kinds, from bug fixes and feature implementations to documentation improvements.

## Architecture Overview

SorhyAI is structured as a monorepo using [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/) workspaces.

- **`packages/`**: Shared core modules (Database, Redis, Config, Types, Utils).
- **`apps/`**: Applications (Telegram Bot, Fastify API, Next.js Web App/Admin).

### Tech Stack
- **Runtime:** Node.js (18+)
- **Language:** TypeScript (Strict mode)
- **Package Manager:** pnpm (9.x+)
- **Core Integrations:** MongoDB, Redis, OpenRouter, Grammy (Telegram)

## Local Development Setup

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [pnpm](https://pnpm.io/) (v9.x or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- [Redis](https://redis.io/) (Local instance or cloud URL)

### Installation

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/SorhyAI.git
   cd SorhyAI
   ```

2. **Install dependencies:**
   We strictly use `pnpm` for package management. Do not use `npm` or `yarn`.
   ```bash
   pnpm install
   ```

3. **Environment Configuration:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in the required variables (`BOT_TOKEN`, `MONGODB_URI`, `REDIS_URL`, `OPENROUTER_API_KEY`, etc.). 
   *Note: SorhyAI uses a fail-fast approach via Zod in `@sorhy/config`. The application will intentionally crash on startup if required variables are missing or invalid.*

### Common Commands

We use Turbo to orchestrate scripts across the monorepo. Run these from the root directory:

- `pnpm dev`: Start all apps and packages in development mode.
- `pnpm build`: Build the entire monorepo.
- `pnpm lint`: Run ESLint across all workspaces.
- `pnpm check-types`: Run TypeScript type checking without emitting files.
- `pnpm format`: Format the codebase using Prettier.

## Coding Standards & Guidelines

To maintain a healthy and scalable codebase, please strictly adhere to the following rules:

1. **Strict Typing:**
   - Avoid `any` at all costs.
   - Use shared types from `@sorhy/types` whenever possible.

2. **Environment Variables:**
   - **NEVER** access `process.env` directly in application code.
   - Always import the validated `env` object from `@sorhy/config` to ensure type safety and fail-fast behavior.

3. **Database Access:**
   - Always use the centralized Mongoose models exported from `@sorhy/db` to ensure consistent schemas and connection logic.

4. **Monorepo Dependencies:**
   - Add new shared logic under `packages/` and applications under `apps/`.
   - Use `workspace:*` for internal package references in `package.json` to ensure you are linking to local packages.

## How to Contribute

### Reporting Bugs
- Check existing issues to see if the bug has already been reported.
- Open a new issue providing as much context as possible (Node.js version, OS, error logs, and minimal steps to reproduce).

### Suggesting Enhancements
- Open an issue describing the feature, why it is needed, and how it aligns with the project's roadmap.

### Pull Request Process
1. **Create a branch:** Create a descriptive branch name from `main` (e.g., `feat/add-stripe-billing`, `fix/redis-caching-bug`).
2. **Make your changes:** Follow the coding standards described above.
3. **Write tests:** If you add new functionality, please add corresponding automated tests.
4. **Run checks locally:** Ensure `pnpm check-types` and `pnpm lint` pass successfully.
5. **Commit cleanly:** Write clear, concise commit messages focused on "why" the change was made.
6. **Submit PR:** Open a Pull Request against the `main` branch. Provide a clear description of the changes and reference any related issues.

## Roadmap Alignment
Please review our ongoing implementation plan (e.g., `PLAN.md`) before starting major architectural work. We execute in phases (currently transitioning from Phase 0 to Phase 1). Contributions aligning with the active phase are highly prioritized.

---
Thank you for helping us build SorhyAI!