import Knex from 'knex';
import { DatabaseSchema, Table, Column, ForeignKey, DatabaseClient } from './types';
import { IntrospectionError } from './errors';
import { INTROSPECTION_TIMEOUT_MS } from './constants';
import { resolve } from 'path';

/**
 * Introspects a database and returns its schema with foreign keys
 */
export async function introspectDatabase(
  knexfilePath: string,
  environment: string = 'development',
  options: {
    includeTables?: string[];
    excludeTables?: string[];
    schemaName?: string;
  } = {}
): Promise<DatabaseSchema> {
  const absolutePath = resolve(knexfilePath);
  
  let knexConfig: any;
  try {
    knexConfig = require(absolutePath);
  } catch (error) {
    throw new IntrospectionError(
      `Failed to load knexfile at ${absolutePath}: ${(error as Error).message}`,
      { knexfilePath: absolutePath, environment },
      error as Error
    );
  }

  const config = knexConfig[environment];
  if (!config) {
    const availableEnvs = Object.keys(knexConfig).join(', ');
    throw new IntrospectionError(
      `Environment "${environment}" not found in knexfile.\nAvailable environments: ${availableEnvs}`,
      { environment, availableEnvs }
    );
  }

  const knex = Knex(config);
  
  // Set up timeout warning
  const timeout = setTimeout(() => {
    console.warn('⚠️  Database introspection taking longer than expected...');
  }, INTROSPECTION_TIMEOUT_MS);

  try {
    const client = (config.client as string).toLowerCase() as DatabaseClient;
    const schemaName = options.schemaName || 'public';
    
    const { columns, foreignKeys, enums } = await querySchemaInfo(knex, client, schemaName);
    
    // Filter tables
    let tables = groupByTable(columns, foreignKeys, enums);
    
    if (options.includeTables && options.includeTables.length > 0) {
      tables = tables.filter(t => options.includeTables!.includes(t.name));
    }
    
    if (options.excludeTables && options.excludeTables.length > 0) {
      tables = tables.filter(t => !options.excludeTables!.includes(t.name));
    }

    return { tables };
  } catch (error) {
    if (error instanceof IntrospectionError) {
      throw error;
    }
    throw new IntrospectionError(
      `Failed to introspect database: ${(error as Error).message}`,
      { client: config.client, environment },
      error as Error
    );
  } finally {
    clearTimeout(timeout);
    await knex.destroy();
  }
}

/**
 * Query schema information based on database client
 */
async function querySchemaInfo(
  knex: Knex.Knex,
  client: DatabaseClient,
  schemaName: string
): Promise<{
  columns: any[];
  foreignKeys: any[];
  enums: Map<string, string[]>;
}> {
  switch (client) {
    case 'pg':
      return queryPostgresSchema(knex, schemaName);
    case 'mysql':
    case 'mysql2':
      return queryMySQLSchema(knex, schemaName);
    case 'sqlite3':
    case 'better-sqlite3':
      return querySQLiteSchema(knex);
    default:
      throw new IntrospectionError(
        `Unsupported database client: ${client}`,
        { client }
      );
  }
}

/**
 * Query PostgreSQL schema with foreign keys
 */
async function queryPostgresSchema(
  knex: Knex.Knex,
  schemaName: string
): Promise<{
  columns: any[];
  foreignKeys: any[];
  enums: Map<string, string[]>;
}> {
  const columns = await knex.raw(`
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
      CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique,
      pgd.description as comment
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = ?
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = ?
    ) uq ON c.table_name = uq.table_name AND c.column_name = uq.column_name
    LEFT JOIN pg_catalog.pg_statio_all_tables st ON c.table_name = st.relname AND st.schemaname = ?
    LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid
    WHERE c.table_schema = ?
    ORDER BY c.table_name, c.ordinal_position
  `, [schemaName, schemaName, schemaName, schemaName]);

  const foreignKeys = await knex.raw(`
    SELECT
      kcu.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule as on_update,
      rc.delete_rule as on_delete
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc
      ON kcu.constraint_name = rc.constraint_name
      AND kcu.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.table_schema
    WHERE kcu.table_schema = ?
    ORDER BY kcu.table_name, kcu.ordinal_position
  `, [schemaName]);

  // Query enum types
  const enumsResult = await knex.raw(`
    SELECT 
      t.typname as enum_name,
      e.enumlabel as enum_value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = ?
    ORDER BY t.typname, e.enumsortorder
  `, [schemaName]);

  const enums = new Map<string, string[]>();
  enumsResult.rows.forEach((row: any) => {
    if (!enums.has(row.enum_name)) {
      enums.set(row.enum_name, []);
    }
    enums.get(row.enum_name)!.push(row.enum_value);
  });

  return {
    columns: columns.rows,
    foreignKeys: foreignKeys.rows,
    enums,
  };
}

/**
 * Query MySQL schema with foreign keys
 */
