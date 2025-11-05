export const INTROSPECTION_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_WARNINGS_DISPLAY = 10;

export const DEFAULT_CONFIG: Partial<import('./types').KnexBridgeConfig> = {
  environment: 'development',
  outDir: './generated',
  generateTypes: true,
  generateZod: true,
  generateInsertTypes: true,
  generateUpdateTypes: true,
  dateStrategy: 'Date',
  useBigInt: false,
  namingStrategy: 'camel',
  tableNameFormat: 'singular',
  generateRelations: true,
  warnOnUnmappedTypes: true,
  schemaName: 'public',
};

export const TYPE_MAPPINGS: Record<string, string> = {
  // PostgreSQL
  'integer': 'number',
  'bigint': 'number',
  'smallint': 'number',
  'numeric': 'number',
  'decimal': 'number',
  'real': 'number',
  'double precision': 'number',
  'serial': 'number',
  'bigserial': 'number',
  'money': 'number',
  
  'character varying': 'string',
  'varchar': 'string',
  'character': 'string',
  'char': 'string',
  'text': 'string',
  'citext': 'string',
  
  'boolean': 'boolean',
  'bool': 'boolean',
  
  'date': 'Date',
  'timestamp': 'Date',
  'timestamp without time zone': 'Date',
  'timestamp with time zone': 'Date',
  'timestamptz': 'Date',
  'time': 'string',
  'time without time zone': 'string',
  'time with time zone': 'string',
  'interval': 'string',
  
  'json': 'unknown',
  'jsonb': 'unknown',
  'uuid': 'string',
  'xml': 'string',
  'bytea': 'Buffer',
  
  // MySQL
  'int': 'number',
  'tinyint': 'number',
  'mediumint': 'number',
  'float': 'number',
  'double': 'number',
  'datetime': 'Date',
  'longtext': 'string',
  'mediumtext': 'string',
  'tinytext': 'string',
  'blob': 'Buffer',
  'longblob': 'Buffer',
  'enum': 'string',
  
  // SQLite
  'INTEGER': 'number',
  'REAL': 'number',
  'TEXT': 'string',
  'BLOB': 'Buffer',
  'NUMERIC': 'number',
};