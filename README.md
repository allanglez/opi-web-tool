# OPI Web Tool

Oral Proficiency Interview Web Application - A secure, operational web tool for running OPI assessments during active assessment cycles.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Vue Router + Pinia
- **Backend**: NestJS + Fastify + Prisma
- **Database**: Microsoft SQL Server
- **Auth**: Auth0 (SSO via MyYukon)
- **Storage**: Local/Azure Blob (audio files)

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

## Quick Start

```bash
# Install dependencies
pnpm install

# Start MSSQL database
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development servers (API + Web)
pnpm dev
```

## Project Structure

```
opi-web-tool/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Vue 3 frontend
└── packages/
    └── shared/       # Shared types and constants
```

## Development

- **API**: http://localhost:3000
- **Web**: http://localhost:5173
- **Database**: localhost:1433 (SA password: OpiDev2026!)

## Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Type check all packages
- `pnpm test` - Run all tests
