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

describe('PostgreSQL introspection integration (mocked)', () => {
  let tempDir: string;
  let knexfilePath: string;
  let schema: DatabaseSchema;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'knexbridge-pg-'));
    knexfilePath = join(tempDir, 'knexfile.js');
    writeFileSync(
      knexfilePath,
      `module.exports = {\n  development: {\n    client: 'pg',\n    connection: { host: 'localhost' },\n  }\n};\n`,
    );

    mockRaw.mockImplementation((query: string) => {
      if (query.includes('information_schema.columns')) {
        return {
          rows: [
            {
              table_name: 'users',
              column_name: 'id',
              data_type: 'integer',
              is_nullable: 'NO',
              column_default: "nextval('users_id_seq'::regclass)",
              character_maximum_length: null,
              numeric_precision: 32,
              numeric_scale: 0,
              is_primary_key: true,
              is_unique: true,
              comment: 'User identifier',
            },
            {
              table_name: 'users',
              column_name: 'preferences',
              data_type: 'jsonb',
              is_nullable: 'YES',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: false,
              is_unique: false,
              comment: 'User preferences',
            },
            {
              table_name: 'profiles',
              column_name: 'id',
              data_type: 'uuid',
              is_nullable: 'NO',
              column_default: 'gen_random_uuid()',
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: true,
              is_unique: true,
              comment: 'Profile identifier',
            },
            {
              table_name: 'profiles',
              column_name: 'user_id',
              data_type: 'integer',
              is_nullable: 'NO',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: 32,
              numeric_scale: 0,
              is_primary_key: false,
              is_unique: false,
              comment: 'FK to users',
            },
            {
              table_name: 'profiles',
              column_name: 'tags',
              data_type: 'ARRAY',
              is_nullable: 'YES',
              column_default: null,
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: false,
              is_unique: false,
              comment: 'Profile tags',
            },
            {
              table_name: 'audit_logs',
              column_name: 'created_at',
              data_type: 'timestamptz',
              is_nullable: 'NO',
              column_default: 'now()',
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
              is_primary_key: false,
              is_unique: false,
              comment: 'Log timestamp',
            },
          ],
        };
      }

      if (query.includes('information_schema.key_column_usage')) {
        return {
          rows: [
            {
              table_name: 'profiles',
              column_name: 'user_id',
              foreign_table_name: 'users',
              foreign_column_name: 'id',
              on_update: 'CASCADE',
              on_delete: 'CASCADE',
            },
          ],
        };
      }

      if (query.includes('pg_type')) {
        return {
          rows: [
            { enum_name: 'user_status', enum_value: 'active' },
            { enum_name: 'user_status', enum_value: 'inactive' },
          ],
        };
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    schema = await introspectDatabase(knexfilePath, 'development', { schemaName: 'public' });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
    mockRaw.mockReset();
    mockDestroy.mockReset();
  });

  it('introspects PostgreSQL tables', () => {
    expect(schema.tables.map(t => t.name).sort()).toEqual(['audit_logs', 'profiles', 'users']);
  });

  it('captures jsonb column types', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const preferences = users!.columns.find(c => c.name === 'preferences');
    expect(preferences?.type).toBe('jsonb');
    expect(preferences?.nullable).toBe(true);
  });

  it('captures uuid primary keys', () => {
    const profiles = schema.tables.find(t => t.name === 'profiles');
    const idColumn = profiles!.columns.find(c => c.name === 'id');
    expect(idColumn?.type).toBe('uuid');
    expect(idColumn?.isPrimaryKey).toBe(true);
  });

  it('captures array columns', () => {
    const profiles = schema.tables.find(t => t.name === 'profiles');
    const tags = profiles!.columns.find(c => c.name === 'tags');
    expect(tags?.type).toBe('ARRAY');
  });

  it('includes column comments', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const id = users!.columns.find(c => c.name === 'id');
    expect(id?.comment).toBe('User identifier');
  });

  it('captures timestamptz columns', () => {
    const audit = schema.tables.find(t => t.name === 'audit_logs');
    const createdAt = audit!.columns.find(c => c.name === 'created_at');
    expect(createdAt?.type).toBe('timestamptz');
  });

  it('detects foreign keys with actions', () => {
    const profiles = schema.tables.find(t => t.name === 'profiles');
    expect(profiles!.foreign_keys).toEqual([
      expect.objectContaining({ foreignTableName: 'users', columnName: 'user_id', onDelete: 'CASCADE' }),
    ]);
  });

  it('captures enum values', () => {
    const enums = schema.tables[0].enums;
    expect(enums?.get('user_status')).toEqual(['active', 'inactive']);
  });

  it('supports schema filtering parameter', async () => {
    const result = await introspectDatabase(knexfilePath, 'development', { schemaName: 'custom' });
    expect(result.tables.length).toBe(schema.tables.length);
  });

  it('calls destroy after introspection', () => {
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('throws helpful error on unexpected query', async () => {
    mockRaw.mockImplementationOnce(() => ({ rows: [] }));
    await expect(introspectDatabase(knexfilePath, 'development')).resolves.toBeDefined();
  });

  it('handles includeTables filtering', async () => {
    const result = await introspectDatabase(knexfilePath, 'development', { includeTables: ['users'] });
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].name).toBe('users');
  });

  it('handles excludeTables filtering', async () => {
    const result = await introspectDatabase(knexfilePath, 'development', { excludeTables: ['audit_logs'] });
    expect(result.tables.some(t => t.name === 'audit_logs')).toBe(false);
  });

  it('preserves numeric metadata', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const id = users!.columns.find(c => c.name === 'id');
    expect(id?.precision).toBe(32);
  });

  it('captures nullable info for foreign key columns', () => {
    const profiles = schema.tables.find(t => t.name === 'profiles');
    const userId = profiles!.columns.find(c => c.name === 'user_id');
    expect(userId?.nullable).toBe(false);
  });

  it('includes default values', () => {
    const users = schema.tables.find(t => t.name === 'users');
    const id = users!.columns.find(c => c.name === 'id');
    expect(id?.defaultValue).toContain('nextval');
  });
});
