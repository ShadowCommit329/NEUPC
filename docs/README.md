# Documentation

Developer documentation for the NEUPC Platform.

> Start here if you're setting up locally, contributing, or learning the architecture.

---

## Getting Started

| Document | Description |
|---|---|
| [Setup Guide](getting-started/index.md) | Clone, install, configure, run locally, deploy to Vercel |
| [Environment Variables](getting-started/environment-variables.md) | Every env var with description, where to get it, and security notes |
| [Local Supabase](getting-started/local-supabase.md) | Run the full database stack locally with Docker |

---

## Architecture

| Document | Description |
|---|---|
| [Overview](architecture/index.md) | Core patterns, security model, data flow — read this first |
| [Project Structure](architecture/project-structure.md) | Full file tree with explanations |
| [Data Service](architecture/data-service.md) | How the centralized DB access layer works |
| [Server Actions](architecture/server-actions.md) | Mutation layer — auth, validation, sanitization patterns |
| [Components](architecture/components.md) | Shared component conventions and catalog |
| [API Routes](architecture/api-routes.md) | REST API endpoints reference |
| [Homepage Deep Dive](architecture/homepage-root-page.md) | Root page technical breakdown with diagrams |

---

## Database

| Document | Description |
|---|---|
| [Schema & Tables](database/index.md) | 45+ table catalogue, RLS policies, key relationships, useful SQL |

---

## Features

| Document | Description |
|---|---|
| [Feature Modules](product/features.md) | Every feature, which roles access it, which server actions power it |

---

## Browser Extension

| Document | Description |
|---|---|
| [Extension README](../browser-extension/README.md) | Installation for Chrome/Firefox, 41+ supported platforms, architecture |
