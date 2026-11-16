import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { TABLE_COLUMNS, schemaChecks } from './database.types';
import { APP_STATUSES } from './status';

const OWN_USER = '11111111-1111-1111-1111-111111111111';
const OTHER_USER = '22222222-2222-2222-2222-222222222222';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../supabase/migrations');

const HARNESS = `
  create schema if not exists auth;
  create table auth.users (id uuid primary key);
  create role anon;
  create role authenticated;
  create role service_role;
  create function auth.uid() returns uuid language sql stable as $$
    select '${OWN_USER}'::uuid;
  $$;
`;

describe('initial migration', () => {
  const db = new PGlite();

  beforeAll(async () => {
    await db.exec(HARNESS);
    for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    }
  }, 30_000);

  it('keeps the TypeScript column map aligned with the enum', () => {
    expect(Object.values(schemaChecks).every(Boolean)).toBe(true);
    expect(schemaChecks.status).toBe(true);
  });

  it('creates the status enum in order', async () => {
    const result = await db.query<{ enumlabel: string }>(`
      select e.enumlabel
      from pg_type t
      join pg_enum e on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'app_status'
      order by e.enumsortorder
    `);
    expect(result.rows.map((row) => row.enumlabel)).toEqual([...APP_STATUSES]);
  });

  it('matches the generated column contract', async () => {
    const result = await db.query<{
      table_name: string;
      column_name: string;
      is_nullable: string;
      column_default: string | null;
      udt_name: string;
    }>(`
      select table_name, column_name, is_nullable, column_default, udt_name
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `);

    const actual = new Map<
      string,
      Map<string, { nullable: boolean; hasDefault: boolean; udt: string }>
    >();
    for (const row of result.rows) {
      const columns = actual.get(row.table_name) ?? new Map();
      columns.set(row.column_name, {
        nullable: row.is_nullable === 'YES',
        hasDefault: row.column_default !== null,
        udt: row.udt_name,
      });
      actual.set(row.table_name, columns);
    }

    expect([...actual.keys()].sort()).toEqual(Object.keys(TABLE_COLUMNS).sort());
    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      const found = actual.get(table);
      expect(found?.size).toBe(Object.keys(columns).length);
      for (const [column, expected] of Object.entries(columns)) {
        expect(found?.get(column), `${table}.${column}`).toEqual(expected);
      }
    }
  });

  it('enables RLS and limits every command to the signed-in user', async () => {
    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where nspname = 'public' and relkind = 'r'
    `);
    expect(tables.rows).toHaveLength(5);
    expect(tables.rows.every((row) => row.relrowsecurity)).toBe(true);

    const policies = await db.query<{
      tablename: string;
      cmd: string;
      qual: string | null;
      with_check: string | null;
    }>(`
      select tablename, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
    `);
    expect(policies.rows).toHaveLength(20);
    for (const policy of policies.rows) {
      const expression = `${policy.qual ?? ''} ${policy.with_check ?? ''}`;
      expect(expression).toContain('auth.uid() = user_id');
    }
  });

  it('indexes applications and keeps the email and answer uniqueness rules', async () => {
    const indexes = await db.query<{ indexname: string }>(`
      select indexname from pg_indexes where schemaname = 'public'
    `);
    const names = indexes.rows.map((row) => row.indexname);
    expect(names).toContain('applications_user_id_status_idx');
    expect(names).toContain('applications_user_id_company_domain_idx');

    const constraints = await db.query<{ def: string }>(`
      select pg_get_constraintdef(oid) as def
      from pg_constraint
      where connamespace = 'public'::regnamespace
    `);
    const defs = constraints.rows.map((row) => row.def);
    expect(defs).toContain('UNIQUE (user_id, gmail_message_id)');
    expect(defs).toContain('UNIQUE (user_id, question_normalized)');
    expect(defs).toContain(
      'FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL',
    );
  });

  it('lets the signed-in user read and write only their own application', async () => {
    await db.exec(`
      insert into auth.users (id) values ('${OWN_USER}'), ('${OTHER_USER}');
      insert into applications (user_id, company, role) values
        ('${OWN_USER}', 'Acme', 'Engineer'),
        ('${OTHER_USER}', 'Other', 'Designer');
    `);

    await db.exec('set role authenticated');
    const visible = await db.query<{ company: string }>(
      'select company from applications order by company',
    );
    expect(visible.rows.map((row) => row.company)).toEqual(['Acme']);

    await expect(
      db.query(
        `insert into applications (user_id, company, role) values ('${OTHER_USER}', 'Nope', 'Intern')`,
      ),
    ).rejects.toThrow();

    await db.exec('reset role');
  });
});
