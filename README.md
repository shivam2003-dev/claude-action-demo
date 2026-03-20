# UIGen

AI-powered React component generator with live preview. Describe a component in natural language and see it render instantly in a sandboxed iframe — no files written to disk.

## Prerequisites

- Node.js 18+
- npm

## Setup

1. **Optional** — create a `.env` file and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your-api-key-here
```

Without an API key the app falls back to a mock language model that returns static placeholder code — useful for UI development without API costs.

2. Install dependencies and initialize the database:

```bash
npm run setup
```

This command will:
- Install all dependencies
- Generate the Prisma client
- Run SQLite database migrations

## Running the Application

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run test       # Run unit tests (Vitest)
npm run lint       # ESLint
npm run db:reset   # Reset database (destructive)
```

## Usage

1. Sign up or continue as an anonymous user
2. Describe the React component you want to create in the chat
3. View the generated component in the live preview panel
4. Switch to the **Code** tab to browse and edit generated files
5. Iterate with the AI to refine your component

## Features

- **AI-powered generation** — Claude writes JSX/TSX from natural language descriptions
- **Live preview** — components render instantly in a sandboxed iframe via a virtual file system
- **Monaco editor** — syntax-highlighted code viewer/editor for all generated files
- **Any npm package** — third-party packages resolve automatically from esm.sh
- **Lucide icons** — available out of the box in all generated components
- **Responsive layouts** — components are generated mobile-first by default
- **Persistence** — registered users' projects are saved to SQLite via Prisma
- **Anonymous use** — no sign-up required to try it out

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Prisma** with SQLite
- **Anthropic Claude** (`claude-haiku-4-5`) via Vercel AI SDK
- **Monaco Editor** for the code panel
- **Vitest** for unit tests

## Architecture

```
User prompt → /api/chat → Claude (tools: str_replace_editor, file_manager)
                              ↓
                    FileSystemProvider (in-memory virtual FS)
                              ↓
                    PreviewFrame (JSX → import-map HTML → iframe)
```

See [`CLAUDE.md`](./CLAUDE.md) for a detailed architecture guide.
