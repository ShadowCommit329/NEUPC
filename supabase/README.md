# Supabase

Local Supabase configuration and database migrations for the NEUPC platform.

---

## Directory Structure

```
supabase/
├── config.toml      # Local Supabase CLI configuration
├── migrations/      # SQL migration files (source of truth)
│   └── *.sql        # Timestamped migration files
├── .gitignore       # Ignores local CLI state files
└── README.md        # This file
```

---

## Prerequisites

| Requirement  | Installation                     |
| ------------ | -------------------------------- |
| Docker       | [docker.com](https://docker.com) |
| Supabase CLI | `npm install -g supabase`        |

---

## Quick Start

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Apply migrations and view status
npx supabase db reset

# Stop Supabase (preserves data)
npx supabase stop
```

After starting, you'll have access to:

| Service  | URL                                                     |
| -------- | ------------------------------------------------------- |
| API      | http://127.0.0.1:54321                                  |
| Studio   | http://127.0.0.1:54323                                  |
| Inbucket | http://127.0.0.1:54324                                  |
| Database | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## CLI Commands

### Service Management

```bash
npx supabase start              # Start all services
npx supabase stop               # Stop (keeps data)
npx supabase stop --no-backup   # Stop and delete data
npx supabase status             # View URLs and API keys
```

### Database Operations

```bash
npx supabase db reset           # Drop, migrate, and seed
npx supabase db push            # Push migrations to remote
npx supabase db pull            # Pull remote schema
npx supabase db dump --local    # Export current schema
```

### Migration Workflow

```bash
# 1. Make changes in Studio (http://127.0.0.1:54323)

# 2. Generate migration from changes
npx supabase db diff -f <name>

# 3. Review generated SQL
cat migrations/*_<name>.sql

# 4. Test migration
npx supabase db reset

# 5. Commit and push
git add migrations/
git commit -m "feat(db): add <description>"
npx supabase db push  # Push to remote
```

### Remote Connection

```bash
# Link to remote project
npx supabase link --project-ref <ref>

# Push local migrations to remote
npx supabase db push

# Pull remote changes
npx supabase db pull
```

---

## Configuration

### config.toml

Key settings in `config.toml`:

| Setting                   | Value                   | Description        |
| ------------------------- | ----------------------- | ------------------ |
| `project_id`              | `neupc`                 | Project identifier |
| `api.port`                | `54321`                 | REST API port      |
| `db.port`                 | `54322`                 | PostgreSQL port    |
| `db.major_version`        | `17`                    | PostgreSQL version |
| `studio.port`             | `54323`                 | Dashboard port     |
| `inbucket.port`           | `54324`                 | Email testing port |
| `auth.site_url`           | `http://127.0.0.1:3000` | App redirect URL   |
| `storage.file_size_limit` | `50MiB`                 | Max upload size    |
| `db.seed.enabled`         | `false`                 | Seeding disabled   |

### Environment Variables

Copy API keys from `npx supabase status` to `.env.local`:

```env
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

---

## Migrations

> Migrations are not tracked in this repository. Schema is applied directly to the Supabase cloud project. Use `npx supabase db pull` to generate a local snapshot if needed.

### Creating New Migrations

1. **Make changes** in Supabase Studio (Table Editor, SQL Editor)
2. **Generate migration**: `npx supabase db diff -f descriptive_name`
3. **Review** the generated SQL file
4. **Test** with `npx supabase db reset`
5. **Commit** the migration file

### Migration Best Practices

- Use descriptive names: `add_user_badges`, `create_sync_jobs_table`
- One logical change per migration
- Always test with `db reset` before pushing
- Never modify existing migrations after they're pushed

---

## Troubleshooting

| Issue               | Solution                          |
| ------------------- | --------------------------------- |
| Docker not running  | Start Docker Desktop              |
| Port already in use | Change ports in `config.toml`     |
| Migration failed    | Check SQL syntax, run `db reset`  |
| Connection refused  | Ensure `supabase start` completed |
| Stale data          | Run `npx supabase db reset`       |

### Reset Everything

```bash
npx supabase stop --no-backup
docker volume prune
npx supabase start
npx supabase db reset
```

---

## Related Documentation

- [Database Schema](../docs/database/index.md) — Table catalogue and relationships
- [Local Supabase Setup](../docs/getting-started/local-supabase.md) — Detailed setup guide
- [Supabase Docs](https://supabase.com/docs/guides/cli) — Official CLI documentation
