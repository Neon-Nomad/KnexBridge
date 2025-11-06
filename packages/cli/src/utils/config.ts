import { KnexBridgeConfig } from 'knexbridge-core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from './logger.js';

const CONFIG_FILES = ['.knexbridgerc', '.knexbridgerc.json', 'knexbridge.config.json'];

/**
 * Load configuration from file
 */
export function loadConfigFile(configPath?: string): Partial<KnexBridgeConfig> | null {
  if (configPath) {
    const absolutePath = resolve(configPath);
    if (!existsSync(absolutePath)) {
      logger.warn(`Config file not found: ${absolutePath}`);
      return null;
    }

    try {
      const content = readFileSync(absolutePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to parse config file: ${(error as Error).message}`);
      return null;
    }
  }

  for (const filename of CONFIG_FILES) {
    const filePath = resolve(process.cwd(), filename);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        logger.debug(`Loaded config from ${filename}`);
        return JSON.parse(content);
      } catch (error) {
        logger.warn(`Failed to parse ${filename}: ${(error as Error).message}`);
      }
    }
  }

  return null;
}

/**
 * Merge CLI options with file config
 */
export function mergeConfig(
  cliOptions: Partial<KnexBridgeConfig>,
  fileConfig: Partial<KnexBridgeConfig> | null
): Partial<KnexBridgeConfig> {
  if (!fileConfig) return cliOptions;
  return { ...fileConfig, ...cliOptions };
}

/**
 * Validate schema name for different databases
 */
function isValidSchemaName(schemaName: string, client?: string): boolean {
  // Basic validation - alphanumeric, underscore, dollar sign
  // PostgreSQL allows $ and Unicode
  // MySQL/SQLite are more restrictive
  const basicPattern = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
  
  if (!basicPattern.test(schemaName)) {
    return false;
  }
  
  // Check for reserved words (basic list)
  const reserved = ['information_schema', 'pg_catalog', 'sys', 'mysql'];
  if (reserved.includes(schemaName.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<KnexBridgeConfig>): string[] {
  const errors: string[] = [];

  if (config.dateStrategy && !['string', 'Date', 'number'].includes(config.dateStrategy)) {
    errors.push(`Invalid dateStrategy: "${config.dateStrategy}". Must be: string, Date, or number`);
  }

  if (
    config.namingStrategy &&
    !['pascal', 'camel', 'snake', 'preserve'].includes(config.namingStrategy)
  ) {
    errors.push(`Invalid namingStrategy: "${config.namingStrategy}". Must be: pascal, camel, snake, or preserve`);
  }

  if (
    config.tableNameFormat &&
    !['singular', 'plural', 'preserve'].includes(config.tableNameFormat)
  ) {
    errors.push(`Invalid tableNameFormat: "${config.tableNameFormat}". Must be: singular, plural, or preserve`);
  }

  if (config.schemaName && !isValidSchemaName(config.schemaName)) {
    errors.push(
      `Invalid schema name: "${config.schemaName}". ` +
      `Schema names must start with a letter or underscore and contain only alphanumeric characters, underscores, or dollar signs.`
    );
  }

  return errors;
}
