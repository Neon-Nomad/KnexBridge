import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import process from 'process';
import { minimalSchema } from '../fixtures/schemas/minimal-schema';
import type { DatabaseSchema } from '../../../types';

const mockSchema: DatabaseSchema = minimalSchema;

const mockGenerate = jest.fn().mockReturnValue({
  filesGenerated: ['types.ts', 'validation.ts'],
  tablesProcessed: mockSchema.tables.length,
  warnings: [],
  metrics: { totalTime: 10, filesWritten: 2 },
});

const mockIntrospect = jest.fn().mockResolvedValue(mockSchema);

jest.mock('knexbridge-core', () => ({
  introspectDatabase: (...args: any[]) => mockIntrospect(...args),
  generate: (...args: any[]) => mockGenerate(...args),
  MAX_WARNINGS_DISPLAY: 10,
}));

jest.mock('ora', () => {
  const oraMock = jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
  }));
  return oraMock;
});

// eslint-disable-next-line import/first
import { createProgram } from '../../../../cli/src/index';
// eslint-disable-next-line import/first
import { logger } from '../../../../cli/src/utils/logger';

jest.spyOn(logger, 'setVerbose').mockImplementation(() => {});
jest.spyOn(logger, 'header').mockImplementation(() => {});
jest.spyOn(logger, 'metric').mockImplementation(() => {});
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'success').mockImplementation(() => {});
jest.spyOn(logger, 'divider').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});

describe('CLI integration', () => {
  let tempDir: string;
  let knexfilePath: string;
  let exitSpy: jest.SpyInstance;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'knexbridge-cli-'));
    knexfilePath = join(tempDir, 'knexfile.js');
    writeFileSync(
      knexfilePath,
      `module.exports = {\n  development: {\n    client: 'sqlite3',\n    connection: { filename: ':memory:' }\n  }\n};\n`,
    );
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit: ${code}`);
    }) as any);
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
    exitSpy.mockRestore();
  });

  beforeEach(() => {
    mockGenerate.mockClear();
    mockIntrospect.mockClear();
  });

  it('runs generate command successfully', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'knexbridge', 'generate', '--config', knexfilePath, '--out', tempDir]);
    expect(mockIntrospect).toHaveBeenCalledWith(knexfilePath, 'development', expect.any(Object));
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('passes CLI flags to configuration', async () => {
    const program = createProgram();
    await program.parseAsync([
      'node',
      'knexbridge',
      'generate',
      '--config',
      knexfilePath,
      '--env',
      'test',
      '--naming',
      'snake',
      '--table-format',
      'plural',
      '--no-zod',
      '--no-insert-types',
      '--no-update-types',
      '--include',
      'users,posts',
      '--exclude',
      'logs',
      '--schema',
      'custom_schema',
    ]);

    const [, , , , , , , , callConfig] = mockIntrospect.mock.calls[0];
    expect(callConfig.includeTables).toEqual(['users', 'posts']);
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('handles generate command errors', async () => {
    mockIntrospect.mockRejectedValueOnce(new Error('boom'));
    const program = createProgram();
    await expect(
      program.parseAsync(['node', 'knexbridge', 'generate', '--config', knexfilePath]),
    ).rejects.toThrow('process.exit: 1');
  });

  it('runs introspect command and prints schema', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'knexbridge', 'introspect', '--config', knexfilePath]);
    expect(mockIntrospect).toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('handles introspect errors gracefully', async () => {
    mockIntrospect.mockRejectedValueOnce(new Error('introspect error'));
    const program = createProgram();
    await expect(
      program.parseAsync(['node', 'knexbridge', 'introspect', '--config', knexfilePath]),
    ).rejects.toThrow('process.exit: 1');
  });

  it('supports verbose flag', async () => {
    const program = createProgram();
    await program.parseAsync([
      'node',
      'knexbridge',
      'generate',
      '--config',
      knexfilePath,
      '--verbose',
    ]);
    expect(logger.setVerbose).toHaveBeenCalledWith(true);
  });

  it('supports custom config file', async () => {
    const configPath = join(tempDir, 'config.json');
    writeFileSync(configPath, JSON.stringify({ schemaName: 'custom' }));

    const program = createProgram();
    await program.parseAsync([
      'node',
      'knexbridge',
      'generate',
      '--config',
      knexfilePath,
      '--config-file',
      configPath,
    ]);

    expect(mockIntrospect).toHaveBeenCalled();
  });

  it('validates schema names and exits on error', async () => {
    const invalidConfig = join(tempDir, 'invalid-config.json');
    writeFileSync(invalidConfig, JSON.stringify({ schemaName: 'invalid schema' }));

    const program = createProgram();
    await expect(
      program.parseAsync([
        'node',
        'knexbridge',
        'generate',
        '--config',
        knexfilePath,
        '--config-file',
        invalidConfig,
      ]),
    ).rejects.toThrow('process.exit: 1');
  });

  it('supports introspect include/exclude flags', async () => {
    const program = createProgram();
    await program.parseAsync([
      'node',
      'knexbridge',
      'introspect',
      '--config',
      knexfilePath,
      '--include',
      'users',
      '--exclude',
      'logs',
    ]);

    const [, , options] = mockIntrospect.mock.calls[mockIntrospect.mock.calls.length - 1];
    expect(options.includeTables).toEqual(['users']);
    expect(options.excludeTables).toEqual(['logs']);
  });

  it('requires knexfile to exist', async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(['node', 'knexbridge', 'generate', '--config', join(tempDir, 'missing.js')]),
    ).rejects.toThrow('process.exit: 1');
  });
});
