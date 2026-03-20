# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates code that renders in a sandboxed iframe via a virtual file system (no files written to disk).

## Commands

```bash
npm run setup        # First-time setup: install deps + generate Prisma client + run migrations
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run db:reset     # Reset database (destructive)
```

All `next` commands include `NODE_OPTIONS='--require ./node-compat.cjs'` for Node.js polyfills — this is intentional.

## Environment

- `.env` file with `ANTHROPIC_API_KEY` — optional. Without it, the app falls back to a mock language model (`src/lib/provider.ts`).
- Database: SQLite at `prisma/dev.db` via Prisma.

## Architecture

### Request Flow

1. User types in chat → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat`
2. `/api/chat/route.ts` combines messages with system prompt + file state, calls Claude via Vercel AI SDK
3. Claude uses tools (`str_replace_editor`, `file_manager`) to create/modify files
4. `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) receives tool calls and updates in-memory virtual FS
5. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) re-renders — JSX transformer converts code into an import-map HTML document executed in a sandboxed iframe
6. On stream completion, API saves messages + file tree to DB (authenticated users only)

### Key Layers

**Virtual File System** (`src/lib/file-system.ts`): All generated code lives in memory. The FS is serialized to JSON and stored in the `Project.fileData` DB column.

**AI Provider** (`src/lib/provider.ts`): Loads `claude-haiku-4-5` when `ANTHROPIC_API_KEY` is set; otherwise returns a `MockLanguageModel` for development without API costs.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Converts Claude-generated JSX/TSX into browser-runnable code using an import map (React, Lucide, etc. are loaded from CDN).

**System Prompt** (`src/lib/prompts/generation.tsx`): Defines Claude's behavior — how it should structure files, which libraries are available in the preview, and tool usage patterns.

**Auth** (`src/lib/auth.ts`): JWT sessions via `jose`, stored in httpOnly cookies. Middleware at `src/middleware.ts` protects `/[projectId]` routes.

### Route Structure

- `/` — Home page: redirects authenticated users to their projects, shows anonymous UI otherwise
- `/[projectId]` — Project workspace: loads project from DB, renders `MainContent` (resizable panels with chat, preview, code editor)
- `/api/chat` — Streaming POST endpoint; handles Claude tool calls and DB persistence

### State Management

- `ChatProvider` wraps Vercel AI SDK's `useChat` — owns message history and streaming state
- `FileSystemProvider` owns virtual FS state and handles tool-call side effects from chat
- These two contexts are the primary shared state; components subscribe to them

## Tech Stack

- **Next.js 15** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS v4**, **shadcn/ui**, **Radix UI**, **Monaco Editor**
- **Vercel AI SDK** (`ai` package) for streaming + tool calling
- **Prisma** ORM with SQLite
- **Vitest** for tests (JSDOM environment)
