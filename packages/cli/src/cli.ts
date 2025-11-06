#!/usr/bin/env node

import process from 'node:process';
import { run } from './index.js';
import { logger } from './utils/logger.js';

run(process.argv).catch(error => {
  logger.error((error as Error).message);
  process.exit(1);
});

