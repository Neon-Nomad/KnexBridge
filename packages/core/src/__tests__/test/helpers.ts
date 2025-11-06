import { Column, Table, KnexBridgeConfig } from '../../../types';
import { DEFAULT_CONFIG } from '../../../constants';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import knex, { Knex } from 'knex';

/**
 * Helper to create a mock column with sensible defaults.
 */
export function createMockColumn(overrides: Partial<Column> = {}): Column {
  return {
    name: 'id',
    type: 'integer',
    nullable: false,
    defaultValue: undefined,
    maxLength: undefined,
    precision: undefined,
    scale: undefined,
    isPrimaryKey: true,
    isUnique: true,
    comment: undefined,
    ...overrides,
  };
}

/**
 * Helper to create a mock table for generator unit tests.
 */
export function createMockTable(overrides: Partial<Table> = {}): Table {
  return {
    name: 'users',
    columns: [createMockColumn()],
    foreign_keys: [],
    enums: new Map(),
    ...overrides,
  };
}

/**
 * Normalize generated code by removing redundant whitespace. This makes string
 * comparisons resilient to formatting differences.
 */
export function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Create a temporary sqlite database for integration/e2e tests. Returns both
 * the knex instance and a teardown callback that removes the temporary folder.
 */
export async function createTestDatabase(schemaSql: string): Promise<{
  knex: Knex;
  filename: string;
  teardown: () => void;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'knexbridge-test-'));
  const filename = join(dir, 'db.sqlite');
  const db = knex({
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
  });

  await db.raw('PRAGMA foreign_keys = ON');
  if (schemaSql.trim()) {
    await db.raw(schemaSql);
  }

  return {
    knex: db,
    filename,
    teardown: () => {
      db.destroy();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Deeply merge user config with defaults so tests can focus on the override
 * behaviour they care about.
 */
export function mergeConfig(config: Partial<KnexBridgeConfig> = {}): KnexBridgeConfig {
  return { ...DEFAULT_CONFIG, ...config } as KnexBridgeConfig;
}
