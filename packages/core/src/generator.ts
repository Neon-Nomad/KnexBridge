import { Table, Column, ForeignKey, KnexBridgeConfig } from './types';
import { TYPE_MAPPINGS, DEFAULT_CONFIG } from './constants';
import pluralize from 'pluralize';

/**
 * Convert database column type to TypeScript type
 */
export function mapDatabaseTypeToTS(
  dbType: string,
  config: Partial<KnexBridgeConfig> = {}
): { tsType: string; warning?: string } {
  const normalized = dbType.toLowerCase().trim();
  
  // Check custom mappings first
  if (config.customTypeMappings && config.customTypeMappings[normalized]) {
    return { tsType: config.customTypeMappings[normalized] };
  }

  // Handle date types based on strategy
  const dateTypes = ['date', 'timestamp', 'datetime', 'timestamp without time zone', 'timestamp with time zone', 'timestamptz'];
  if (dateTypes.includes(normalized)) {
    const strategy = config.dateStrategy || DEFAULT_CONFIG.dateStrategy;
    if (strategy === 'string') return { tsType: 'string' };
    if (strategy === 'number') return { tsType: 'number' };
    return { tsType: 'Date' };
  }

  // Handle bigint based on config
  if (normalized === 'bigint' && config.useBigInt) {
    return { tsType: 'bigint' };
  }

  // Standard mappings
  const mapped = TYPE_MAPPINGS[normalized];
  if (mapped) {
    return { tsType: mapped };
  }

  // Fallback to unknown with warning
  return {
    tsType: 'unknown',
    warning: `Unmapped database type: "${dbType}" - defaulting to "unknown"`,
  };
}

/**
 * Convert table/column names based on naming strategy
 */
export function convertName(name: string, strategy: string): string {
  switch (strategy) {
    case 'pascal':
      return toPascalCase(name);
    case 'camel':
      return toCamelCase(name);
    case 'snake':
      return toSnakeCase(name);
    case 'preserve':
    default:
      return name;
  }
}

/**
 * Convert table names based on format strategy
 */
export function convertTableName(name: string, format: string): string {
  switch (format) {
    case 'singular':
      return pluralize.singular(name);
    case 'plural':
      return pluralize.plural(name);
    case 'preserve':
    default:
      return name;
  }
}

function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Generate TypeScript interface for a table
 */
export function generateTypeInterface(
  table: Table,
  config: Partial<KnexBridgeConfig> = {}
): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  const namingStrategy = config.namingStrategy || DEFAULT_CONFIG.namingStrategy!;
  const tableFormat = config.tableNameFormat || DEFAULT_CONFIG.tableNameFormat!;
  
  const tableName = convertTableName(table.name, tableFormat);
  const interfaceName = convertName(tableName, namingStrategy);
  
  let code = `export interface ${interfaceName} {\n`;

  for (const col of table.columns) {
    const { tsType, warning } = mapDatabaseTypeToTS(col.type, config);
    
    if (warning && config.warnOnUnmappedTypes) {
      warnings.push(`${table.name}.${col.name}: ${warning}`);
    }

    const fieldName = convertName(col.name, namingStrategy);
    const optional = col.nullable ? '?' : '';
    const comment = col.comment ? `  /** ${col.comment} */\n` : '';
    
    code += `${comment}  ${fieldName}${optional}: ${tsType};\n`;
  }

  code += '}\n';

  return { code, warnings };
}

/**
 * Generate Zod schema for a table
 */
export function generateZodSchema(
  table: Table,
  config: Partial<KnexBridgeConfig> = {}
): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  const namingStrategy = config.namingStrategy || DEFAULT_CONFIG.namingStrategy!;
  const tableFormat = config.tableNameFormat || DEFAULT_CONFIG.tableNameFormat!;
  
  const tableName = convertTableName(table.name, tableFormat);
  const typeName = convertName(tableName, namingStrategy);
  const schemaName = `${typeName}Schema`;
  
  let code = `export const ${schemaName} = z.object({\n`;

  for (const col of table.columns) {
    const { tsType, warning } = mapDatabaseTypeToTS(col.type, config);
    
    if (warning && config.warnOnUnmappedTypes) {
      warnings.push(`${table.name}.${col.name}: ${warning}`);
    }

    const fieldName = convertName(col.name, namingStrategy);
    let zodType = mapTSTypeToZod(tsType);
    
    if (col.nullable) {
      zodType += '.nullable()';
    }
    
    if (col.defaultValue !== null && col.defaultValue !== undefined) {
      zodType += '.optional()';
    }

    code += `  ${fieldName}: ${zodType},\n`;
  }

  code += '});\n';

  return { code, warnings };
}

/**
 * Map TypeScript type to Zod validator
 */
function mapTSTypeToZod(tsType: string): string {
  switch (tsType) {
    case 'string':
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'Date':
      return 'z.date()';
    case 'bigint':
      return 'z.bigint()';
    case 'Buffer':
      return 'z.instanceof(Buffer)';
    case 'unknown':
    default:
      return 'z.unknown()';
  }
}

/**
 * Generate Insert and Update types
 */
export function generateInsertUpdateTypes(
  table: Table,
  config: Partial<KnexBridgeConfig> = {}
): string {
  const namingStrategy = config.namingStrategy || DEFAULT_CONFIG.namingStrategy!;
  const tableFormat = config.tableNameFormat || DEFAULT_CONFIG.tableNameFormat!;
  const excludeFromInsert = config.excludeFromInsert || ['id', 'created_at', 'updated_at'];
  const excludeFromUpdate = config.excludeFromUpdate || ['id', 'created_at'];
  
  const tableName = convertTableName(table.name, tableFormat);
  const typeName = convertName(tableName, namingStrategy);
  
  let code = '';

  // Insert type
  if (config.generateInsertTypes) {
    const insertFields = table.columns
      .filter(col => !excludeFromInsert.includes(col.name))
      .map(col => convertName(col.name, namingStrategy));
    
    code += `export type ${typeName}Insert = Pick<${typeName}, ${insertFields.map(f => `'${f}'`).join(' | ')}>;\n`;
  }

  // Update type
  if (config.generateUpdateTypes) {
    const updateFields = table.columns
      .filter(col => !excludeFromUpdate.includes(col.name))
      .map(col => convertName(col.name, namingStrategy));
    
    code += `export type ${typeName}Update = Partial<Pick<${typeName}, ${updateFields.map(f => `'${f}'`).join(' | ')}>>;\n`;
  }

  return code;
}

/**
 * Generate relationship types
 */
export function generateRelationTypes(
  table: Table,
  allTables: Table[],
  config: Partial<KnexBridgeConfig> = {}
): string {
  if (!config.generateRelations || table.foreign_keys.length === 0) {
    return '';
  }

  const namingStrategy = config.namingStrategy || DEFAULT_CONFIG.namingStrategy!;
  const tableFormat = config.tableNameFormat || DEFAULT_CONFIG.tableNameFormat!;
  
  const tableName = convertTableName(table.name, tableFormat);
  const typeName = convertName(tableName, namingStrategy);
  
  let code = `\nexport interface ${typeName}Relations extends ${typeName} {\n`;

  for (const fk of table.foreign_keys) {
    const relatedTableName = convertTableName(fk.foreignTableName, tableFormat);
    const relatedTypeName = convertName(relatedTableName, namingStrategy);
    const fieldName = convertName(fk.columnName.replace(/_id$/, ''), namingStrategy);
    
    code += `  ${fieldName}?: ${relatedTypeName};\n`;
  }

  code += '}\n';

  return code;
}