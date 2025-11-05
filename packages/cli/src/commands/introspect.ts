import { introspectDatabase } from '@knexbridge/core';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import ora from 'ora';
import chalk from 'chalk';

export interface IntrospectOptions {
  config: string;
  env: string;
  include?: string;
  exclude?: string;
  schema: string;
  verbose?: boolean;
}

export async function introspectCommand(options: IntrospectOptions): Promise<void> {
  logger.setVerbose(options.verbose || false);

  try {
    const configPath = resolve(options.config);
    if (!existsSync(configPath)) {
      logger.error(`Knexfile not found at ${configPath}`);
      process.exit(1);
    }

    const spinner = ora('Introspecting database...').start();

    const schema = await introspectDatabase(configPath, options.env, {
      includeTables: options.include?.split(',').map(s => s.trim()),
      excludeTables: options.exclude?.split(',').map(s => s.trim()),
      schemaName: options.schema,
    });

    spinner.succeed('Database introspected');

    logger.header('Database Schema');
    logger.metric('Total tables', schema.tables.length);
    logger.divider();

    schema.tables.forEach(table => {
      console.log();
      logger.info(chalk.bold(table.name));
      
      logger.metric('Columns', table.columns.length);
      logger.metric('Foreign Keys', table.foreign_keys.length);

      console.log();
      console.log(chalk.gray('  Columns:'));
      table.columns.forEach(col => {
        const nullable = col.nullable ? chalk.gray('NULL') : chalk.yellow('NOT NULL');
        const pk = col.isPrimaryKey ? chalk.cyan(' PK') : '';
        console.log(`    • ${chalk.white(col.name)}: ${chalk.green(col.type)} ${nullable}${pk}`);
      });

      if (table.foreign_keys.length > 0) {
        console.log();
        console.log(chalk.gray('  Foreign Keys:'));
        table.foreign_keys.forEach(fk => {
          console.log(
            `    • ${chalk.white(fk.columnName)} → ${chalk.cyan(fk.foreignTableName)}.${chalk.cyan(fk.foreignColumnName)}`
          );
        });
      }
    });

    console.log();
  } catch (error) {
    logger.error((error as Error).message);
    if (options.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}