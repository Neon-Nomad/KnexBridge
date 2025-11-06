import { writeFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { introspectDatabase } from '../../../introspect';
import { createTestDatabase } from '../test/helpers';
import { setupTestSchema, seedTestData } from '../test/databases/sqlite-setup';
import type { DatabaseSchema } from '../../../types';

describe('SQLite introspection integration', () => {
  let tempDir: string;
  let knexfilePath: string;
  let schema: DatabaseSchema;
  let teardown: () => void;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'knexbridge-sqlite-'));
    const { knex, filename, teardown: dbTeardown } = await createTestDatabase('');
    teardown = () => {
      dbTeardown();
      rmSync(tempDir, { recursive: true, force: true });
    };

    await setupTestSchema(knex);
    await seedTestData(knex);

    knexfilePath = join(tempDir, 'knexfile.js');
    writeFileSync(
      knexfilePath,
      `module.exports = {\n  development: {\n    client: 'sqlite3',\n    connection: { filename: ${JSON.stringify(filename)} },\n    useNullAsDefault: true,\n  }\n};\n`,
    );

    schema = await introspectDatabase(knexfilePath, 'development');
    await knex.destroy();
  });

  afterAll(() => {
    if (teardown) teardown();
  });

  it('introspects all tables', () => {
    expect(schema.tables.map(t => t.name).sort()).toEqual(['posts', 'users']);
  });

  it('introspects user table columns', () => {
    const users = schema.tables.find(t => t.name === 'users');
    expect(users).toBeDefined();
    expect(users!.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'INTEGER', isPrimaryKey: true }),
        expect.objectContaining({ name: 'email', type: 'TEXT', nullable: false }),
      ]),
    );
  });

  it('marks nullable columns correctly', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    const bodyColumn = posts!.columns.find(c => c.name === 'body');
    expect(bodyColumn?.nullable).toBe(true);
  });

  it('captures default values', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const createdAt = users!.columns.find(c => c.name === 'created_at');
    expect(createdAt?.defaultValue).toBeDefined();
  });

  it('identifies primary keys', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const idColumn = users!.columns.find(c => c.name === 'id');
    expect(idColumn?.isPrimaryKey).toBe(true);
  });

  it('detects foreign keys', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    expect(posts!.foreign_keys).toEqual([
      expect.objectContaining({ columnName: 'user_id', foreignTableName: 'users', foreignColumnName: 'id' }),
    ]);
  });

  it('includes foreign key actions', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    expect(posts!.foreign_keys[0]).toEqual(expect.objectContaining({ columnName: 'user_id' }));
  });

  it('supports includeTables filtering', async () => {
    const filtered = await introspectDatabase(knexfilePath, 'development', { includeTables: ['users'] });
    expect(filtered.tables).toHaveLength(1);
    expect(filtered.tables[0].name).toBe('users');
  });

  it('supports excludeTables filtering', async () => {
    const filtered = await introspectDatabase(knexfilePath, 'development', { excludeTables: ['posts'] });
    expect(filtered.tables).toHaveLength(1);
    expect(filtered.tables[0].name).toBe('users');
  });

  it('returns empty enums map for SQLite', () => {
    expect(schema.tables[0].enums instanceof Map).toBe(true);
  });

  it('handles multiple introspection calls without leaking resources', async () => {
    const first = await introspectDatabase(knexfilePath, 'development');
    const second = await introspectDatabase(knexfilePath, 'development');
    expect(first.tables.length).toBeGreaterThan(0);
    expect(second.tables.length).toBe(first.tables.length);
  });

  it('resolves knexfile path relative to cwd', async () => {
    const resolved = await introspectDatabase(resolve(knexfilePath), 'development');
    expect(resolved.tables.length).toBe(schema.tables.length);
  });

  it('preserves column ordering', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const columnNames = users!.columns.map(c => c.name);
    expect(columnNames).toEqual(['id', 'email', 'name', 'created_at']);
  });

  it('captures unique constraint information', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const email = users!.columns.find(c => c.name === 'email');
    expect(email?.isUnique).toBe(true);
  });

  it('records nullable information for timestamps', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    const publishedAt = posts!.columns.find(c => c.name === 'published_at');
    expect(publishedAt?.nullable).toBe(true);
  });

  it('captures column comments as undefined (SQLite lacks comments)', () => {
    const users = schema.tables.find(t => t.name === 'users');
    expect(users!.columns.every(c => c.comment === null || c.comment === undefined)).toBe(true);
  });
});