async function queryMySQLSchema(
  knex: Knex.Knex,
  schemaName: string
): Promise<{
  columns: any[];
  foreignKeys: any[];
  enums: Map<string, string[]>;
}> {
  const columns = await knex.raw(`
    SELECT 
      c.TABLE_NAME as table_name,
      c.COLUMN_NAME as column_name,
      c.DATA_TYPE as data_type,
      c.IS_NULLABLE as is_nullable,
      c.COLUMN_DEFAULT as column_default,
      c.CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
      c.NUMERIC_PRECISION as numeric_precision,
      c.NUMERIC_SCALE as numeric_scale,
      CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as is_primary_key,
      CASE WHEN c.COLUMN_KEY = 'UNI' THEN 1 ELSE 0 END as is_unique,
      c.COLUMN_COMMENT as comment,
      c.COLUMN_TYPE as column_type
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = ?
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `, [schemaName]);

  const foreignKeys = await knex.raw(`
    SELECT 
      kcu.TABLE_NAME as table_name,
      kcu.COLUMN_NAME as column_name,
      kcu.REFERENCED_TABLE_NAME as foreign_table_name,
      kcu.REFERENCED_COLUMN_NAME as foreign_column_name,
      rc.UPDATE_RULE as on_update,
      rc.DELETE_RULE as on_delete
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
    WHERE kcu.TABLE_SCHEMA = ?
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION
  `, [schemaName]);

  // Parse MySQL ENUM types
  const enums = new Map<string, string[]>();
  columns[0].forEach((col: any) => {
    if (col.data_type === 'enum' && col.column_type) {
      const match = col.column_type.match(/enum\((.*)\)/i);
      if (match) {
        const values = match[1]
          .split(',')
          .map((v: string) => v.trim().replace(/^'|'$/g, ''));
        enums.set(`${col.table_name}_${col.column_name}`, values);
      }
    }
  });

  return {
    columns: columns[0],
    foreignKeys: foreignKeys[0],
    enums,
  };
}

/**
 * Query SQLite schema with foreign keys (FIXED)
 */
async function querySQLiteSchema(knex: Knex.Knex): Promise<{
  columns: any[];
  foreignKeys: any[];
  enums: Map<string, string[]>;
}> {
  const tablesResult = await knex.raw(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  const tables = tablesResult;
  const allColumns: any[] = [];
  const allForeignKeys: any[] = [];

  for (const table of tables) {
    // ✅ FIXED: Use parameterized query
    const columnsResult = await knex.raw('PRAGMA table_info(?)', [table.name]);
    
    for (const col of columnsResult) {
      allColumns.push({
        table_name: table.name,
        column_name: col.name,
        data_type: parseSQLiteType(col.type),
        is_nullable: col.notnull === 0,
        column_default: col.dflt_value,
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
        is_primary_key: col.pk === 1,
        is_unique: false,
        comment: null
      });
    }

    // ✅ FIXED: Use parameterized query
    const fkResult = await knex.raw('PRAGMA foreign_key_list(?)', [table.name]);
    
    for (const fk of fkResult) {
      allForeignKeys.push({
        table_name: table.name,
        column_name: fk.from,
        foreign_table_name: fk.table,
        foreign_column_name: fk.to,
        on_update: fk.on_update,
        on_delete: fk.on_delete
      });
    }
  }

  return {
    columns: allColumns,
    foreignKeys: allForeignKeys,
    enums: new Map()
  };
}

/**
 * Parse SQLite type string
 */
function parseSQLiteType(type: string): string {
  const upper = type.toUpperCase();
  if (upper.includes('INT')) return 'INTEGER';
  if (upper.includes('CHAR') || upper.includes('CLOB') || upper.includes('TEXT')) return 'TEXT';
  if (upper.includes('BLOB')) return 'BLOB';
  if (upper.includes('REAL') || upper.includes('FLOA') || upper.includes('DOUB')) return 'REAL';
  return 'NUMERIC';
}

/**
 * Group columns and foreign keys by table
 */
function groupByTable(
  columns: any[],
  foreignKeys: any[],
  enums: Map<string, string[]>
): Table[] {
  const tableMap = new Map<string, Table>();

  // Group columns
  for (const col of columns) {
    const tableName = col.table_name;
    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, {
        name: tableName,
        columns: [],
        foreign_keys: [],
        enums,
      });
    }

    const column: Column = {
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES' || col.is_nullable === true || col.is_nullable === 1,
      defaultValue: col.column_default,
      maxLength: col.character_maximum_length,
      precision: col.numeric_precision,
      scale: col.numeric_scale,
      isPrimaryKey: col.is_primary_key === true || col.is_primary_key === 1,
      isUnique: col.is_unique === true || col.is_unique === 1,
      comment: col.comment,
    };

    tableMap.get(tableName)!.columns.push(column);
  }

  // Group foreign keys
  for (const fk of foreignKeys) {
    const tableName = fk.table_name;
    if (tableMap.has(tableName)) {
      const foreignKey: ForeignKey = {
        columnName: fk.column_name,
        foreignTableName: fk.foreign_table_name,
        foreignColumnName: fk.foreign_column_name,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete,
      };

      tableMap.get(tableName)!.foreign_keys.push(foreignKey);
    }
  }

  return Array.from(tableMap.values());
}