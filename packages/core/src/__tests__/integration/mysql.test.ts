import { writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import type { DatabaseSchema } from '../../../types';

jest.mock('knex', () => {
  const mockRaw = jest.fn();
  const mockDestroy = jest.fn().mockResolvedValue(undefined);
  const factory = jest.fn(() => ({
    raw: mockRaw,
    destroy: mockDestroy,
  }));
  (factory as any).__mockRaw = mockRaw;
  (factory as any).__mockDestroy = mockDestroy;
  return factory;
});

// eslint-disable-next-line import/first
import knexFactory from 'knex';
// eslint-disable-next-line import/first
import { introspectDatabase } from '../../../introspect';

const mockRaw = (knexFactory as unknown as { __mockRaw: jest.Mock }).__mockRaw;
const mockDestroy = (knexFactory as unknown as { __mockDestroy: jest.Mock }).__mockDestroy;

describe('MySQL introspection integration (mocked)', () => {
  let tempDir: string;
  let knexfilePath: string;
  let schema: DatabaseSchema;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'knexbridge-mysql-'));
    knexfilePath = join(tempDir, 'knexfile.js');
    writeFileSync(
      knexfilePath,
      `module.exports = {\n  development: {\n    client: 'mysql2',\n    connection: { host: 'localhost' },\n  }\n};\n`,
    );

    mockRaw.mockImplementation((query: string) => {
      if (query.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [
          [
            {
              table_name: 'users',
              column_name: 'id',
              data_type: 'int',
              is_nullable: 'NO',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: 11,
              numeric_scale: 0,
              is_primary_key: 1,
              is_unique: 0,
              comment: 'Primary key',
              column_type: 'int(11)',
            },
            {
              table_name: 'users',
              column_name: 'is_admin',
              data_type: 'tinyint',
              is_nullable: 'NO',
              column_default: 0,
              character_maximum_length: null,
              numeric_precision: 3,
              numeric_scale: 0,
              is_primary_key: 0,
              is_unique: 0,
              comment: 'Admin flag',
              column_type: 'tinyint(1)',
            },
            {
              table_name: 'users',
              column_name: 'status',
              data_type: 'enum',
              is_nullable: 'NO',
              column_default: 'active',
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: 0,
              is_unique: 0,
              comment: 'User status',
              column_type: "enum('active','inactive')",
            },
            {
              table_name: 'posts',
              column_name: 'id',
              data_type: 'int',
              is_nullable: 'NO',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: 11,
              numeric_scale: 0,
              is_primary_key: 1,
              is_unique: 0,
              comment: 'Post id',
              column_type: 'int(11)',
            },
            {
              table_name: 'posts',
              column_name: 'user_id',
              data_type: 'int',
              is_nullable: 'NO',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: 11,
              numeric_scale: 0,
              is_primary_key: 0,
              is_unique: 0,
              comment: 'FK to users',
              column_type: 'int(11)',
            },
            {
              table_name: 'posts',
              column_name: 'published_at',
              data_type: 'datetime',
              is_nullable: 'YES',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: 0,
              is_unique: 0,
              comment: 'Publish time',
              column_type: 'datetime',
            },
          ],
        ];
      }

      if (query.includes('INFORMATION_SCHEMA.KEY_COLUMN_USAGE')) {
        return [
          [
            {
              table_name: 'posts',
              column_name: 'user_id',
              foreign_table_name: 'users',
              foreign_column_name: 'id',
              on_update: 'CASCADE',
              on_delete: 'SET NULL',
            },
          ],
        ];
      }

      return [[]];
    });

    schema = await introspectDatabase(knexfilePath, 'development', { schemaName: 'main' });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
    mockRaw.mockReset();
    mockDestroy.mockReset();
  });

  it('introspects MySQL tables', () => {
    expect(schema.tables.map(t => t.name).sort()).toEqual(['posts', 'users']);
  });

  it('captures TINYINT columns', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const isAdmin = users!.columns.find(c => c.name === 'is_admin');
    expect(isAdmin?.type).toBe('tinyint');
    expect(isAdmin?.nullable).toBe(false);
  });

  it('captures ENUM metadata', () => {
    const enums = schema.tables[0].enums;
    expect(enums?.get('users_status')).toEqual(['active', 'inactive']);
  });

  it('captures DATETIME columns', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    const published = posts!.columns.find(c => c.name === 'published_at');
    expect(published?.type).toBe('datetime');
  });

  it('detects foreign keys', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    expect(posts!.foreign_keys).toEqual([
      expect.objectContaining({ columnName: 'user_id', foreignTableName: 'users' }),
    ]);
  });

  it('preserves column comments', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const status = users!.columns.find(c => c.name === 'status');
    expect(status?.comment).toBe('User status');
  });

  it('captures numeric precision', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const id = users!.columns.find(c => c.name === 'id');
    expect(id?.precision).toBe(11);
  });

  it('allows includeTables filtering', async () => {
    const result = await introspectDatabase(knexfilePath, 'development', { includeTables: ['users'] });
    expect(result.tables).toHaveLength(1);
  });

  it('allows excludeTables filtering', async () => {
    const result = await introspectDatabase(knexfilePath, 'development', { excludeTables: ['posts'] });
    expect(result.tables.some(t => t.name === 'posts')).toBe(false);
  });

  it('marks primary keys correctly', () => {
    const posts = schema.tables.find(t => t.name === 'posts');
    const id = posts!.columns.find(c => c.name === 'id');
    expect(id?.isPrimaryKey).toBe(true);
  });

  it('calls destroy after introspection', () => {
    expect(mockDestroy).toHaveBeenCalled();
  });
});
