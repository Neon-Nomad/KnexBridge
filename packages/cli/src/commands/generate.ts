import { introspectDatabase, generate } from '@knexbridge/core';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import { loadConfigFile, mergeConfig, validateConfig } from '../utils/config';
import { MAX_WARNINGS_DISPLAY } from '@knexbridge/core';
import ora from 'ora';
import chalk from 'chalk';

export interface GenerateOptions {
  config: string;
  env: string;
  out: string;
  types: boolean;
  zod: boolean;
  insertTypes: boolean;
  updateTypes: boolean;
  dateStrategy?: string;
  bigint: boolean;
  naming?: string;
  tableFormat?: string;
  relations: boolean;
  warnings: boolean;
  include?: string;
  exclude?: string;
  schema: string;
  excludeFromInsert?: string;
  excludeFromUpdate?: string;
  verbose?: boolean;
  configFile?: string;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const startTime = Date.now();

  // Set verbose logging
  logger.setVerbose(options.verbose || false);

  try {
    // Validate knexfile exists
    const configPath = resolve(options.config);
    if (!existsSync(configPath)) {
      logger.error(`Knexfile not found at ${configPath}`);
      logger.info(`Create a knexfile.js with: npx knex init`);
      process.exit(1);
    }

    // Load config file
    const fileConfig = loadConfigFile(options.configFile);

    // Parse CLI options
    const cliConfig = {
      environment: options.env,
      outDir: options.out,
      generateTypes: options.types,
      generateZod: options.zod,
      generateInsertTypes: options.insertTypes,
      generateUpdateTypes: options.updateTypes,
      dateStrategy: options.dateStrategy as any,
      useBigInt: options.bigint,
      namingStrategy: options.naming as any,
      tableNameFormat: options.tableFormat as any,
      generateRelations: options.relations,
      warnOnUnmappedTypes: options.warnings,
      includeTables: options.include?.split(',').map(s => s.trim()),
      excludeTables: options.exclude?.split(',').map(s => s.trim()),
      schemaName: options.schema,
      excludeFromInsert: options.excludeFromInsert?.split(',').map(s => s.trim()),
      excludeFromUpdate: options.excludeFromUpdate?.split(',').map(s => s.trim()),
    };

    // Merge configurations
    const config = mergeConfig(cliConfig, fileConfig);

    // Validate configuration
    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
      logger.error('Configuration errors:');
      configErrors.forEach(err => logger.error(`  • ${err}`));
      process.exit(1);
    }

    // Introspect database
    const spinner = ora('Introspecting database...').start();

    const schema = await introspectDatabase(configPath, options.env, {
      includeTables: config.includeTables,
      excludeTables: config.excludeTables,
      schemaName: config.schemaName,
    });

    spinner.succeed('Database introspected');

    if (schema.tables.length === 0) {
      logger.warn('No tables found in database');
      process.exit(0);
    }

    logger.header('Database Schema');
    logger.metric('Tables found', schema.tables.length);

    schema.tables.forEach(table => {
      const fkCount = table.foreign_keys.length;
      const fkText = fkCount > 0 ? chalk.gray(`, ${fkCount} FK`) : '';
      logger.info(`  • ${chalk.white(table.name)} ${chalk.gray(`(${table.columns.length} columns${fkText})`)}`);
    });

    // Generate files
    logger.header('Generating Files');
    const outDir = resolve(options.out);

    const genSpinner = ora('Generating TypeScript types and Zod schemas...').start();

    const result = generate(schema, outDir, config);

    genSpinner.succeed('Files generated');

    // Display results
    console.log();
    logger.success('Generation complete!');

    result.filesGenerated.forEach(file => {
      const fileName = file.split('/').pop() || file;
      logger.metric(fileName, file);
    });

    logger.divider();

    logger.metric('Tables processed', result.tablesProcessed);
    logger.metric('Files written', result.metrics.filesWritten);
    logger.metric('Total time', `${result.metrics.totalTime}ms`);
    
    if (result.metrics.typeGenerationTime) {
      logger.metric('  Types', `${result.metrics.typeGenerationTime}ms`);
    }
    if (result.metrics.zodGenerationTime) {
      logger.metric('  Validation', `${result.metrics.zodGenerationTime}ms`);
    }

    // Display warnings
    if (result.warnings.length > 0 && options.warnings) {
      console.log();
      logger.header('Type Mapping Warnings');

      const displayWarnings = result.warnings.slice(0, MAX_WARNINGS_DISPLAY);
      displayWarnings.forEach(w => logger.warn(w));

      if (result.warnings.length > MAX_WARNINGS_DISPLAY) {
        logger.info(`... and ${result.warnings.length - MAX_WARNINGS_DISPLAY} more warnings`);
      }

      console.log();
      logger.info('Use custom type mappings to resolve warnings');
      logger.info('See: https://github.com/yourusername/knexbridge#custom-type-mappings');
    }
  } catch (error) {
    logger.error((error as Error).message);

    if (process.env.DEBUG || options.verbose) {
      console.error();
      console.error(chalk.gray('Stack trace:'));
      console.error((error as Error).stack);
    }

    process.exit(1);
  }
}