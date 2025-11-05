export type DatabaseClient = 'pg' | 'mysql' | 'mysql2' | 'sqlite3' | 'better-sqlite3' | 'mssql' | 'oracledb';

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isPrimaryKey: boolean;
  isUnique: boolean;
  comment?: string;
}

export interface ForeignKey {
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
  onUpdate?: string;
  onDelete?: string;
}

export interface Table {
  name: string;
  columns: Column[];
  foreign_keys: ForeignKey[];
  enums?: Map<string, string[]>;
}

export interface DatabaseSchema {
  tables: Table[];
}

export type DateStrategy = 'string' | 'Date' | 'number';
export type NamingStrategy = 'pascal' | 'camel' | 'snake' | 'preserve';
export type TableNameFormat = 'singular' | 'plural' | 'preserve';

export interface KnexBridgeConfig {
  environment: string;
  outDir: string;
  generateTypes: boolean;
  generateZod: boolean;
  generateInsertTypes: boolean;
  generateUpdateTypes: boolean;
  dateStrategy: DateStrategy;
  useBigInt: boolean;
  namingStrategy: NamingStrategy;
  tableNameFormat: TableNameFormat;
  generateRelations: boolean;
  warnOnUnmappedTypes: boolean;
  includeTables?: string[];
  excludeTables?: string[];
  schemaName?: string;
  excludeFromInsert?: string[];
  excludeFromUpdate?: string[];
  customTypeMappings?: Record<string, string>;
}

export interface GenerationResult {
  filesGenerated: string[];
  tablesProcessed: number;
  warnings: string[];
  metrics: {
    totalTime: number;
    filesWritten: number;
    typeGenerationTime?: number;
    zodGenerationTime?: number;
  };
}