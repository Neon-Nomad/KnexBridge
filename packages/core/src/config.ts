import { DEFAULT_CONFIG } from './constants';
import { KnexBridgeConfig, DateStrategy, NamingStrategy, TableNameFormat } from './types';

const DATE_STRATEGIES: DateStrategy[] = ['string', 'Date', 'number'];
const NAMING_STRATEGIES: NamingStrategy[] = ['camel', 'pascal', 'snake', 'preserve'];
const TABLE_FORMATS: TableNameFormat[] = ['singular', 'plural', 'preserve'];

export function validateConfig(config: Partial<KnexBridgeConfig> = {}): KnexBridgeConfig {
  const errors: string[] = [];

  if (config.dateStrategy && !DATE_STRATEGIES.includes(config.dateStrategy)) {
    errors.push(`Unsupported date strategy "${config.dateStrategy}".`);
  }

  if (config.namingStrategy && !NAMING_STRATEGIES.includes(config.namingStrategy)) {
    errors.push(`Unsupported naming strategy "${config.namingStrategy}".`);
  }

  if (config.tableNameFormat && !TABLE_FORMATS.includes(config.tableNameFormat)) {
    errors.push(`Unsupported table name format "${config.tableNameFormat}".`);
  }

  if (config.schemaName && !/^[_a-zA-Z][_a-zA-Z0-9$]*$/.test(config.schemaName)) {
    errors.push(`Invalid schema name "${config.schemaName}".`);
  }

  if (config.includeTables && config.excludeTables) {
    const overlap = config.includeTables.filter(table => config.excludeTables!.includes(table));
    if (overlap.length > 0) {
      errors.push(`Tables cannot be included and excluded simultaneously: ${overlap.join(', ')}`);
    }
  }

  if (config.customTypeMappings) {
    for (const [dbType, tsType] of Object.entries(config.customTypeMappings)) {
      if (!dbType.trim()) {
        errors.push('Custom type mapping keys must not be empty.');
        break;
      }
      if (!tsType.trim()) {
        errors.push(`Custom type mapping for "${dbType}" must specify a TypeScript type.`);
        break;
      }
    }
  }

  if (config.excludeFromInsert && config.excludeFromInsert.some(name => !name.trim())) {
    errors.push('excludeFromInsert must not contain empty values.');
  }

  if (config.excludeFromUpdate && config.excludeFromUpdate.some(name => !name.trim())) {
    errors.push('excludeFromUpdate must not contain empty values.');
  }

  if (typeof config.generateRelations === 'boolean' && config.generateRelations && config.generateTypes === false) {
    errors.push('generateRelations requires generateTypes to be enabled.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid KnexBridge configuration:\n- ${errors.join('\n- ')}`);
  }

  return { ...DEFAULT_CONFIG, ...config } as KnexBridgeConfig;
}
