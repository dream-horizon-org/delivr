# Database Migrations

This directory contains database migration scripts for schema changes.

## Migration Structure

Each migration file should:
- Export a `MigrationStep` object with `up`, `down`, and `description`
- Be named with timestamp and descriptive name: `YYYYMMDDHHMMSS-description.ts`
- Include proper rollback logic in the `down` method
- Be type-safe (no `any` types)

## Running Migrations

Migrations should be run manually using a migration runner script (to be created) or directly via MySQL client.

## Migration Order

Migrations are executed in chronological order based on timestamp prefix.

## Important Notes

- Always test migrations on a development database first
- Ensure rollback logic is tested
- Keep migrations small and focused
- Never modify existing migration files after they've been run in production
