#!/usr/bin/env node

import { Command } from 'commander';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { generateCommand, type GenerateOptions } from './commands/generate.js';
import { introspectCommand, type IntrospectOptions } from './commands/introspect.js';
import { logger } from './utils/logger.js';

export { generateCommand, type GenerateOptions } from './commands/generate.js';
export { introspectCommand, type IntrospectOptions } from './commands/introspect.js';
export { logger } from './utils/logger.js';
export { loadConfigFile, mergeConfig, validateConfig } from './utils/config.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('knexbridge')
    .description('Generate TypeScript types and Zod schemas from Knex.js databases')
    .version('0.22.1');

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

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

const entryPath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] === entryPath;

if (isDirectRun) {
  run().catch(error => {
    logger.error((error as Error).message);
    process.exit(1);
  });
}
