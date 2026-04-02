# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, and an LLM (Claude) generates React code that renders in a sandboxed iframe preview. It works without an API key using a mock provider that returns static components.

## Commands

- **Setup**: `npm run setup` (installs deps, generates Prisma client, runs migrations)
- **Dev server**: `npm run dev` (Next.js with Turbopack on localhost:3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Tests**: `npm run test` (vitest, jsdom environment)
- **Single test**: `npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx`
- **DB reset**: `npm run db:reset`

Note: Dev/build/start commands use `NODE_OPTIONS='--require ./node-compat.cjs'` for Node compatibility polyfills.

## Architecture

### Request Flow
1. User sends a message via `ChatInterface` -> `ChatProvider` (uses Vercel AI SDK's `useChat`)
2. Request hits `POST /api/chat/route.ts` with messages + serialized virtual file system
3. Route uses `streamText` with two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
4. Tools operate on a server-side `VirtualFileSystem` instance; tool calls are also replayed client-side via `FileSystemContext.handleToolCall`
5. On completion, if user is authenticated and has a projectId, messages and file state are persisted to SQLite

### Virtual File System (`src/lib/file-system.ts`)
In-memory tree structure (no disk I/O). Serialized as `Record<string, FileNode>` and sent with every chat request. Supports create, read, update, delete, rename, and text-editor operations (view, str_replace, insert).

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts` -> `PreviewFrame`)
- JSX/TSX files are transformed via `@babel/standalone` in the browser
- An import map is generated: local files become blob URLs, third-party packages resolve to `esm.sh`
- `@/` import alias maps to the virtual FS root
- CSS files are injected as `<style>` tags; Tailwind loaded via CDN
- Preview renders in a sandboxed iframe with an `ErrorBoundary`

### Provider System (`src/lib/provider.ts`)
- With `ANTHROPIC_API_KEY`: uses `@ai-sdk/anthropic` with `claude-haiku-4-5`
- Without API key: uses `MockLanguageModel` that returns hardcoded counter/form/card components

### Auth & Data
- JWT-based auth using `jose`, stored in httpOnly cookies (7-day expiry)
- Server actions in `src/actions/index.ts` handle signUp/signIn/signOut
- Prisma + SQLite (`prisma/dev.db`); Prisma client generated to `src/generated/prisma`
- Anonymous users can use the app without auth; authenticated users get project persistence
- Projects store messages and file system state as JSON strings

### Context Providers (wrap the app in `MainContent`)
- `FileSystemProvider`: manages VirtualFileSystem instance, handles tool call replay, tracks selected file
- `ChatProvider`: wraps Vercel AI SDK's `useChat`, sends serialized FS with each request

### Layout
Two-panel resizable layout: chat on the left, preview/code tabs on the right. Code view has a file tree + Monaco editor.

## Key Conventions

- Path alias: `@/*` maps to `./src/*`
- All virtual FS paths are absolute (start with `/`), e.g., `/App.jsx`, `/components/Button.jsx`
- The AI's system prompt requires a root `/App.jsx` as the entry point for generated apps
- UI components use shadcn/ui pattern in `src/components/ui/`
- Tailwind CSS v4 with `@tailwindcss/postcss`
