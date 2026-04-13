# Local Supabase Setup

Complete guide for running Supabase locally for development.

---

## Why Use Local Supabase?

| Benefit                  | Description                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| **Offline Development**  | Work without internet connection                                        |
| **Faster Iteration**     | No network latency, instant database changes                            |
| **Safe Experimentation** | Test migrations and RLS policies without affecting production           |
| **Full Feature Access**  | All Supabase features available locally (Auth, Storage, Edge Functions) |
| **Cost Savings**         | No API calls to remote Supabase during development                      |

---

## Prerequisites

| Requirement    | Version | Installation                                      |
| -------------- | ------- | ------------------------------------------------- |
| Docker         | Latest  | [docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | v2+     | Bundled with Docker Desktop                       |
| Node.js        | >= 20   | `node -v` to verify                               |
| Supabase CLI   | Latest  | See below                                         |

### Install Supabase CLI

```bash
# Using npm (recommended)
npm install -g supabase

# Or using Homebrew (macOS/Linux)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

---

## Quick Start

### 1. Start Local Supabase

```bash
# Navigate to project root
cd neupc

# Start all Supabase services (first run downloads Docker images ~2GB)
npx supabase start
```

This starts the following services:

| Service                 | Port  | URL                                                     |
| ----------------------- | ----- | ------------------------------------------------------- |
| **API Gateway**         | 54321 | http://127.0.0.1:54321                                  |
| **Database (Postgres)** | 54322 | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| **Studio (Dashboard)**  | 54323 | http://127.0.0.1:54323                                  |
| **Inbucket (Email)**    | 54324 | http://127.0.0.1:54324                                  |
| **Storage**             | 54321 | http://127.0.0.1:54321/storage/v1                       |
| **Auth**                | 54321 | http://127.0.0.1:54321/auth/v1                          |

### 2. Get Your API Keys

After `supabase start` completes, you'll see output like:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

You can also run `npx supabase status` anytime to see these values.

### 3. Configure Environment

Copy the keys to your `.env.local` file:

```bash
# Create .env.local from template
cp .env.example .env.local
```

Update the Supabase section in `.env.local`:

```env
# ── Local Supabase Configuration ──
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

### 4. Apply Migrations

```bash
# Apply all existing migrations to local database
npx supabase db reset

# This will:
# 1. Drop and recreate the database
# 2. Apply all migrations from supabase/migrations/
# 3. Run seed.sql to populate initial data
```

### 5. Start Development

```bash
npm run dev
```

Open http://localhost:3000 - your app is now connected to local Supabase!

---

## Local Supabase Commands

### Essential Commands

```bash
# Start all services
npx supabase start

# Stop all services (keeps data)
npx supabase stop

# Stop and remove all data
npx supabase stop --no-backup

# View service status and keys
npx supabase status

# View logs
npx supabase logs
```

### Database Commands

```bash
# Reset database (drop, migrate, seed)
npx supabase db reset

# Create new migration from local changes
npx supabase db diff -f <migration_name>

# Push local changes to remote (production)
npx supabase db push

# Pull remote schema to local
npx supabase db pull
```

### Migration Workflow

```bash
# 1. Make changes in Studio UI (http://127.0.0.1:54323)
# 2. Generate migration file
npx supabase db diff -f add_new_feature

# 3. Review the generated SQL
cat supabase/migrations/*_add_new_feature.sql

# 4. Test by resetting
npx supabase db reset

# 5. Commit the migration
git add supabase/migrations/
git commit -m "feat: add new feature migration"
```

---

## Accessing Local Services

### Supabase Studio (Database Dashboard)

Open http://127.0.0.1:54323 to access the full Supabase dashboard locally:

- **Table Editor**: View and edit data
- **SQL Editor**: Run queries directly
- **Auth Users**: Manage authentication
- **Storage**: Manage file buckets
- **Database**: View schema, run migrations

### Inbucket (Email Testing)

Open http://127.0.0.1:54324 to view all emails sent during local development:

- Password reset emails
- Email confirmations
- Magic link emails

Emails are captured locally and never actually sent.

### Direct Database Access

Connect with any PostgreSQL client:

```
Host: 127.0.0.1
Port: 54322
Database: postgres
User: postgres
Password: postgres
```

Or use the connection string:

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

---

## Syncing with Remote Supabase

### Pull Remote Schema

```bash
# Link to your remote project first
npx supabase link --project-ref <your-project-ref>

# Pull remote schema and create migration
npx supabase db pull
```

### Push to Remote

```bash
# Push local migrations to remote
npx supabase db push

# Dry run (see what would change)
npx supabase db push --dry-run
```

---

## Troubleshooting

### Docker Issues

| Problem                           | Solution                                                   |
| --------------------------------- | ---------------------------------------------------------- |
| "Cannot connect to Docker daemon" | Start Docker Desktop                                       |
| "Port already in use"             | Stop conflicting services or change ports in `config.toml` |
| "Image not found"                 | Run `docker pull supabase/postgres:15.1.0.147`             |

### Database Issues

| Problem                   | Solution                                        |
| ------------------------- | ----------------------------------------------- |
| "relation does not exist" | Run `npx supabase db reset` to apply migrations |
| Migration failed          | Check migration SQL for syntax errors           |
| Data not persisting       | Don't use `--no-backup` flag when stopping      |

### Connection Issues

| Problem                          | Solution                                       |
| -------------------------------- | ---------------------------------------------- |
| "Connection refused"             | Ensure `supabase start` completed successfully |
| "Invalid API key"                | Copy fresh keys from `npx supabase status`     |
| App shows "placeholder" warnings | Update `.env.local` with real keys             |

### Reset Everything

If something is broken, start fresh:

```bash
# Stop and remove all data
npx supabase stop --no-backup

# Remove Docker volumes (nuclear option)
docker volume prune

# Start fresh
npx supabase start
npx supabase db reset
```

---

## Switching Between Local and Remote

### Development (Local)

```env
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

### Production (Remote)

```env
# Comment out or remove SUPABASE_LOCAL
# SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<remote-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<remote-service-role-key>
```

The app automatically detects local vs remote based on the URL.

---

## Configuration Reference

The local Supabase configuration is in `supabase/config.toml`:

| Setting                   | Default               | Description        |
| ------------------------- | --------------------- | ------------------ |
| `project_id`              | neupc                 | Project identifier |
| `api.port`                | 54321                 | API Gateway port   |
| `db.port`                 | 54322                 | PostgreSQL port    |
| `studio.port`             | 54323                 | Dashboard port     |
| `inbucket.port`           | 54324                 | Email testing port |
| `auth.site_url`           | http://127.0.0.1:3000 | Redirect URL base  |
| `storage.file_size_limit` | 50MiB                 | Max upload size    |

Edit `config.toml` to customize ports or enable additional features.

---

## Next Steps

- [Environment Variables Reference](./environment-variables.md)
- [Database Schema Documentation](../database/index.md)
- [Architecture Overview](../architecture/index.md)
