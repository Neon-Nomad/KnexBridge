#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand, GenerateOptions } from './commands/generate';
import { introspectCommand, IntrospectOptions } from './commands/introspect';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('knexbridge')
  .description('Generate TypeScript types and Zod schemas from Knex.js databases')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate TypeScript types and Zod schemas')
  .option('-c, --config <path>', 'Path to knexfile', './knexfile.js')
  .option('-e, --env <environment>', 'Environment to use', 'development')
  .option('-o, --out <directory>', 'Output directory', './src/db')
  .option('--no-types', 'Skip TypeScript type generation')
  .option('--no-zod', 'Skip Zod schema generation')
  .option('--no-insert-types', 'Skip insert type generation')
  .option('--no-update-types', 'Skip update type generation')
  .option('--date-strategy <strategy>', 'Date type strategy (string|Date|number)')
  .option('--bigint', 'Use bigint for BIGINT columns')
  .option('--naming <strategy>', 'Naming strategy (pascal|camel|snake|preserve)')
  .option('--table-format <format>', 'Table name format (singular|plural|preserve)')
  .option('--no-relations', 'Skip relation type generation')
  .option('--no-warnings', 'Hide type mapping warnings')
  .option('--include <tables>', 'Comma-separated list of tables to include')
  .option('--exclude <tables>', 'Comma-separated list of tables to exclude')
  .option('--schema <name>', 'Database schema name', 'public')
  .option('--exclude-from-insert <fields>', 'Fields to exclude from insert types')
  .option('--exclude-from-update <fields>', 'Fields to exclude from update types')
  .option('-v, --verbose', 'Verbose output')
  .option('--config-file <path>', 'Path to config file')
  .action(async (options: GenerateOptions) => {
    try {
      await generateCommand(options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

program
  .command('introspect')
  .description('Introspect database schema and display information')
  .option('-c, --config <path>', 'Path to knexfile', './knexfile.js')
  .option('-e, --env <environment>', 'Environment to use', 'development')
  .option('--include <tables>', 'Comma-separated list of tables to include')
  .option('--exclude <tables>', 'Comma-separated list of tables to exclude')
  .option('--schema <name>', 'Database schema name', 'public')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options: IntrospectOptions) => {
    try {
      await introspectCommand(options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

program.parse();